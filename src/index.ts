import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Re-export all schema items for convenience
export * from "./schema";

// Export the schema object for use with drizzle
export { schema };

// Database connection singleton
let connection: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the database instance.
 * Uses DATABASE_URL environment variable for connection.
 */
export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    connection = postgres(connectionString, {
      max: 10, // Connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
    });

    dbInstance = drizzle(connection, { schema });
  }

  return dbInstance;
}

/**
 * Close the database connection.
 * Call this during graceful shutdown.
 */
export async function closeDb() {
  if (connection) {
    await connection.end();
    connection = null;
    dbInstance = null;
  }
}

// Export the db getter as default for convenience
export const db = {
  get instance() {
    return getDb();
  },
};
