import { Router } from 'express';
import pool from '../db.js';

// Required fields per table for input validation
const REQUIRED_FIELDS = {
  cases: ['patient_name', 'dentist_id', 'restoration_type', 'due_date'],
};

// Generic CRUD route factory
export function createCrudRoutes(tableName, { orderBy = 'id DESC', searchColumns = [], joinQuery = null, selectQuery = null } = {}) {
  const router = Router();

  // GET all — supports ?page=N&limit=N for pagination
  router.get('/', async (req, res) => {
    try {
      const paginate = req.query.page !== undefined;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      if (paginate) {
        // Count total rows
        const countResult = await pool.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        // Paginated data query
        let dataQuery;
        if (joinQuery) {
          // Wrap join query with LIMIT/OFFSET
          dataQuery = `SELECT * FROM (${joinQuery.replace(/ORDER BY .+$/i, '')}) _sub ORDER BY _sub.id DESC LIMIT $1 OFFSET $2`;
          // Simpler fallback: append LIMIT/OFFSET directly if joinQuery ends with ORDER BY
          dataQuery = joinQuery.replace(/ORDER BY (.+)$/i, `ORDER BY $1 LIMIT ${limit} OFFSET ${offset}`);
        } else {
          dataQuery = `SELECT ${selectQuery || '*'} FROM ${tableName} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
        }

        const result = await pool.query(dataQuery);
        return res.json({
          data: result.rows,
          pagination: { page, limit, total, totalPages }
        });
      }

      const query = joinQuery || `SELECT ${selectQuery || '*'} FROM ${tableName} ORDER BY ${orderBy}`;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET by id
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST create
  router.post('/', async (req, res) => {
    try {
      // Input validation for tables with required fields
      const required = REQUIRED_FIELDS[tableName];
      if (required) {
        const missing = required.filter(f => !req.body[f] && req.body[f] !== 0);
        if (missing.length > 0) {
          return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }
      }

      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT update
  router.put('/:id', async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
      const result = await pool.query(query, [...values, req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
