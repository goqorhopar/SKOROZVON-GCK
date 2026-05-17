import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/connection.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { 
  createUser, 
  findUserById, 
  updateUser,
  verifyPassword,
  generateToken 
} from '../services/auth.service.js';
import { CreateUserSchema, UpdateUserSchema, LoginSchema } from '../types/schemas.js';
import type { Env, AuthenticatedUser } from '../types/index.js';

export function createAuthRoutes() {
  const routes = new Hono<{ Variables: { user: AuthenticatedUser; env: Env }; Bindings: { env: Env } }>();

  // POST /auth/register - Register new user (admin only)
  routes.post('/register', 
    authMiddleware(),
    roleMiddleware('admin'),
    zValidator('json', CreateUserSchema),
    async (c) => {
      try {
        const data = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        // Check if user already exists
        const existingUser = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [data.email.toLowerCase()]
        );
        
        if (existingUser.rows.length > 0) {
          return c.json({ error: 'User with this email already exists' }, 409);
        }
        
        const user = await createUser(db, data);
        
        return c.json({
          message: 'User created successfully',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
          },
        }, 201);
      } catch (error: any) {
        console.error('Registration error:', error);
        return c.json({ error: 'Failed to create user' }, 500);
      }
    }
  );

  // POST /auth/login - Login
  routes.post('/login',
    zValidator('json', LoginSchema),
    async (c) => {
      try {
        const credentials = c.req.valid('json');
        const env = c.get('env');
        const db = getDb(env);
        
        const userResult = await db.query(
          `SELECT id, email, password_hash as "passwordHash", role,
                  first_name as "firstName", last_name as "lastName"
           FROM users
           WHERE email = $1`,
          [credentials.email.toLowerCase()]
        );
        
        if (userResult.rows.length === 0) {
          return c.json({ error: 'Invalid credentials' }, 401);
        }
        
        const user = userResult.rows[0];
        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        
        if (!isValid) {
          return c.json({ error: 'Invalid credentials' }, 401);
        }
        
        const token = generateToken(user, env);
        
        return c.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error: any) {
        console.error('Login error:', error);
        return c.json({ error: 'Failed to login' }, 500);
      }
    }
  );

  // GET /auth/me - Get current user
  routes.get('/me',
    authMiddleware(),
    async (c) => {
      try {
        const user = c.get('user');
        const db = getDb(c.get('env'));
        
        const result = await findUserById(db, user.id);
        
        if (!result) {
          return c.json({ error: 'User not found' }, 404);
        }
        
        return c.json({
          id: result.id,
          email: result.email,
          role: result.role,
          firstName: result.firstName,
          lastName: result.lastName,
          phone: result.phone,
          createdAt: result.createdAt,
        });
      } catch (error: any) {
        console.error('Get user error:', error);
        return c.json({ error: 'Failed to get user' }, 500);
      }
    }
  );

  // PUT /auth/me - Update current user
  routes.put('/me',
    authMiddleware(),
    zValidator('json', UpdateUserSchema),
    async (c) => {
      try {
        const user = c.get('user');
        const updates = c.req.valid('json');
        const db = getDb(c.get('env'));
        
        const updatedUser = await updateUser(db, user.id, updates);
        
        return c.json({
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
        });
      } catch (error: any) {
        console.error('Update user error:', error);
        return c.json({ error: error.message || 'Failed to update user' }, 500);
      }
    }
  );

  // GET /auth/users - List all users (admin only)
  routes.get('/users',
    authMiddleware(),
    roleMiddleware('admin'),
    async (c) => {
      try {
        const db = getDb(c.get('env'));
        
        const result = await db.query(
          `SELECT id, email, role, first_name as "firstName", 
                  last_name as "lastName", phone, created_at as "createdAt"
           FROM users
           ORDER BY created_at DESC`
        );
        
        return c.json({ users: result.rows });
      } catch (error: any) {
        console.error('List users error:', error);
        return c.json({ error: 'Failed to list users' }, 500);
      }
    }
  );

  return routes;
}
