import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_URL?.replace('https://', 'postgresql://postgres:') + `@db.${process.env.SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`,
    ssl: 'require'
  },
});
