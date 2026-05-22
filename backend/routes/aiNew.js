import { Router } from 'express';
import pool from '../db.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { parseAIJson } from '../utils/parseAIJson.js';

const router = Router();

async function callOpenRouter(messages, systemPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('LLM unavailable: OPENROUTER_API_KEY not configured');
    e.code = 'LLM_UNAVAILABLE';
    throw e;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Dental Lab Case Manager'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

// POST /api/ai/quality-analytics
// Accepts: { date_range: { start, end } }
// Fetches all remakes grouped by technician/material/restoration_type, returns remake rate analysis
router.post('/quality-analytics', aiRateLimiter, async (req, res) => {
  try {
    const { date_range } = req.body;
    const startDate = date_range?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = date_range?.end || new Date().toISOString();

    const [remakesByTech, remakesByMaterial, remakesByType, totalCases] = await Promise.all([
      pool.query(`
        SELECT t.name as technician_name, COUNT(r.id) as remake_count,
               ARRAY_AGG(DISTINCT r.reason) as reasons
        FROM remakes r
        LEFT JOIN production_schedules ps ON r.case_id = ps.case_id
        LEFT JOIN technicians t ON ps.technician_id = t.id
        WHERE r.created_at BETWEEN $1 AND $2
        GROUP BY t.name
        ORDER BY remake_count DESC
      `, [startDate, endDate]),

      pool.query(`
        SELECT c.material_requested, COUNT(r.id) as remake_count,
               ARRAY_AGG(DISTINCT r.fault_category) as fault_categories
        FROM remakes r
        LEFT JOIN cases c ON r.case_id = c.id
        WHERE r.created_at BETWEEN $1 AND $2
        GROUP BY c.material_requested
        ORDER BY remake_count DESC
      `, [startDate, endDate]),

      pool.query(`
        SELECT c.restoration_type, COUNT(r.id) as remake_count,
               ARRAY_AGG(DISTINCT r.reason) as reasons
        FROM remakes r
        LEFT JOIN cases c ON r.case_id = c.id
        WHERE r.created_at BETWEEN $1 AND $2
        GROUP BY c.restoration_type
        ORDER BY remake_count DESC
      `, [startDate, endDate]),

      pool.query(
        `SELECT COUNT(*) as total FROM cases WHERE created_at BETWEEN $1 AND $2`,
        [startDate, endDate]
      )
    ]);

    const systemPrompt = `You are a dental lab quality analytics expert. Analyze remake data to identify patterns, root causes, and actionable training recommendations.

Provide a structured JSON response with:
{
  "overall_remake_rate": "percentage string",
  "key_findings": ["array of top 3-5 findings"],
  "technician_analysis": [{"name": "...", "risk_level": "low|medium|high", "recommendation": "..."}],
  "material_analysis": [{"material": "...", "issue": "...", "recommendation": "..."}],
  "restoration_type_analysis": [{"type": "...", "issue": "...", "recommendation": "..."}],
  "training_recommendations": ["array of specific training actions"],
  "trend_summary": "paragraph describing overall trends"
}`;

    const totalRemakes = remakesByTech.rows.reduce((sum, r) => sum + parseInt(r.remake_count), 0);
    const totalCasesCount = parseInt(totalCases.rows[0].total);

    const aiResult = await callOpenRouter([{
      role: 'user',
      content: `Analyze remake data for period ${startDate} to ${endDate}:

Total Cases: ${totalCasesCount}
Total Remakes: ${totalRemakes}
Remake Rate: ${totalCasesCount > 0 ? ((totalRemakes / totalCasesCount) * 100).toFixed(1) : 0}%

Remakes by Technician: ${JSON.stringify(remakesByTech.rows, null, 2)}
Remakes by Material: ${JSON.stringify(remakesByMaterial.rows, null, 2)}
Remakes by Restoration Type: ${JSON.stringify(remakesByType.rows, null, 2)}`
    }], systemPrompt);

    const parseResult = parseAIJson(aiResult);
    const parsed = parseResult.success ? parseResult.data : { raw_analysis: aiResult };

    res.json({
      date_range: { start: startDate, end: endDate },
      stats: {
        total_cases: totalCasesCount,
        total_remakes: totalRemakes,
        remake_rate: totalCasesCount > 0 ? `${((totalRemakes / totalCasesCount) * 100).toFixed(1)}%` : '0%'
      },
      analysis: parsed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/case-kanban
// Accepts: { status_filter: string[] }
// Returns Kanban board data with AI-estimated completion times
router.post('/case-kanban', aiRateLimiter, async (req, res) => {
  try {
    const { status_filter } = req.body;
    const allowedStatuses = ['received', 'in_progress', 'design', 'milling', 'firing', 'finishing', 'quality_check', 'completed', 'shipped'];
    const statuses = (Array.isArray(status_filter) && status_filter.length > 0)
      ? status_filter.filter(s => allowedStatuses.includes(s))
      : allowedStatuses.filter(s => !['completed', 'shipped'].includes(s));

    const [cases, millingSchedules, ovenSchedules, productionSchedules] = await Promise.all([
      pool.query(`
        SELECT c.*, d.name as dentist_name, d.practice_name,
               t.name as assigned_technician
        FROM cases c
        LEFT JOIN dentists d ON c.dentist_id = d.id
        LEFT JOIN production_schedules ps ON c.id = ps.case_id AND ps.status != 'completed'
        LEFT JOIN technicians t ON ps.technician_id = t.id
        WHERE c.status = ANY($1::text[])
        ORDER BY c.due_date ASC
      `, [statuses]),

      pool.query(`SELECT * FROM milling_schedules WHERE status != 'completed' ORDER BY scheduled_start`),
      pool.query(`SELECT * FROM oven_schedules WHERE status != 'completed' ORDER BY scheduled_start`),
      pool.query(`SELECT * FROM production_schedules WHERE status != 'completed' ORDER BY scheduled_start`)
    ]);

    const systemPrompt = `You are a dental lab production scheduling expert. Analyze the Kanban board data and provide estimated completion times and stage recommendations.

Return structured JSON:
{
  "kanban_columns": {
    "<status>": {
      "cases": [{"case_id": N, "case_number": "...", "patient_name": "...", "due_date": "...", "estimated_completion": "...", "risk_level": "low|medium|high", "notes": "..."}]
    }
  },
  "bottlenecks": ["current bottleneck stages"],
  "summary": "brief production health summary"
}`;

    const aiResult = await callOpenRouter([{
      role: 'user',
      content: `Analyze Kanban board for statuses: ${statuses.join(', ')}

Cases: ${JSON.stringify(cases.rows.slice(0, 30), null, 2)}
Milling Queue: ${JSON.stringify(millingSchedules.rows.slice(0, 20), null, 2)}
Oven Queue: ${JSON.stringify(ovenSchedules.rows.slice(0, 20), null, 2)}
Production Schedules: ${JSON.stringify(productionSchedules.rows.slice(0, 20), null, 2)}`
    }], systemPrompt);

    const parseResult = parseAIJson(aiResult);
    const parsed = parseResult.success ? parseResult.data : { raw_analysis: aiResult };

    // Build basic kanban from raw data as fallback structure
    const kanbanRaw = {};
    for (const status of statuses) {
      kanbanRaw[status] = cases.rows.filter(c => c.status === status);
    }

    res.json({
      statuses_shown: statuses,
      raw_kanban: kanbanRaw,
      ai_analysis: parsed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/material-order-advisor
// Accepts: {}
// Fetches all materials with current stock vs minimum, returns priority reorder list
router.post('/material-order-advisor', aiRateLimiter, async (req, res) => {
  try {
    const materials = await pool.query(`
      SELECT id, name, category, current_stock, minimum_stock, unit,
             cost_per_unit, supplier, status,
             (minimum_stock - current_stock) as shortage_amount,
             CASE
               WHEN current_stock = 0 THEN 'critical'
               WHEN current_stock < minimum_stock * 0.5 THEN 'urgent'
               WHEN current_stock < minimum_stock THEN 'needed'
               ELSE 'ok'
             END as stock_status
      FROM materials
      ORDER BY
        CASE
          WHEN current_stock = 0 THEN 0
          WHEN current_stock < minimum_stock * 0.5 THEN 1
          WHEN current_stock < minimum_stock THEN 2
          ELSE 3
        END ASC,
        name ASC
    `);

    const needsReorder = materials.rows.filter(m => m.stock_status !== 'ok');

    const systemPrompt = `You are a dental lab inventory management expert. Analyze material stock levels and provide a prioritized reorder plan.

Return structured JSON:
{
  "priority_orders": [
    {
      "material_name": "...",
      "priority": "critical|urgent|needed",
      "current_stock": N,
      "recommended_order_qty": N,
      "estimated_cost": N,
      "reason": "...",
      "supplier": "..."
    }
  ],
  "total_estimated_cost": N,
  "summary": "brief inventory health summary",
  "recommendations": ["actionable tips for inventory management"]
}`;

    const aiResult = await callOpenRouter([{
      role: 'user',
      content: `Analyze material inventory and provide reorder recommendations:

All Materials: ${JSON.stringify(materials.rows, null, 2)}

Materials Needing Reorder (${needsReorder.length} items): ${JSON.stringify(needsReorder, null, 2)}`
    }], systemPrompt);

    const parseResult = parseAIJson(aiResult);
    const parsed = parseResult.success ? parseResult.data : { raw_analysis: aiResult };

    res.json({
      inventory_summary: {
        total_materials: materials.rows.length,
        critical: materials.rows.filter(m => m.stock_status === 'critical').length,
        urgent: materials.rows.filter(m => m.stock_status === 'urgent').length,
        needed: materials.rows.filter(m => m.stock_status === 'needed').length,
        ok: materials.rows.filter(m => m.stock_status === 'ok').length
      },
      materials_needing_reorder: needsReorder,
      ai_order_plan: parsed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/predict-turnaround-time
// Accepts: { caseId? } OR { restoration_type, material_requested, complexity_score, due_date, notes }
// Returns AI-estimated business-day turnaround with risk factors. Stateless: no schema changes required.
router.post('/predict-turnaround-time', aiRateLimiter, async (req, res) => {
  try {
    const { caseId } = req.body;
    let caseData = null;
    if (caseId) {
      try {
        const r = await pool.query(`
          SELECT c.*, d.name as dentist_name, d.practice_name
          FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
          WHERE c.id = $1
        `, [caseId]);
        caseData = r.rows[0] || null;
      } catch (_) { /* schema may differ — fall through */ }
    }
    if (!caseData) caseData = req.body || {};

    const systemPrompt = `You are a dental lab production turnaround estimator. Predict business-day turnaround for a single case based on its parameters. Always respond ONLY with valid JSON.`;

    const userPrompt = `Predict the turnaround time for this dental lab case and return ONLY this JSON structure:
{
  "estimated_business_days": <integer>,
  "confidence": "low|medium|high",
  "risk_factors": ["..."],
  "drivers": ["short list of 2-5 factors that influenced the estimate"],
  "buffer_recommendation_days": <integer>,
  "summary": "1-2 sentence rationale"
}

Case: ${JSON.stringify(caseData, null, 2)}`;

    const aiResult = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    const parseResult = parseAIJson(aiResult);
    const parsed = parseResult.success ? parseResult.data : { raw_analysis: aiResult };

    res.json({
      caseId: caseId || null,
      input_summary: {
        restoration_type: caseData.restoration_type,
        material_requested: caseData.material_requested,
        complexity_score: caseData.complexity_score,
        due_date: caseData.due_date,
      },
      prediction: parsed,
    });
  } catch (error) {
    if (error.code === 'LLM_UNAVAILABLE') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/technician-skill-match
// Accepts: { caseId? } OR { case: {...} }
// Pulls technicians from DB and asks AI to rank them for the case.
router.post('/technician-skill-match', aiRateLimiter, async (req, res) => {
  try {
    const { caseId } = req.body;
    let caseData = null;
    if (caseId) {
      try {
        const r = await pool.query(`
          SELECT c.*, d.name as dentist_name, d.practice_name
          FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
          WHERE c.id = $1
        `, [caseId]);
        caseData = r.rows[0] || null;
      } catch (_) { /* ignore */ }
    }
    if (!caseData) caseData = req.body.case || req.body || {};

    let technicians = [];
    try {
      const r = await pool.query(`
        SELECT id, name, specialization, skill_level, current_workload, max_workload, status, certifications
        FROM technicians
        ORDER BY (current_workload::float / NULLIF(max_workload, 0)) ASC NULLS LAST
        LIMIT 50
      `);
      technicians = r.rows;
    } catch (_) { /* table missing — leave empty */ }

    const systemPrompt = `You are a dental lab staffing expert. Rank technicians for a case based on specialization, certifications, skill level, and current workload. Always respond ONLY with valid JSON.`;

    const userPrompt = `Rank candidate technicians for this dental lab case. Return ONLY this JSON:
{
  "ranked_candidates": [
    {"technician_id": <id>, "name": "...", "match_score": <0-100>, "reasons": ["..."], "concerns": ["..."]}
  ],
  "top_recommendation": {"technician_id": <id>, "name": "...", "rationale": "..."},
  "summary": "..."
}

Case: ${JSON.stringify(caseData, null, 2)}

Technicians: ${JSON.stringify(technicians, null, 2)}`;

    const aiResult = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    const parseResult = parseAIJson(aiResult);
    const parsed = parseResult.success ? parseResult.data : { raw_analysis: aiResult };

    res.json({
      caseId: caseId || null,
      candidate_count: technicians.length,
      match: parsed,
    });
  } catch (error) {
    if (error.code === 'LLM_UNAVAILABLE') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
