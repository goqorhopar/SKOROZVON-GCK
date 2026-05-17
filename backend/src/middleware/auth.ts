import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function authMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing or invalid authorization header' }, 401);
    }
    
    const token = authHeader.substring(7);
    
    try {
      const jwt = await import('jsonwebtoken');
      const env = c.get('env') as Env;
      
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser & { userId: string };
      
      c.set('user', {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      });
      
      await next();
    } catch (error) {
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
  };
}

export function roleMiddleware(...allowedRoles: Array<'admin' | 'manager' | 'operator'>) {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }
    
    await next();
  };
}
