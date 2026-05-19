import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import aiNewRoutes from './routes/aiNew.js';
import notificationRoutes from './routes/notifications.js';
import { createCrudRoutes } from './routes/crud.js';
import { authenticateToken } from './middleware/auth.js';
import customViewsRoutes from './routes/customViews.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS from env (comma-separated origins) - falls back to localhost dev
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/cases', authenticateToken, createCrudRoutes('cases', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT c.*, d.name as dentist_name, d.practice_name
    FROM cases c LEFT JOIN dentists d ON c.dentist_id = d.id ORDER BY c.created_at DESC`
}));

app.use('/api/dentists', authenticateToken, createCrudRoutes('dentists', { orderBy: 'name ASC' }));

app.use('/api/digital-impressions', authenticateToken, createCrudRoutes('digital_impressions', {
  orderBy: 'uploaded_at DESC',
  joinQuery: `SELECT di.*, c.case_number FROM digital_impressions di LEFT JOIN cases c ON di.case_id = c.id ORDER BY di.uploaded_at DESC`
}));

app.use('/api/technicians', authenticateToken, createCrudRoutes('technicians', { orderBy: 'name ASC' }));

app.use('/api/production-schedules', authenticateToken, createCrudRoutes('production_schedules', {
  orderBy: 'scheduled_start ASC',
  joinQuery: `SELECT ps.*, c.case_number, t.name as technician_name
    FROM production_schedules ps LEFT JOIN cases c ON ps.case_id = c.id LEFT JOIN technicians t ON ps.technician_id = t.id
    ORDER BY ps.scheduled_start ASC`
}));

app.use('/api/materials', authenticateToken, createCrudRoutes('materials', { orderBy: 'name ASC' }));

app.use('/api/shades', authenticateToken, createCrudRoutes('shade_records', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT sr.*, c.case_number, c.patient_name FROM shade_records sr LEFT JOIN cases c ON sr.case_id = c.id ORDER BY sr.created_at DESC`
}));

app.use('/api/milling-schedules', authenticateToken, createCrudRoutes('milling_schedules', {
  orderBy: 'scheduled_start ASC',
  joinQuery: `SELECT ms.*, c.case_number FROM milling_schedules ms LEFT JOIN cases c ON ms.case_id = c.id ORDER BY ms.scheduled_start ASC`
}));

app.use('/api/oven-schedules', authenticateToken, createCrudRoutes('oven_schedules', {
  orderBy: 'scheduled_start ASC',
  joinQuery: `SELECT os.*, c.case_number FROM oven_schedules os LEFT JOIN cases c ON os.case_id = c.id ORDER BY os.scheduled_start ASC`
}));

app.use('/api/quality-checkpoints', authenticateToken, createCrudRoutes('quality_checkpoints', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT qc.*, c.case_number FROM quality_checkpoints qc LEFT JOIN cases c ON qc.case_id = c.id ORDER BY qc.created_at DESC`
}));

app.use('/api/remakes', authenticateToken, createCrudRoutes('remakes', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT r.*, c.case_number, c.patient_name FROM remakes r LEFT JOIN cases c ON r.case_id = c.id ORDER BY r.created_at DESC`
}));

app.use('/api/shipments', authenticateToken, createCrudRoutes('shipments', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT s.*, c.case_number FROM shipments s LEFT JOIN cases c ON s.case_id = c.id ORDER BY s.created_at DESC`
}));

app.use('/api/pricing', authenticateToken, createCrudRoutes('pricing', { orderBy: 'category ASC, procedure_name ASC' }));

app.use('/api/invoices', authenticateToken, createCrudRoutes('invoices', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT i.*, d.name as dentist_name, c.case_number
    FROM invoices i LEFT JOIN dentists d ON i.dentist_id = d.id LEFT JOIN cases c ON i.case_id = c.id
    ORDER BY i.created_at DESC`
}));

