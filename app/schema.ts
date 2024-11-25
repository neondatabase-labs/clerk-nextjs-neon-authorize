import { InferSelectModel, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";

export const todos = pgTable(
  "todos",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    userId: text("user_id")
      .notNull()
      .default(sql`(auth.user_id())`),
    task: text("task").notNull(),
    isComplete: boolean("is_complete").notNull().default(false),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId),
    }),
  ]
);

export type Todo = InferSelectModel<typeof todos>;
