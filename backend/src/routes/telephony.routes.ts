import { Hono } from 'hono';
import { getDb, checkDbHealth } from '../db/connection.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function createTelephonyRoutes() {
  const routes = new Hono<{ Variables: { user: AuthenticatedUser; env: Env }; Bindings: { env: Env } }>();

  // POST /telephony/webhook - Receive telephony events (call status updates)
  routes.post('/webhook',
    async (c) => {
      try {
        const env = c.get('env');
        
        // Verify webhook secret if configured
        if (env.TELEPHONY_WEBHOOK_SECRET) {
          const signature = c.req.header('X-Telephony-Signature');
          if (!signature || signature !== env.TELEPHONY_WEBHOOK_SECRET) {
            return c.json({ error: 'Unauthorized' }, 401);
          }
        }
        
        const body = await c.req.json();
        const db = getDb(env);
        
        // Handle different event types based on telephony provider format
        const eventType = body.event || body.Event || 'call_update';
        
        switch (eventType) {
          case 'call_started':
          case 'call.ringing':
            await handleCallStarted(db, body);
            break;
          case 'call_answered':
          case 'call.answered':
            await handleCallAnswered(db, body);
            break;
          case 'call_completed':
          case 'call.ended':
            await handleCallCompleted(db, body);
            break;
          case 'call_failed':
          case 'call.failed':
            await handleCallFailed(db, body);
            break;
          default:
            await handleCallUpdate(db, body);
        }
        
        return c.json({ success: true });
      } catch (error: any) {
        console.error('Webhook processing error:', error);
        return c.json({ error: 'Failed to process webhook' }, 500);
      }
    }
  );

  // GET /telephony/status - Check telephony integration status
  routes.get('/status',
    authMiddleware(),
    roleMiddleware('admin'),
    async (c) => {
      try {
        const env = c.get('env');
        
        return c.json({
          status: {
            configured: !!env.TELEPHONY_API_KEY,
            webhookSecret: !!env.TELEPHONY_WEBHOOK_SECRET,
          },
        });
      } catch (error: any) {
        console.error('Telephony status error:', error);
        return c.json({ error: 'Failed to get telephony status' }, 500);
      }
    }
  );

  return routes;
}

async function handleCallStarted(db: ReturnType<typeof getDb>, data: any): Promise<void> {
  const externalId = data.callId || data.CallSid || data.id;
  
  await db.query(
    `INSERT INTO calls (external_id, direction, status, from_number, to_number, started_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (external_id) DO UPDATE SET 
       status = EXCLUDED.status,
       updated_at = CURRENT_TIMESTAMP`,
    [
      externalId,
      data.direction || 'inbound',
      'ringing',
      data.from || data.From || data.fromNumber,
      data.to || data.To || data.toNumber,
      new Date(data.timestamp || Date.now()),
    ]
  );
}

async function handleCallAnswered(db: ReturnType<typeof getDb>, data: any): Promise<void> {
  const externalId = data.callId || data.CallSid || data.id;
  
  await db.query(
    `UPDATE calls SET status = 'answered', started_at = $2
     WHERE external_id = $1`,
    [externalId, new Date(data.timestamp || Date.now())]
  );
}

async function handleCallCompleted(db: ReturnType<typeof getDb>, data: any): Promise<void> {
  const externalId = data.callId || data.CallSid || data.id;
  const duration = data.duration || data.Duration || 0;
  const talkDuration = data.talkDuration || data.TalkDuration || duration;
  
  await db.query(
    `UPDATE calls SET 
       status = 'completed',
       duration = $2,
       talk_duration = $3,
       recording_url = $4,
       ended_at = $5
     WHERE external_id = $1`,
    [
      externalId,
      parseInt(duration),
      parseInt(talkDuration),
      data.recordingUrl || data.RecordingUrl,
      new Date(data.timestamp || Date.now()),
    ]
  );
}

async function handleCallFailed(db: ReturnType<typeof getDb>, data: any): Promise<void> {
  const externalId = data.callId || data.CallSid || data.id;
  
  await db.query(
    `UPDATE calls SET status = 'failed', ended_at = $2
     WHERE external_id = $1`,
    [externalId, new Date(data.timestamp || Date.now())]
  );
}

async function handleCallUpdate(db: ReturnType<typeof getDb>, data: any): Promise<void> {
  // Generic handler for other call updates
  const externalId = data.callId || data.CallSid || data.id;
  
  if (externalId) {
    await db.query(
      `UPDATE calls SET transcription = $2, updated_at = CURRENT_TIMESTAMP
       WHERE external_id = $1`,
      [externalId, data.transcription || data.Transcription]
    );
  }
}
