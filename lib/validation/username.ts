import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters.')
  .max(20, 'Use no more than 20 characters.')
  .regex(/^[A-Za-z0-9_]+$/, 'Use only letters, numbers, and underscores.');

export const usernamePayloadSchema = z
  .object({ username: usernameSchema })
  .strict();