app.use('/api/equipment-calibrations', authenticateToken, createCrudRoutes('equipment_calibrations', { orderBy: 'next_calibration ASC' }));

app.use('/api/compliance', authenticateToken, createCrudRoutes('compliance_records', { orderBy: 'next_review ASC' }));

app.use('/api/continuing-education', authenticateToken, createCrudRoutes('continuing_education', {
  orderBy: 'completion_date DESC',
  joinQuery: `SELECT ce.*, t.name as technician_name FROM continuing_education ce LEFT JOIN technicians t ON ce.technician_id = t.id ORDER BY ce.completion_date DESC`
}));

app.use('/api/photo-documentation', authenticateToken, createCrudRoutes('photo_documentation', {
  orderBy: 'taken_at DESC',
  joinQuery: `SELECT pd.*, c.case_number FROM photo_documentation pd LEFT JOIN cases c ON pd.case_id = c.id ORDER BY pd.taken_at DESC`
}));

app.use('/api/design-files', authenticateToken, createCrudRoutes('design_files', {
  orderBy: 'created_at DESC',
  joinQuery: `SELECT df.*, c.case_number FROM design_files df LEFT JOIN cases c ON df.case_id = c.id ORDER BY df.created_at DESC`
}));

app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/ai', authenticateToken, aiNewRoutes);





app.use('/api/ai', (await import('./routes/supplyOptimize.js')).default);
app.use('/api/ai', (await import('./routes/qualityScoring.js')).default);
app.use('/api/ai', (await import('./routes/techSkillMatch.js')).default);
app.use('/api/ai', (await import('./routes/defectPrevent.js')).default);
app.use('/api/ai', (await import('./routes/turnaroundPredict.js')).default);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Dashboard stats
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const pool = (await import('./db.js')).default;
    const [activeCases, techs, materials, remakes] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM cases WHERE status NOT IN ('completed', 'shipped')"),
      pool.query("SELECT COUNT(*) as count FROM technicians WHERE status = 'available'"),
      pool.query("SELECT COUNT(*) as count FROM materials WHERE status = 'low_stock'"),
      pool.query("SELECT COUNT(*) as count FROM remakes WHERE status = 'pending'"),
    ]);
    res.json({
      active_cases: parseInt(activeCases.rows[0].count),
      available_technicians: parseInt(techs.rows[0].count),
      low_stock_materials: parseInt(materials.rows[0].count),
      pending_remakes: parseInt(remakes.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// // === Batch 02 Gaps & Frontend Mounts (disabled: CJS require() incompatible with ESM module) ===
// app.use('/api/gap-none-all-ai-functions-are-covered-highest-ai-density', require('./routes/gap_none_all_ai_functions_are_covered_highest_ai_density'));
// app.use('/api/gap-no-detailed-case-detail-schema-materials-dentist-contact-pat', require('./routes/gap_no_detailed_case_detail_schema_materials_dentist_contact_pat'));
// app.use('/api/gap-no-workflow-stage-tracking-received-in-progress-completed-de', require('./routes/gap_no_workflow_stage_tracking_received_in_progress_completed_de'));
// app.use('/api/gap-no-quality-metric-or-defect-tracker', require('./routes/gap_no_quality_metric_or_defect_tracker'));
// app.use('/api/gap-no-dentist-customer-communication-template-library', require('./routes/gap_no_dentist_customer_communication_template_library'));
// app.use('/api/gap-no-inventory-management-for-materials', require('./routes/gap_no_inventory_management_for_materials'));
// app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));
// app.use('/api/gap-no-reporting-beyond-stubs', require('./routes/gap_no_reporting_beyond_stubs'));

// === Custom Views (Lab Views) - mounted BEFORE 404 handler ===
app.use('/api/custom-views', customViewsRoutes);

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'dental-lab-api', time: new Date().toISOString() });
});

// 404 catch-all (after all routes)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`🦷 Dental Lab API running on port ${PORT}`);
});
