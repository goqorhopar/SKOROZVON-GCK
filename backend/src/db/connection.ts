import { Pool, PoolConfig } from 'pg';
import type { Env } from '../types/index.js';

let pool: Pool | null = null;

export function getPoolConfig(env: Env): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

export function getDb(env: Env): Pool {
  if (!pool) {
    pool = new Pool(getPoolConfig(env));
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function checkDbHealth(pool: Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
