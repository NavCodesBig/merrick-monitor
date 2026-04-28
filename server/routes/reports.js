const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { generateWeeklyPdf } = require('../services/pdfGenerator');

// GET /api/reports/weekly?cabin_id=...&week=...&camper_id=...
router.get(
  '/weekly',
  verifyToken,
  requireRole('nurse', 'admin', 'director'),
  async (req, res) => {
    const { cabin_id, week, camper_id } = req.query;
    const weekNum = parseInt(week, 10);

    if (!cabin_id || !weekNum || weekNum < 1 || weekNum > 3) {
      return res.status(400).json({ error: 'cabin_id and week (1–3) are required' });
    }
    if (!camper_id) {
      return res.status(400).json({ error: 'camper_id is required' });
    }

    try {
      // Fetch cabin info
      const { data: cabin, error: cabinErr } = await supabaseAdmin
        .from('cabins')
        .select('id, name')
        .eq('id', cabin_id)
        .single();

      if (cabinErr || !cabin) {
        return res.status(404).json({ error: 'Cabin not found' });
      }

      // Fetch the specific camper
      const { data: camper, error: camperErr } = await supabaseAdmin
        .from('campers')
        .select('id, first_name, last_name, diabetes_type, insulin_type, target_bg_min, target_bg_max, notes')
        .eq('id', camper_id)
        .eq('is_archived', false)
        .single();

      if (camperErr || !camper) {
        return res.status(404).json({ error: 'Camper not found' });
      }

      // Fetch all log entries for this camper + week
      const { data: logEntries, error: logsErr } = await supabaseAdmin
        .from('log_entries')
        .select('id, camper_id, camp_day, hour, event_type, blood_glucose, insulin_administered, carbohydrates, followup_bg, notes')
        .eq('cabin_id', cabin_id)
        .eq('camp_week', weekNum)
        .eq('camper_id', camper_id)
        .order('camp_day', { ascending: true })
        .order('hour',     { ascending: true });

      if (logsErr) throw logsErr;

      // Group by day
      const days = [];
      for (let d = 1; d <= 7; d++) {
        days.push({
          dayNum: d,
          entries: (logEntries ?? []).filter(e => e.camp_day === d),
        });
      }

      const pdfBuffer = await generateWeeklyPdf({
        cabinName: cabin.name,
        weekNum,
        camper,
        days,
      });

      const safeName = `${camper.first_name}-${camper.last_name}`.toLowerCase().replace(/\s+/g, '-');

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="merrick-${safeName}-week${weekNum}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (err) {
      console.error('Report generation error:', err);
      res.status(500).json({ error: err.message ?? 'Failed to generate report' });
    }
  }
);

module.exports = router;
