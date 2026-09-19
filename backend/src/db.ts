import 'dotenv/config';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || '';
const useSsl = process.env.DATABASE_SSL === 'true' || (databaseUrl.includes('sslmode=require') || databaseUrl.includes('supabase.co'));

const client = postgres(databaseUrl, { 
  ssl: useSsl ? "require" : false,
  max: 10,
});

export const db = drizzle(client, { schema });

