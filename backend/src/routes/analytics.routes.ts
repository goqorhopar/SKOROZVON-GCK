import { Hono } from 'hono';
import { getDb, checkDbHealth } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function createAnalyticsRoutes() {
  const routes = new Hono<{ Variables: { user: AuthenticatedUser; env: Env }; Bindings: { env: Env } }>();

  // GET /analytics/overview - Dashboard overview stats
  routes.get('/overview',
    authMiddleware(),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        const user = c.get('user');
        
        // Date range (last 30 days by default)
        const startDate = c.req.query('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = c.req.query('endDate') || new Date().toISOString();
        
        let managerFilter = '';
        let managerParams: unknown[] = [];
        
        if (user.role !== 'admin') {
          managerFilter = 'AND (manager_id = $3 OR manager_id IS NULL)';
          managerParams = [user.id];
        }
        
        // Total calls
        const totalCallsResult = await db.query(
          `SELECT COUNT(*) FROM calls 
           WHERE started_at >= $1 AND started_at <= $2 ${managerFilter}`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        // Answered calls
        const answeredCallsResult = await db.query(
          `SELECT COUNT(*) FROM calls 
           WHERE status = 'answered' AND started_at >= $1 AND started_at <= $2 ${managerFilter}`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        // Missed calls
        const missedCallsResult = await db.query(
          `SELECT COUNT(*) FROM calls 
           WHERE status IN ('missed', 'failed') AND started_at >= $1 AND started_at <= $2 ${managerFilter}`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        // Average duration
        const avgDurationResult = await db.query(
          `SELECT COALESCE(AVG(talk_duration), 0) as avg_duration FROM calls 
           WHERE status = 'answered' AND started_at >= $1 AND started_at <= $2 ${managerFilter}`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        // Total clients
        const totalClientsResult = await db.query(
          `SELECT COUNT(DISTINCT client_id) FROM calls 
           WHERE client_id IS NOT NULL AND started_at >= $1 AND started_at <= $2 ${managerFilter}`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        const totalCalls = parseInt(totalCallsResult.rows[0].count);
        const answeredCalls = parseInt(answeredCallsResult.rows[0].count);
        const missedCalls = parseInt(missedCallsResult.rows[0].count);
        const avgDuration = Math.round(parseFloat(avgDurationResult.rows[0].avg_duration));
        const newClients = parseInt(totalClientsResult.rows[0].count);
        
        const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
        
        return c.json({
          overview: {
            totalCalls,
            answeredCalls,
            missedCalls,
            answerRate,
            avgDuration,
            newClients,
          },
          period: { startDate, endDate },
        });
      } catch (error: any) {
        console.error('Analytics overview error:', error);
        return c.json({ error: 'Failed to get analytics overview' }, 500);
      }
    }
  );

  // GET /analytics/managers - Manager performance stats
  routes.get('/managers',
    authMiddleware(),
    roleMiddleware('admin', 'manager'),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        const user = c.get('user');
        
        const startDate = c.req.query('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = c.req.query('endDate') || new Date().toISOString();
        
        let query = `
          SELECT 
            u.id as "managerId",
            u.first_name || ' ' || u.last_name as "managerName",
            COUNT(c.id) as "totalCalls",
            COUNT(CASE WHEN c.status = 'answered' THEN 1 END) as "answeredCalls",
            COUNT(CASE WHEN c.status IN ('missed', 'failed') THEN 1 END) as "missedCalls",
            COALESCE(AVG(CASE WHEN c.status = 'answered' THEN c.talk_duration END), 0) as "averageDuration",
            ROUND(
              COUNT(CASE WHEN c.status = 'answered' THEN 1 END)::numeric / 
              NULLIF(COUNT(c.id), 0)::numeric * 100, 
              2
            ) as "answerRate"
          FROM users u
          LEFT JOIN calls c ON u.id = c.manager_id 
            AND c.started_at >= $1 AND c.started_at <= $2
          WHERE u.role IN ('manager', 'operator')
        `;
        
        const params: unknown[] = [new Date(startDate), new Date(endDate)];
        
        if (user.role !== 'admin') {
          query += ' AND u.id = $3';
          params.push(user.id);
        }
        
        query += `
          GROUP BY u.id, u.first_name, u.last_name
          ORDER BY "totalCalls" DESC
        `;
        
        const result = await db.query(query, params);
        
        return c.json({
          managers: result.rows.map(row => ({
            ...row,
            averageDuration: Math.round(parseFloat(row.averageDuration)),
            answerRate: parseFloat(row.answerRate),
          })),
          period: { startDate, endDate },
        });
      } catch (error: any) {
        console.error('Manager analytics error:', error);
        return c.json({ error: 'Failed to get manager analytics' }, 500);
      }
    }
  );

  // GET /analytics/daily - Daily call statistics
  routes.get('/daily',
    authMiddleware(),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        const user = c.get('user');
        
        const startDate = c.req.query('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = c.req.query('endDate') || new Date().toISOString();
        
        let managerFilter = '';
        let managerParams: unknown[] = [];
        
        if (user.role !== 'admin') {
          managerFilter = 'AND (manager_id = $3 OR manager_id IS NULL)';
          managerParams = [user.id];
        }
        
        const result = await db.query(
          `SELECT 
             DATE(started_at) as date,
             COUNT(*) as totalCalls,
             COUNT(CASE WHEN status = 'answered' THEN 1 END) as answeredCalls,
             COUNT(CASE WHEN status IN ('missed', 'failed') THEN 1 END) as missedCalls,
             COALESCE(AVG(CASE WHEN status = 'answered' THEN talk_duration END), 0) as avgDuration
           FROM calls
           WHERE started_at >= $1 AND started_at <= $2 ${managerFilter}
           GROUP BY DATE(started_at)
           ORDER BY date`,
          [new Date(startDate), new Date(endDate), ...managerParams]
        );
        
        return c.json({
          daily: result.rows.map(row => ({
            date: row.date,
            totalCalls: parseInt(row.totalcalls),
            answeredCalls: parseInt(row.answeredcalls),
            missedCalls: parseInt(row.missedcalls),
            avgDuration: Math.round(parseFloat(row.avgduration)),
          })),
          period: { startDate, endDate },
        });
      } catch (error: any) {
        console.error('Daily analytics error:', error);
        return c.json({ error: 'Failed to get daily analytics' }, 500);
      }
    }
  );

  return routes;
}
