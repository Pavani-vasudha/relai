import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedAdminUser() {
  try {
    const [{ value }] = await db.select({ value: count() }).from(usersTable);
    if (Number(value) > 0) return;

    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(usersTable).values({
      fullName: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    });

    logger.info("Seeded default admin user (admin@example.com / admin123)");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}
