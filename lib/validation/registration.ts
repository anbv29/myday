import { z } from 'zod';
import { claimCheckoutSchema } from '@/lib/validation/claim';

export const freeRegistrationSchema = claimCheckoutSchema.pick({
  date: true, title: true, story: true, attribution: true,
}).extend({
  date: claimCheckoutSchema.shape.date.refine(
    (date) => date >= '1900-01-01' && date <= '2100-12-31',
    'Choose a date between 1900 and 2100.',
  ),
  consent: z.literal(true, { error: 'Confirm that this registration is public and replaceable.' }),
}).strict();
