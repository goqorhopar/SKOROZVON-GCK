import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/connection.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { CreateCallSchema, UpdateCallSchema } from '../types/schemas.js';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function createCallsRoutes() {
  const routes = new Hono<{ Variables: { user: AuthenticatedUser; env: Env }; Bindings: { env: Env } }>();

  // GET /calls - List calls with pagination and filters
  routes.get('/',
    authMiddleware(),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        const page = parseInt(c.req.query('page') || '1');
        const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
        const offset = (page - 1) * limit;
        
        const status = c.req.query('status');
        const direction = c.req.query('direction');
        const startDate = c.req.query('startDate');
        const endDate = c.req.query('endDate');
        const managerId = c.req.query('managerId');
        
        let query = `
          SELECT c.id, c.external_id, c.direction, c.status, 
                 c.from_number, c.to_number, c.duration, c.talk_duration,
                 c.recording_url, c.transcription, c.manager_id, c.client_id,
                 c.started_at, c.ended_at, c.created_at,
                 u.first_name as "managerFirstName", u.last_name as "managerLastName",
                 cl.name as "clientName", cl.phone as "clientPhone"
          FROM calls c
          LEFT JOIN users u ON c.manager_id = u.id
          LEFT JOIN clients cl ON c.client_id = cl.id
          WHERE 1=1
        `;
        
        const values: unknown[] = [];
        let paramIndex = 1;
        
        if (status) {
          query += ` AND c.status = $${paramIndex++}`;
          values.push(status);
        }
        
        if (direction) {
          query += ` AND c.direction = $${paramIndex++}`;
          values.push(direction);
        }
        
        if (startDate) {
          query += ` AND c.started_at >= $${paramIndex++}`;
          values.push(new Date(startDate));
        }
        
        if (endDate) {
          query += ` AND c.started_at <= $${paramIndex++}`;
          values.push(new Date(endDate));
        }
        
        if (managerId) {
          query += ` AND c.manager_id = $${paramIndex++}`;
          values.push(managerId);
        }
        
        // Non-admin users can only see their own calls
        const user = c.get('user');
        if (user.role !== 'admin') {
          query += ` AND (c.manager_id = $${paramIndex++} OR c.manager_id IS NULL)`;
          values.push(user.id);
        }
        
        query += ` ORDER BY c.started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);
        
        const result = await db.query(query, values);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) FROM calls WHERE 1=1`;
        const countValues: unknown[] = [];
        let countParamIndex = 1;
        
        if (status) {
          countQuery += ` AND status = $${countParamIndex++}`;
          countValues.push(status);
        }
        
        if (direction) {
          countQuery += ` AND direction = $${countParamIndex++}`;
          countValues.push(direction);
        }
        
        if (startDate) {
          countQuery += ` AND started_at >= $${countParamIndex++}`;
          countValues.push(new Date(startDate));
        }
        
        if (endDate) {
          countQuery += ` AND started_at <= $${countParamIndex++}`;
          countValues.push(new Date(endDate));
        }
        
        if (managerId) {
          countQuery += ` AND manager_id = $${countParamIndex++}`;
          countValues.push(managerId);
        }
        
        if (user.role !== 'admin') {
          countQuery += ` AND (manager_id = $${countParamIndex++} OR manager_id IS NULL)`;
          countValues.push(user.id);
        }
        
        const countResult = await db.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].count);
        
        return c.json({
          calls: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: any) {
        console.error('List calls error:', error);
        return c.json({ error: 'Failed to list calls' }, 500);
      }
    }
  );

  // GET /calls/:id - Get single call
  routes.get('/:id',
    authMiddleware(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const db = getDb(c.get('env'));
        
        const result = await db.query(
          `SELECT c.*, u.first_name as "managerFirstName", u.last_name as "managerLastName",
                  cl.name as "clientName", cl.phone as "clientPhone"
           FROM calls c
           LEFT JOIN users u ON c.manager_id = u.id
           LEFT JOIN clients cl ON c.client_id = cl.id
           WHERE c.id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Call not found' }, 404);
        }
        
        return c.json({ call: result.rows[0] });
      } catch (error: any) {
        console.error('Get call error:', error);
        return c.json({ error: 'Failed to get call' }, 500);
      }
    }
  );

  // POST /calls - Create call (typically from telephony webhook)
  routes.post('/',
    authMiddleware(),
    roleMiddleware('admin', 'manager'),
    zValidator('json', CreateCallSchema),
    async (c) => {
      try {
        const data = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        const result = await db.query(
          `INSERT INTO calls (external_id, direction, status, from_number, to_number, 
                             duration, talk_duration, recording_url, transcription, 
                             manager_id, client_id, started_at, ended_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            data.externalId,
            data.direction || 'outbound',
            data.status || 'queued',
            data.fromNumber,
            data.toNumber,
            data.duration || 0,
            data.talkDuration,
            data.recordingUrl,
            data.transcription,
            data.managerId,
            data.clientId,
            data.startedAt || new Date(),
            data.endedAt,
          ]
        );
        
        return c.json({ call: result.rows[0] }, 201);
      } catch (error: any) {
        console.error('Create call error:', error);
        if (error.code === '23505') { // Unique violation
          return c.json({ error: 'Call with this external ID already exists' }, 409);
        }
        return c.json({ error: 'Failed to create call' }, 500);
      }
    }
  );

  // PUT /calls/:id - Update call
  routes.put('/:id',
    authMiddleware(),
    roleMiddleware('admin', 'manager'),
    zValidator('json', UpdateCallSchema),
    async (c) => {
      try {
        const id = c.req.param('id');
        const updates = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;
        
        if (updates.status !== undefined) {
          fields.push(`status = $${paramIndex++}`);
          values.push(updates.status);
        }
        
        if (updates.duration !== undefined) {
          fields.push(`duration = $${paramIndex++}`);
          values.push(updates.duration);
        }
        
        if (updates.talkDuration !== undefined) {
          fields.push(`talk_duration = $${paramIndex++}`);
          values.push(updates.talkDuration);
        }
        
        if (updates.recordingUrl !== undefined) {
          fields.push(`recording_url = $${paramIndex++}`);
          values.push(updates.recordingUrl);
        }
        
        if (updates.transcription !== undefined) {
          fields.push(`transcription = $${paramIndex++}`);
          values.push(updates.transcription);
        }
        
        if (updates.managerId !== undefined) {
          fields.push(`manager_id = $${paramIndex++}`);
          values.push(updates.managerId);
        }
        
        if (updates.clientId !== undefined) {
          fields.push(`client_id = $${paramIndex++}`);
          values.push(updates.clientId);
        }
        
        if (updates.endedAt !== undefined) {
          fields.push(`ended_at = $${paramIndex++}`);
          values.push(updates.endedAt);
        }
        
        if (fields.length === 0) {
          return c.json({ error: 'No fields to update' }, 400);
        }
        
        values.push(id);
        
        const result = await db.query(
          `UPDATE calls SET ${fields.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING *`,
          values
        );
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Call not found' }, 404);
        }
        
        return c.json({ call: result.rows[0] });
      } catch (error: any) {
        console.error('Update call error:', error);
        return c.json({ error: 'Failed to update call' }, 500);
      }
    }
  );

  // DELETE /calls/:id - Delete call
  routes.delete('/:id',
    authMiddleware(),
    roleMiddleware('admin'),
    async (c) => {
      try {
        const id = c.req.param('id');
        const db = getDb(c.get('env'));
        
        const result = await db.query('DELETE FROM calls WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Call not found' }, 404);
        }
        
        return c.json({ message: 'Call deleted successfully' });
      } catch (error: any) {
        console.error('Delete call error:', error);
        return c.json({ error: 'Failed to delete call' }, 500);
      }
    }
  );

  return routes;
}
