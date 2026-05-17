import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/connection.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { CreateClientSchema, UpdateClientSchema } from '../types/schemas.js';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function createClientsRoutes() {
  const routes = new Hono<{ Variables: { user: AuthenticatedUser; env: Env }; Bindings: { env: Env } }>();

  // GET /clients - List clients with pagination and search
  routes.get('/',
    authMiddleware(),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        const page = parseInt(c.req.query('page') || '1');
        const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
        const offset = (page - 1) * limit;
        
        const search = c.req.query('search');
        const phone = c.req.query('phone');
        
        let query = `
          SELECT c.*, 
                 (SELECT COUNT(*) FROM calls WHERE client_id = c.id) as "totalCalls"
          FROM clients c
          WHERE 1=1
        `;
        
        const values: unknown[] = [];
        let paramIndex = 1;
        
        if (search) {
          query += ` AND (c.name ILIKE $${paramIndex++} OR c.email ILIKE $${paramIndex++} OR c.company ILIKE $${paramIndex++})`;
          const searchTerm = `%${search}%`;
          values.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (phone) {
          query += ` AND c.phone LIKE $${paramIndex++}`;
          values.push(`%${phone}%`);
        }
        
        query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);
        
        const result = await db.query(query, values);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) FROM clients WHERE 1=1`;
        const countValues: unknown[] = [];
        let countParamIndex = 1;
        
        if (search) {
          countQuery += ` AND (name ILIKE $${countParamIndex++} OR email ILIKE $${countParamIndex++} OR company ILIKE $${countParamIndex++})`;
          const searchTerm = `%${search}%`;
          countValues.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (phone) {
          countQuery += ` AND phone LIKE $${countParamIndex++}`;
          countValues.push(`%${phone}%`);
        }
        
        const countResult = await db.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].count);
        
        return c.json({
          clients: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: any) {
        console.error('List clients error:', error);
        return c.json({ error: 'Failed to list clients' }, 500);
      }
    }
  );

  // GET /clients/:id - Get single client
  routes.get('/:id',
    authMiddleware(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const db = getDb(c.get('env'));
        
        const result = await db.query(
          `SELECT c.*, 
                  (SELECT COUNT(*) FROM calls WHERE client_id = c.id) as "totalCalls",
                  (SELECT COUNT(*) FROM calls WHERE client_id = c.id AND status = 'answered') as "answeredCalls"
           FROM clients c
           WHERE c.id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Client not found' }, 404);
        }
        
        return c.json({ client: result.rows[0] });
      } catch (error: any) {
        console.error('Get client error:', error);
        return c.json({ error: 'Failed to get client' }, 500);
      }
    }
  );

  // POST /clients - Create client
  routes.post('/',
    authMiddleware(),
    roleMiddleware('admin', 'manager'),
    zValidator('json', CreateClientSchema),
    async (c) => {
      try {
        const data = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        const result = await db.query(
          `INSERT INTO clients (name, phone, email, company, source, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [data.name, data.phone, data.email, data.company, data.source, JSON.stringify(data.tags || []), data.notes]
        );
        
        return c.json({ client: result.rows[0] }, 201);
      } catch (error: any) {
        console.error('Create client error:', error);
        return c.json({ error: 'Failed to create client' }, 500);
      }
    }
  );

  // PUT /clients/:id - Update client
  routes.put('/:id',
    authMiddleware(),
    roleMiddleware('admin', 'manager'),
    zValidator('json', UpdateClientSchema),
    async (c) => {
      try {
        const id = c.req.param('id');
        const updates = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;
        
        if (updates.name !== undefined) {
          fields.push(`name = $${paramIndex++}`);
          values.push(updates.name);
        }
        
        if (updates.phone !== undefined) {
          fields.push(`phone = $${paramIndex++}`);
          values.push(updates.phone);
        }
        
        if (updates.email !== undefined) {
          fields.push(`email = $${paramIndex++}`);
          values.push(updates.email);
        }
        
        if (updates.company !== undefined) {
          fields.push(`company = $${paramIndex++}`);
          values.push(updates.company);
        }
        
        if (updates.source !== undefined) {
          fields.push(`source = $${paramIndex++}`);
          values.push(updates.source);
        }
        
        if (updates.tags !== undefined) {
          fields.push(`tags = $${paramIndex++}`);
          values.push(updates.tags);
        }
        
        if (updates.notes !== undefined) {
          fields.push(`notes = $${paramIndex++}`);
          values.push(updates.notes);
        }
        
        if (fields.length === 0) {
          return c.json({ error: 'No fields to update' }, 400);
        }
        
        values.push(id);
        
        const result = await db.query(
          `UPDATE clients SET ${fields.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING *`,
          values
        );
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Client not found' }, 404);
        }
        
        return c.json({ client: result.rows[0] });
      } catch (error: any) {
        console.error('Update client error:', error);
        return c.json({ error: 'Failed to update client' }, 500);
      }
    }
  );

  // DELETE /clients/:id - Delete client
  routes.delete('/:id',
    authMiddleware(),
    roleMiddleware('admin'),
    async (c) => {
      try {
        const id = c.req.param('id');
        const db = getDb(c.get('env'));
        
        // Check if client has calls
        const callsResult = await db.query(
          'SELECT COUNT(*) FROM calls WHERE client_id = $1',
          [id]
        );
        
        if (parseInt(callsResult.rows[0].count) > 0) {
          return c.json({ 
            error: 'Cannot delete client with existing calls. Consider archiving instead.' 
          }, 400);
        }
        
        const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
          return c.json({ error: 'Client not found' }, 404);
        }
        
        return c.json({ message: 'Client deleted successfully' });
      } catch (error: any) {
        console.error('Delete client error:', error);
        return c.json({ error: 'Failed to delete client' }, 500);
      }
    }
  );

  return routes;
}
