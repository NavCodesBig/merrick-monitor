const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// POST /api/ai/insights
router.post(
  '/insights',
  verifyToken,
  requireRole('nurse', 'admin', 'director'),
  async (req, res) => {
    const { camper_id, week } = req.body;
    const weekNum = parseInt(week, 10);

    if (!camper_id || !weekNum || weekNum < 1 || weekNum > 3) {
      return res.status(400).json({ error: 'camper_id and week (1–3) are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service is not configured.' });
    }

    const { data: camper, error: camperErr } = await supabaseAdmin
      .from('campers')
      .select('first_name, last_name, diabetes_type, insulin_type, target_bg_min, target_bg_max, notes')
      .eq('id', camper_id)
      .single();

    if (camperErr || !camper) {
      return res.status(404).json({ error: 'Camper not found' });
    }

    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('log_entries')
      .select('camp_day, hour, event_type, blood_glucose, insulin_administered, carbohydrates, followup_bg, notes')
      .eq('camper_id', camper_id)
      .eq('camp_week', weekNum)
      .order('camp_day', { ascending: true })
      .order('hour', { ascending: true });

    if (logsErr) {
      return res.status(500).json({ error: 'Failed to fetch log entries' });
    }

    if (!logs || logs.length === 0) {
      return res.status(400).json({ error: 'No log entries found for this camper and week. Log some data first.' });
    }

    const logText = logs.map(l => {
      const parts = [`Day ${l.camp_day} ${String(l.hour).padStart(2, '0')}:00`];
      if (l.event_type && l.event_type !== 'none') parts.push(`[${l.event_type}]`);
      if (l.blood_glucose)        parts.push(`BG: ${l.blood_glucose} mg/dL`);
      if (l.carbohydrates)        parts.push(`Carbs: ${l.carbohydrates}g`);
      if (l.insulin_administered) parts.push(`Insulin: ${l.insulin_administered}u`);
      if (l.followup_bg)          parts.push(`Follow-up BG: ${l.followup_bg} mg/dL`);
      if (l.notes)                parts.push(`Notes: "${l.notes}"`);
      return parts.join(' | ');
    }).join('\n');

    const prompt = `You are a diabetes care assistant helping nurses at Lions Camp Merrick Nanjemoy, a summer camp for children with diabetes. Analyze the blood glucose log below and provide clear, practical suggestions for the nursing team.

CAMPER PROFILE:
- Name: ${camper.first_name} ${camper.last_name}
- Diabetes Type: ${camper.diabetes_type}
- Insulin Type: ${camper.insulin_type || 'Not specified'}
- Target BG Range: ${camper.target_bg_min}–${camper.target_bg_max} mg/dL${camper.notes ? `\n- Notes: ${camper.notes}` : ''}

WEEK ${weekNum} LOG ENTRIES:
${logText}

Provide a concise analysis with these sections:
1. BG Trends — patterns of highs or lows by time of day or meal
2. Concerns — any events that need immediate or ongoing attention
3. Suggestions — specific, actionable recommendations for the nursing team
4. Insulin Response — any patterns in how this camper responds to insulin or carbs

Keep the language plain and practical for camp nurses. Do not diagnose. Flag any hypoglycemia events clearly.`;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const insights = result.response.text();
      res.json({ insights });
    } catch (err) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'AI analysis failed. Please try again.' });
    }
  }
);

module.exports = router;
