import { z } from 'zod';

export const profileSettingsSchema = z.object({
  displayName: z.string().trim().max(60, 'Use no more than 60 characters.'),
  bio: z.string().trim().max(280, 'Use no more than 280 characters.'),
}).strict();

export const notificationSettingsSchema = z.object({
  emailClaimUpdates: z.boolean(),
  emailOutbidAlerts: z.boolean(),
  emailProductUpdates: z.boolean(),
}).strict();
