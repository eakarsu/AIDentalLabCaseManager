// Custom Views routes for Lab insights (4 endpoints)
// Mounted at /api/custom-views, before 404 handler.
// Auth required on all endpoints.

import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// In-memory store for workflow rules (CRUD non-viz feature).
// Seeded with realistic dental lab workflow steps.
const workflowRules = {
  nextId: 7,
  items: [
    { id: 1, step_order: 1, stage: 'received', name: 'Case Intake', description: 'Verify Rx, scans, and shade info', required_role: 'coordinator', sla_hours: 4, active: true },
    { id: 2, step_order: 2, stage: 'design', name: 'CAD Design', description: 'Design restoration in 3Shape/exocad', required_role: 'designer', sla_hours: 8, active: true },
    { id: 3, step_order: 3, stage: 'production', name: 'Milling', description: 'Mill restoration per design file', required_role: 'cnc_operator', sla_hours: 6, active: true },
    { id: 4, step_order: 4, stage: 'production', name: 'Sintering / Firing', description: 'Oven cycle for material set', required_role: 'ceramist', sla_hours: 10, active: true },
    { id: 5, step_order: 5, stage: 'finishing', name: 'Finishing & Staining', description: 'Custom characterization', required_role: 'ceramist', sla_hours: 6, active: true },
    { id: 6, step_order: 6, stage: 'quality', name: 'Quality Inspection', description: 'Marginal fit, occlusion, shade match', required_role: 'qa_lead', sla_hours: 2, active: true },
  ],
};

// ---------------------------------------------
// VIZ 1: GET /api/custom-views/turnaround-by-type
// Avg turnaround (estimated days) per restoration_type.
// ---------------------------------------------
router.get('/turnaround-by-type', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(restoration_type, 'unspecified') AS case_type,
        ROUND(AVG(COALESCE(estimated_turnaround, 0))::numeric, 1) AS avg_turnaround_days,
        COUNT(*)::int AS case_count
      FROM cases
      GROUP BY restoration_type
      ORDER BY avg_turnaround_days DESC
      LIMIT 20
    `);
    const data = result.rows.map(r => ({
      case_type: r.case_type,
      avg_turnaround_days: Number(r.avg_turnaround_days) || 0,
      case_count: r.case_count,
    }));
    res.json({ ok: true, generated_at: new Date().toISOString(), data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------
// VIZ 2: GET /api/custom-views/technician-workload-heatmap
// Heatmap of scheduled production hours per technician per day-of-week.
// ---------------------------------------------
router.get('/technician-workload-heatmap', async (req, res) => {
  try {
    const techRes = await pool.query(`SELECT id, name FROM technicians ORDER BY name ASC LIMIT 30`);
    const schedRes = await pool.query(`
      SELECT
        ps.technician_id,
        EXTRACT(DOW FROM ps.scheduled_start)::int AS dow,
        COUNT(*)::int AS task_count,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ps.scheduled_end - ps.scheduled_start))/3600), 0) AS hours
      FROM production_schedules ps
      WHERE ps.scheduled_start IS NOT NULL
      GROUP BY ps.technician_id, dow
    `);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cellMap = {};
    for (const row of schedRes.rows) {
      const key = `${row.technician_id}|${row.dow}`;
      cellMap[key] = { hours: Number(row.hours) || 0, tasks: row.task_count };
    }
    const matrix = techRes.rows.map(t => ({
      technician_id: t.id,
      technician: t.name,
      cells: days.map((d, idx) => {
        const c = cellMap[`${t.id}|${idx}`] || { hours: 0, tasks: 0 };
        return { day: d, day_index: idx, hours: Math.round(c.hours * 10) / 10, tasks: c.tasks };
      }),
    }));
    res.json({ ok: true, days, matrix, technician_count: techRes.rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------
// NON-VIZ 1: GET /api/custom-views/case-spec-pdf?case_id=
// Returns a structured "PDF-ready" case specification document (JSON sections
// plus a plain-text rendering the frontend can copy / print).
// ---------------------------------------------
router.get('/case-spec-pdf', async (req, res) => {
  try {
    const caseId = req.query.case_id ? parseInt(req.query.case_id, 10) : null;
    let caseRow;
    if (caseId) {
      const r = await pool.query(
        `SELECT c.*, d.name AS dentist_name, d.practice_name, d.phone AS dentist_phone, d.email AS dentist_email
         FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
         WHERE c.id = $1`, [caseId]
      );
      caseRow = r.rows[0];
    } else {
      const r = await pool.query(
        `SELECT c.*, d.name AS dentist_name, d.practice_name, d.phone AS dentist_phone, d.email AS dentist_email
         FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id
         ORDER BY c.created_at DESC LIMIT 1`
      );
      caseRow = r.rows[0];
    }
    if (!caseRow) return res.json({ ok: true, document: null, message: 'No case found' });

    const shadeRes = await pool.query(
      `SELECT shade_system, base_shade, body_shade, incisal_shade, cervical_shade, notes
       FROM shade_records WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [caseRow.id]
    );
    const imprRes = await pool.query(
      `SELECT file_name, file_type, scanner_type, quality_rating
       FROM digital_impressions WHERE case_id = $1`,
      [caseRow.id]
    );

    const document = {
      title: `Dental Lab Case Specification - ${caseRow.case_number}`,
      generated_at: new Date().toISOString(),
      sections: [
        {
          heading: 'Case Header',
          fields: {
            case_number: caseRow.case_number,
            patient: caseRow.patient_name,
            status: caseRow.status,
            priority: caseRow.priority,
            due_date: caseRow.due_date,
          },
        },
        {
          heading: 'Dentist / Practice',
          fields: {
            dentist: caseRow.dentist_name,
            practice: caseRow.practice_name,
            phone: caseRow.dentist_phone,
            email: caseRow.dentist_email,
          },
        },
        {
          heading: 'Restoration',
          fields: {
            restoration_type: caseRow.restoration_type,
            material: caseRow.material_requested,
            tooth_numbers: caseRow.tooth_numbers,
            shade: caseRow.shade,
            complexity_score: caseRow.complexity_score,
            estimated_turnaround_days: caseRow.estimated_turnaround,
          },
        },
        {
          heading: 'Shade Detail',
          fields: shadeRes.rows[0] || { note: 'No shade record on file' },
        },
        {
          heading: 'Digital Impressions',
          items: imprRes.rows,
        },
        {
          heading: 'Rx / Notes',
          fields: { rx_details: caseRow.rx_details, notes: caseRow.notes },
        },
      ],
    };

    // Plain-text rendering (printable / copy-to-clipboard).
    const lines = [];
    lines.push(document.title);
    lines.push('='.repeat(document.title.length));
    lines.push(`Generated: ${document.generated_at}`);
    lines.push('');
    for (const sec of document.sections) {
      lines.push(`-- ${sec.heading} --`);
      if (sec.fields) {
        for (const [k, v] of Object.entries(sec.fields)) {
          lines.push(`  ${k}: ${v == null ? '' : v}`);
        }
      }
      if (sec.items) {
        sec.items.forEach((it, i) => {
          lines.push(`  [${i + 1}] ${JSON.stringify(it)}`);
        });
      }
      lines.push('');
    }
    document.text = lines.join('\n');

    res.json({ ok: true, document });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------
