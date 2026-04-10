import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "ai_asset_validator",
  password: "Pavani@22",
  port: 5432,
});