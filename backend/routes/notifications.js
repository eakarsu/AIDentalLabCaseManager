import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Ensure notifications table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('Notifications table init error:', e.message);
  }
})();

// Auto-generate notifications based on current data state
async function generateAutoNotifications() {
  try {
    // Cases due within 24 hours
    const dueSoonCases = await pool.query(`
      SELECT id, case_number, patient_name, due_date
      FROM cases
      WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        AND status NOT IN ('completed', 'shipped')
    `);

    for (const c of dueSoonCases.rows) {
      const exists = await pool.query(
        `SELECT id FROM notifications WHERE reference_type = 'case' AND reference_id = $1 AND type = 'due_soon' AND created_at > NOW() - INTERVAL '1 hour'`,
        [c.id]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO notifications (type, title, message, reference_type, reference_id)
           VALUES ('due_soon', 'Case Due Soon', $1, 'case', $2)`,
          [`Case ${c.case_number} (${c.patient_name}) is due within 24 hours (${new Date(c.due_date).toLocaleString()}).`, c.id]
        );
      }
    }

    // Materials with stock below minimum
    const lowStock = await pool.query(`
      SELECT id, name, current_stock, minimum_stock, unit
      FROM materials
      WHERE current_stock < minimum_stock
    `);

    for (const m of lowStock.rows) {
      const exists = await pool.query(
        `SELECT id FROM notifications WHERE reference_type = 'material' AND reference_id = $1 AND type = 'low_stock' AND created_at > NOW() - INTERVAL '6 hours'`,
        [m.id]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO notifications (type, title, message, reference_type, reference_id)
           VALUES ('low_stock', 'Low Material Stock', $1, 'material', $2)`,
          [`${m.name} is low on stock: ${m.current_stock} ${m.unit || 'units'} remaining (minimum: ${m.minimum_stock}).`, m.id]
        );
      }
    }

    // Equipment calibrations due within 7 days
    const calibrationDue = await pool.query(`
      SELECT id, equipment_name, next_calibration
      FROM equipment_calibrations
      WHERE next_calibration BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `);

    for (const eq of calibrationDue.rows) {
      const exists = await pool.query(
        `SELECT id FROM notifications WHERE reference_type = 'equipment' AND reference_id = $1 AND type = 'calibration_due' AND created_at > NOW() - INTERVAL '12 hours'`,
        [eq.id]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO notifications (type, title, message, reference_type, reference_id)
           VALUES ('calibration_due', 'Equipment Calibration Due', $1, 'equipment', $2)`,
          [`${eq.equipment_name} calibration is due on ${new Date(eq.next_calibration).toLocaleDateString()}.`, eq.id]
        );
      }
    }
  } catch (e) {
    console.error('Auto-notification generation error:', e.message);
  }
}

// GET /api/notifications - list notifications with pagination
router.get('/', async (req, res) => {
  try {
    // Trigger auto-generation on each fetch
    await generateAutoNotifications();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const whereClause = unreadOnly ? 'WHERE is_read = FALSE' : '';

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM notifications ${whereClause}`);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read - mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all - mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
