import { getDb } from './connection.js';
import type { Env } from '../types/index.js';

export async function migrate(env: Env): Promise<void> {
  const db = getDb(env);
  
  console.log('Running database migrations...');
  
  // Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'operator',
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create clients table
  await db.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      company VARCHAR(255),
      source VARCHAR(100),
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create calls table
  await db.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(255) UNIQUE NOT NULL,
      direction VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL,
      from_number VARCHAR(50) NOT NULL,
      to_number VARCHAR(50) NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      talk_duration INTEGER,
      recording_url TEXT,
      transcription TEXT,
      manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ended_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);
    CREATE INDEX IF NOT EXISTS idx_calls_manager_id ON calls(manager_id);
    CREATE INDEX IF NOT EXISTS idx_calls_client_id ON calls(client_id);
    CREATE INDEX IF NOT EXISTS idx_calls_direction ON calls(direction);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
    CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
  `);
  
  // Create updated_at trigger function
  await db.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  // Add triggers for updated_at
  await db.query(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await db.query(`
    DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
    CREATE TRIGGER update_clients_updated_at
      BEFORE UPDATE ON clients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await db.query(`
    DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
    CREATE TRIGGER update_calls_updated_at
      BEFORE UPDATE ON calls
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
  
  console.log('Database migrations completed successfully.');
}
