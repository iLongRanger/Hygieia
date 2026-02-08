import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`[dotenv] Failed to load ${envPath}:`, result.error.message);
} else {
  console.log(`[dotenv] Loaded env from ${envPath}`);
  console.log(`[dotenv] RESEND_API_KEY set: ${!!process.env.RESEND_API_KEY}, EMAIL_FROM: ${process.env.EMAIL_FROM}`);
}
