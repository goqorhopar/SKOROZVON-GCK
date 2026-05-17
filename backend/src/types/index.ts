export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  TELEPHONY_API_KEY?: string;
  TELEPHONY_WEBHOOK_SECRET?: string;
}

export interface AppContext {
  env: Env;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
}
