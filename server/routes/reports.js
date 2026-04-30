const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { generateWeeklyPdf } = require('../services/pdfGenerator');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getAiInsights(camper, weekNum, logEntries) {
  if (!process.env.GEMINI_API_KEY || !logEntries.length) return null;

  const logText = logEntries.map(l => {
    const parts = [`Day ${l.camp_day} ${String(l.hour).padStart(2, '0')}:00`];
    if (l.event_type && l.event_type !== 'none') parts.push(`[${l.event_type}]`);
    if (l.blood_glucose)        parts.push(`BG: ${l.blood_glucose} mg/dL`);
    if (l.carbohydrates)        parts.push(`Carbs: ${l.carbohydrates}g`);
    if (l.insulin_administered) parts.push(`Insulin: ${l.insulin_administered}u`);
    if (l.followup_bg)          parts.push(`Follow-up BG: ${l.followup_bg} mg/dL`);
    if (l.notes)                parts.push(`Notes: "${l.notes}"`);
    return parts.join(' | ');
  }).join('\n');

  const prompt = `You are a diabetes care assistant writing a clinical summary for a medical report at Lions Camp Merrick Nanjemoy, a summer camp for children with diabetes.

CAMPER: ${camper.first_name} ${camper.last_name}
Diabetes Type: ${camper.diabetes_type}
Insulin: ${camper.insulin_type || 'Not specified'}
Target BG Range: ${camper.target_bg_min}–${camper.target_bg_max} mg/dL${camper.notes ? `\nClinical Notes: ${camper.notes}` : ''}

WEEK ${weekNum} LOG:
${logText}

Write a 3-4 paragraph clinical trends summary for this camper's medical report. Cover: overall BG control this week, any notable highs or lows and when they occurred, patterns in meal or insulin response, and specific observations for the nursing team. Write in a professional medical tone. Plain text only — no bullet points, no markdown, no asterisks or pound signs.`;

  // 7-second timeout so PDF generation is never blocked
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini timeout')), 7000)
  );

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    return result.response.text().trim();
  } catch (err) {
    console.warn('AI insights skipped:', err.message);
    return null;
  }
}

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
      const { data: cabin, error: cabinErr } = await supabaseAdmin
        .from('cabins')
        .select('id, name')
        .eq('id', cabin_id)
        .single();

      if (cabinErr || !cabin) {
        return res.status(404).json({ error: 'Cabin not found' });
      }

      const { data: camper, error: camperErr } = await supabaseAdmin
        .from('campers')
        .select('id, first_name, last_name, diabetes_type, insulin_type, target_bg_min, target_bg_max, notes')
        .eq('id', camper_id)
        .eq('is_archived', false)
        .single();

      if (camperErr || !camper) {
        return res.status(404).json({ error: 'Camper not found' });
      }

      const { data: logEntries, error: logsErr } = await supabaseAdmin
        .from('log_entries')
        .select('id, camper_id, camp_day, hour, event_type, blood_glucose, insulin_administered, carbohydrates, followup_bg, notes')
        .eq('cabin_id', cabin_id)
        .eq('camp_week', weekNum)
        .eq('camper_id', camper_id)
        .order('camp_day', { ascending: true })
        .order('hour',     { ascending: true });

      if (logsErr) throw logsErr;

      const days = [];
      for (let d = 1; d <= 7; d++) {
        days.push({
          dayNum: d,
          entries: (logEntries ?? []).filter(e => e.camp_day === d),
        });
      }

      // Fetch AI insights in parallel with nothing (non-blocking)
      const aiInsights = await getAiInsights(camper, weekNum, logEntries ?? []);

      const pdfBuffer = await generateWeeklyPdf({
        cabinName: cabin.name,
        weekNum,
        camper,
        days,
        aiInsights,
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
