import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import type { Env, AuthenticatedUser } from '../types/index.js';
import type { User, CreateUser, LoginInput } from '../types/schemas.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: Pick<User, 'id' | 'email' | 'role'>, env: Env): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || '24h' }
  );
}

export function verifyToken(token: string, env: Env): AuthenticatedUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createUser(db: ReturnType<typeof getDb>, userData: CreateUser): Promise<User> {
  const passwordHash = await hashPassword(userData.password);
  
  const result = await db.query<User>(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, password_hash as "passwordHash", role, 
               first_name as "firstName", last_name as "lastName", phone,
               created_at as "createdAt", updated_at as "updatedAt"`,
    [userData.email, passwordHash, userData.role, userData.firstName, userData.lastName, userData.phone]
  );
  
  return result.rows[0];
}

export async function findUserByEmail(db: ReturnType<typeof getDb>, email: string): Promise<User | null> {
  const result = await db.query<User>(
    `SELECT id, email, password_hash as "passwordHash", role,
            first_name as "firstName", last_name as "lastName", phone,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );
  
  return result.rows[0] || null;
}

export async function findUserById(db: ReturnType<typeof getDb>, id: string): Promise<User | null> {
  const result = await db.query<User>(
    `SELECT id, email, password_hash as "passwordHash", role,
            first_name as "firstName", last_name as "lastName", phone,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users
     WHERE id = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}

export async function authenticateUser(
  db: ReturnType<typeof getDb>,
  credentials: LoginInput
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByEmail(db, credentials.email);
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(credentials.password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  // Generate token without password hash
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  
  return { user, token: '' }; // Token will be generated in the route handler with env
}

export async function updateUser(
  db: ReturnType<typeof getDb>,
  userId: string,
  updates: Partial<Omit<CreateUser, 'password'>> & { password?: string }
): Promise<User> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email.toLowerCase());
  }
  
  if (updates.password !== undefined) {
    const passwordHash = await hashPassword(updates.password);
    fields.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }
  
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  
  if (updates.firstName !== undefined) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(updates.firstName);
  }
  
  if (updates.lastName !== undefined) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(updates.lastName);
  }
  
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(userId);
  
  const result = await db.query<User>(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, password_hash as "passwordHash", role,
               first_name as "firstName", last_name as "lastName", phone,
               created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );
  
  if (!result.rows[0]) {
    throw new Error('User not found');
  }
  
  return result.rows[0];
}
