import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  STRAPI_URL: z.string().url(),
  STRAPI_BOT_API_TOKEN: z.string().min(1),
  SUPPORT_USERNAME: z.string().optional(),
  MERCHANT_NAME: z.string().optional(),
  OFFER_URL: z.string().url().optional(),
  PRIVACY_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
