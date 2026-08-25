import { z } from 'zod';
import { isIsoCalendarDate } from '@/lib/public/format';
import { publicAttributionSchema } from '@/lib/validation/attribution';

export const claimVisibilitySchema = z.enum(['public', 'unlisted', 'private']);

export const claimCheckoutSchema = z.object({
  date: z.string().refine(isIsoCalendarDate, 'Choose a valid calendar date.'),
  title: z.string().trim().min(3, 'Use at least 3 characters.').max(100, 'Use no more than 100 characters.'),
  story: z.string().trim().min(3, 'Use at least 3 characters.').max(1000, 'Use no more than 1,000 characters.'),
  attribution: publicAttributionSchema,
  visibility: claimVisibilitySchema,
  amountMinor: z.number().int().min(1).max(100_000_000),
  billingCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Choose a valid billing country.'),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/, 'Invalid checkout request.'),
}).strict();

export type ClaimCheckoutInput = z.infer<typeof claimCheckoutSchema>;
