import { z } from 'zod';

// User schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(['admin', 'manager', 'operator']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'operator']).default('operator'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Call schemas
export const CallSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  status: z.enum(['queued', 'ringing', 'answered', 'completed', 'failed', 'missed']),
  fromNumber: z.string(),
  toNumber: z.string(),
  duration: z.number().int().nonnegative(),
  talkDuration: z.number().int().nonnegative().optional(),
  recordingUrl: z.string().url().optional(),
  transcription: z.string().optional(),
  managerId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCallSchema = CallSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).partial();

export const UpdateCallSchema = CreateCallSchema;

// Client schemas
export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateClientSchema = ClientSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const UpdateClientSchema = CreateClientSchema.partial();

// Analytics schemas
export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.startDate <= data.endDate, {
  message: 'Start date must be before end date',
});

export const ManagerStatsSchema = z.object({
  managerId: z.string().uuid(),
  managerName: z.string(),
  totalCalls: z.number().int().nonnegative(),
  answeredCalls: z.number().int().nonnegative(),
  missedCalls: z.number().int().nonnegative(),
  averageDuration: z.number().nonnegative(),
  conversionRate: z.number().min(0).max(100),
});

// Auth schemas
export const TokenPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'operator']),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type Call = z.infer<typeof CallSchema>;
export type CreateCall = z.infer<typeof CreateCallSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type CreateClient = z.infer<typeof CreateClientSchema>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
export type ManagerStats = z.infer<typeof ManagerStatsSchema>;
