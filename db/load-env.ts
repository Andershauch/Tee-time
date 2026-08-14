import { config } from "dotenv";

// CLI tools do not receive Next.js' automatic .env.local loading.
config({ path: ".env.local", quiet: true });