// NON-VIZ 2: Workflow Rules editor (CRUD on workflow steps)
// GET    /api/custom-views/workflow-rules
// POST   /api/custom-views/workflow-rules
// PUT    /api/custom-views/workflow-rules/:id
// DELETE /api/custom-views/workflow-rules/:id
// ---------------------------------------------
router.get('/workflow-rules', (req, res) => {
  const sorted = [...workflowRules.items].sort((a, b) => a.step_order - b.step_order);
  res.json({ ok: true, count: sorted.length, items: sorted });
});

router.post('/workflow-rules', (req, res) => {
  const b = req.body || {};
  if (!b.name || typeof b.name !== 'string') {
    return res.status(400).json({ ok: false, error: 'name (string) is required' });
  }
  const item = {
    id: workflowRules.nextId++,
    step_order: Number.isFinite(+b.step_order) ? +b.step_order : workflowRules.items.length + 1,
    stage: b.stage || 'custom',
    name: b.name,
    description: b.description || '',
    required_role: b.required_role || 'technician',
    sla_hours: Number.isFinite(+b.sla_hours) ? +b.sla_hours : 4,
    active: b.active !== false,
  };
  workflowRules.items.push(item);
  res.status(201).json({ ok: true, item });
});

router.put('/workflow-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = workflowRules.items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Rule not found' });
  const b = req.body || {};
  const cur = workflowRules.items[idx];
  workflowRules.items[idx] = {
    ...cur,
    step_order: Number.isFinite(+b.step_order) ? +b.step_order : cur.step_order,
    stage: b.stage ?? cur.stage,
    name: b.name ?? cur.name,
    description: b.description ?? cur.description,
    required_role: b.required_role ?? cur.required_role,
    sla_hours: Number.isFinite(+b.sla_hours) ? +b.sla_hours : cur.sla_hours,
    active: typeof b.active === 'boolean' ? b.active : cur.active,
  };
  res.json({ ok: true, item: workflowRules.items[idx] });
});

router.delete('/workflow-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = workflowRules.items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Rule not found' });
  const removed = workflowRules.items.splice(idx, 1)[0];
  res.json({ ok: true, removed });
});

export default router;
