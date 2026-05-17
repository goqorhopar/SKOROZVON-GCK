import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { poweredBy } from 'hono/powered-by';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createCallsRoutes } from './routes/calls.routes.js';
import { createClientsRoutes } from './routes/clients.routes.ts';
import { createAnalyticsRoutes } from './routes/analytics.routes.js';
import { createTelephonyRoutes } from './routes/telephony.routes.js';
import { migrate } from './db/migrate.js';
import { getDb, closeDb, checkDbHealth } from './db/connection.js';
import type { Env } from './types/index.js';

function createApp() {
  const app = new Hono<{ Bindings: { env: Env } }>();

  // Global middleware
  app.use('*', logger());
  app.use('*', timing());
  app.use('*', poweredBy('SKOROZVON-GCK'));
  app.use('*', secureHeaders());
  app.use('/api/*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Inject env into context
  app.use('*', async (c, next) => {
    c.set('env', c.env || process.env as unknown as Env);
    await next();
  });

  // Health check endpoint
  app.get('/health', async (c) => {
    try {
      const env = c.get('env') as Env;
      const dbHealthy = await checkDbHealth(getDb(env));
      
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
        },
      });
    } catch (error: any) {
      console.error('Health check failed:', error);
      return c.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      }, 503);
    }
  });

  // Readiness check
  app.get('/ready', async (c) => {
    try {
      const env = c.get('env') as Env;
      await checkDbHealth(getDb(env));
      return c.json({ status: 'ready' }, 200);
    } catch (error: any) {
      return c.json({ 
        status: 'not_ready',
        error: error.message 
      }, 503);
    }
  });

  // API routes
  const authRoutes = createAuthRoutes();
  const callsRoutes = createCallsRoutes();
  const clientsRoutes = createClientsRoutes();
  const analyticsRoutes = createAnalyticsRoutes();
  const telephonyRoutes = createTelephonyRoutes();

  app.route('/api/auth', authRoutes);
  app.route('/api/calls', callsRoutes);
  app.route('/api/clients', clientsRoutes);
  app.route('/api/analytics', analyticsRoutes);
  app.route('/api/telephony', telephonyRoutes);

  // 404 handler
  app.notFound((c) => {
    return c.json({
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    
    return c.json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    }, 500);
  });

  return app;
}

export default createApp;

// Server entry point
if (typeof process !== 'undefined' && process.argv[1]?.includes('index')) {
  const createApp = (await import('./index.js')).default;
  const app = createApp();
  
  const env: Env = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/skorozvon',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    PORT: parseInt(process.env.PORT || '3001'),
    NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) || 'development',
    TELEPHONY_API_KEY: process.env.TELEPHONY_API_KEY,
    TELEPHONY_WEBHOOK_SECRET: process.env.TELEPHONY_WEBHOOK_SECRET,
  };

  // Run migrations on startup
  console.log('Running database migrations...');
  await migrate(env);

  console.log(`Starting server on port ${env.PORT}...`);
  
  const server = {
    fetch: app.fetch.bind(app),
  };

  // For Node.js environment
  if (typeof Bun === 'undefined') {
    const { serve } = await import('@hono/node-server');
    serve({
      fetch: app.fetch.bind(app),
      port: env.PORT,
    }, (info) => {
      console.log(`🚀 Server is running on http://localhost:${info.port}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${info.port}/health`);
    });
  }
}
