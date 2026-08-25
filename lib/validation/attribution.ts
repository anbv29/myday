import { z } from 'zod';
import { normalizePublicAttribution } from '@/lib/public/attribution';

export const publicAttributionSchema = z.string().trim().min(3).max(200).transform((value, context) => {
  const normalized = normalizePublicAttribution(value);
  if (!normalized) {
    context.addIssue({ code: 'custom', message: 'Enter a valid @handle or complete HTTPS link.' });
    return z.NEVER;
  }
  return normalized;
});
