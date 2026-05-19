import { Router } from 'express';
import pool from '../db.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Ensure complexity_score column exists on cases table
(async () => {
  try {
    await pool.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS complexity_score NUMERIC(4,1)`);
  } catch (e) {
    // column may already exist or ALTER TABLE not supported — safe to ignore
  }
})();

async function callOpenRouter(messages, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Dental Lab Case Manager'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-5-sonnet-20241022',
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

// AI: Case Complexity Scoring & Turnaround Estimation
router.post('/complexity-score', aiRateLimiter, async (req, res) => {
  try {
    const { caseId } = req.body;
    let caseData;
    if (caseId) {
      const result = await pool.query(`
        SELECT c.*, d.name as dentist_name, d.practice_name
        FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
        WHERE c.id = $1
      `, [caseId]);
      caseData = result.rows[0];
    } else {
      caseData = req.body;
    }

    const systemPrompt = `You are a dental lab case complexity analyzer. Analyze the dental case and provide:
1. A complexity score from 1-10 (1=simple, 10=extremely complex)
2. Estimated turnaround time in business days
3. Key complexity factors
4. Risk factors that could delay the case
5. Recommendations for the lab team

Format your response as structured sections with clear headers. Be specific and professional.`;

    const result = await callOpenRouter([
      { role: 'user', content: `Analyze this dental lab case:\n${JSON.stringify(caseData, null, 2)}` }
    ], systemPrompt);

    // Parse complexity score from AI response and write back to cases table
    let parsedScore = null;
    const scoreMatch = result.match(/\b([1-9]|10)\s*(?:\/\s*10|out of 10)|\bscore[:\s]+([1-9]|10)\b/i)
      || result.match(/complexity[^\d]*([1-9]|10)\b/i)
      || result.match(/\b([1-9]|10)\s*[-–]\s*(?:simple|low|moderate|high|extremely)/i);
    if (scoreMatch) {
      parsedScore = parseFloat(scoreMatch[1] || scoreMatch[2]);
    } else {
      // fallback: find first standalone 1-10 number near "complexity"
      const fallback = result.match(/(?:complexity|score)[^.\n]{0,30}?(\b[1-9]|10\b)/i);
      if (fallback) parsedScore = parseFloat(fallback[1]);
    }

    if (parsedScore !== null && caseId) {
      await pool.query('UPDATE cases SET complexity_score = $1 WHERE id = $2', [parsedScore, caseId]);
    }

    // Save to ai_results
    await pool.query(
      'INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
      [caseId || null, 'complexity_score', JSON.stringify(caseData), result, 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ result, caseData, parsedComplexityScore: parsedScore });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI: Material Recommendation
router.post('/material-recommendation', aiRateLimiter, async (req, res) => {
  try {
    const { caseId } = req.body;
    let caseData;
    if (caseId) {
      const result = await pool.query(`
        SELECT c.*, d.name as dentist_name
        FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
        WHERE c.id = $1
      `, [caseId]);
      caseData = result.rows[0];
    } else {
      caseData = req.body;
    }

    const materialsResult = await pool.query('SELECT * FROM materials WHERE status != $1', ['out_of_stock']);
    const availableMaterials = materialsResult.rows;

    const systemPrompt = `You are a dental materials expert. Based on the case specifications and available materials, recommend:
1. Primary material recommendation with justification
2. Alternative material options
3. Material properties relevant to this case (strength, esthetics, biocompatibility)
4. Processing considerations for the recommended material
5. Any special handling or storage requirements

Consider factors like: tooth location, restoration type, occlusal forces, esthetic requirements, and patient factors. Format with clear headers and bullet points.`;

    const result = await callOpenRouter([
      { role: 'user', content: `Case:\n${JSON.stringify(caseData, null, 2)}\n\nAvailable Materials:\n${JSON.stringify(availableMaterials, null, 2)}` }
    ], systemPrompt);

    await pool.query(
      'INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
      [caseId || null, 'material_recommendation', JSON.stringify(caseData), result, 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ result, caseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI: Quality Issue Root Cause Analysis
router.post('/root-cause-analysis', aiRateLimiter, async (req, res) => {
  try {
    const { remakeId } = req.body;
    let remakeData;
    if (remakeId) {
      const result = await pool.query(`
        SELECT r.*, c.case_number, c.restoration_type, c.material_requested, c.tooth_numbers
        FROM remakes r LEFT JOIN cases c ON r.case_id = c.id
        WHERE r.id = $1
      `, [remakeId]);
      remakeData = result.rows[0];
    } else {
      remakeData = req.body;
    }

    const recentRemakes = await pool.query('SELECT reason, fault_category, root_cause FROM remakes ORDER BY created_at DESC LIMIT 20');

    const systemPrompt = `You are a dental lab quality assurance expert. Perform a root cause analysis for this quality issue:
1. Primary root cause identification
2. Contributing factors analysis
3. Pattern recognition (are there similar recurring issues?)
4. Corrective action recommendations (immediate)
5. Preventive action recommendations (long-term)
6. Process improvement suggestions
7. Training recommendations if applicable

Use the 5 Whys methodology and fishbone diagram thinking. Be thorough and actionable.`;

    const result = await callOpenRouter([
      { role: 'user', content: `Quality Issue:\n${JSON.stringify(remakeData, null, 2)}\n\nRecent Remake History:\n${JSON.stringify(recentRemakes.rows, null, 2)}` }
    ], systemPrompt);

    await pool.query(
      'INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
      [remakeData?.case_id || null, 'root_cause_analysis', JSON.stringify(remakeData), result, 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ result, remakeData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI: Lab-to-Dentist Communication Drafting
router.post('/draft-communication', aiRateLimiter, async (req, res) => {
  try {
    const { caseId, communicationType, context } = req.body;
    let caseData = null;
    let dentistData = null;

    if (caseId) {
      const result = await pool.query(`
        SELECT c.*, d.name as dentist_name, d.practice_name, d.email as dentist_email
        FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
        WHERE c.id = $1
      `, [caseId]);
      caseData = result.rows[0];
      dentistData = { name: caseData?.dentist_name, practice: caseData?.practice_name };
    }

    const systemPrompt = `You are a professional dental lab communication specialist. Draft a clear, professional communication from the dental lab to the dentist.

Communication types: status_update, case_question, issue_notification, completion_notification, remake_notification, design_approval_request, shade_clarification, general

Guidelines:
- Be professional but warm
- Include relevant case details
- Be specific about what's needed from the dentist (if anything)
- Include any deadlines or time-sensitive information
- Use proper dental terminology
- Keep it concise but complete

Format the communication as a ready-to-send email with subject line and body.`;

    const result = await callOpenRouter([
      { role: 'user', content: `Draft a ${communicationType || 'general'} communication.\nCase: ${JSON.stringify(caseData, null, 2)}\nDentist: ${JSON.stringify(dentistData, null, 2)}\nAdditional Context: ${context || 'None provided'}` }
    ], systemPrompt);

    await pool.query(
      'INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
      [caseId || null, 'draft_communication', JSON.stringify({ communicationType, context, caseData }), result, 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ result, caseData, communicationType });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI: Production Bottleneck Prediction
router.post('/bottleneck-prediction', aiRateLimiter, async (req, res) => {
  try {
    const schedules = await pool.query(`
      SELECT ps.*, c.case_number, c.due_date, c.priority, t.name as technician_name, t.current_workload, t.max_workload
      FROM production_schedules ps
      LEFT JOIN cases c ON ps.case_id = c.id
      LEFT JOIN technicians t ON ps.technician_id = t.id
      WHERE ps.status != 'completed'
      ORDER BY c.due_date ASC
    `);

    const millingSchedules = await pool.query("SELECT * FROM milling_schedules WHERE status != 'completed' ORDER BY scheduled_start");
    const ovenSchedules = await pool.query("SELECT * FROM oven_schedules WHERE status != 'completed' ORDER BY scheduled_start");
    const technicians = await pool.query('SELECT * FROM technicians');

    const systemPrompt = `You are a dental lab production planning expert. Analyze the current production pipeline and predict potential bottlenecks:

1. Current bottleneck identification (what's backing up now?)
2. Predicted bottlenecks in the next 1-3 days
3. Resource utilization analysis (technicians, machines, ovens)
4. Rush case impact assessment
5. Recommendations for schedule optimization
6. Risk assessment for upcoming due dates
7. Suggested priority adjustments

Consider: technician workloads, machine availability, oven cycle times, dependencies between stages, and due dates. Be specific with case numbers and technician names.`;

    const result = await callOpenRouter([
      { role: 'user', content: `Production Schedules:\n${JSON.stringify(schedules.rows, null, 2)}\n\nMilling Queue:\n${JSON.stringify(millingSchedules.rows, null, 2)}\n\nOven Queue:\n${JSON.stringify(ovenSchedules.rows, null, 2)}\n\nTechnicians:\n${JSON.stringify(technicians.rows, null, 2)}` }
    ], systemPrompt);

    await pool.query(
      'INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
      [null, 'bottleneck_prediction', 'production_pipeline_analysis', result, 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI history
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_results ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
