"use server";

import { fetchWithDrizzle } from "@/app/db";
import * as schema from "@/app/schema";
import { Todo } from "@/app/schema";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function insertTodo({ newTodo }: { newTodo: string }) {
  await fetchWithDrizzle(async (db) => {
    return db.insert(schema.todos).values({
      task: newTodo,
      isComplete: false,
    });
  });

  revalidatePath("/");
}

export async function getTodos(): Promise<Array<Todo>> {
  return fetchWithDrizzle(async (db) => {
    // WHERE filter is optional because of RLS. But we send it anyway for
    // performance reasons.
    return db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.userId, sql`auth.user_id()`))
      .orderBy(asc(schema.todos.insertedAt));
  });
}

export async function deleteTodoFormAction(formData: FormData) {
  const id = formData.get("id");
  if (!id) {
    throw new Error("No id");
  }
  if (typeof id !== "string") {
    throw new Error("The id must be a string");
  }

  await fetchWithDrizzle(async (db) => {
    return db.delete(schema.todos).where(eq(schema.todos.id, BigInt(id)));
  });

  revalidatePath("/");
}

export async function checkOrUncheckTodoFormAction(formData: FormData) {
  const id = formData.get("id");
  const isComplete = formData.get("isComplete");

  if (!id) {
    throw new Error("No id");
  }

  if (!isComplete) {
    throw new Error("No isComplete");
  }

  if (typeof id !== "string") {
    throw new Error("The id must be a string");
  }

  if (typeof isComplete !== "string") {
    throw new Error("The isComplete must be a string");
  }

  const isCompleteBool = isComplete === "true";

  await fetchWithDrizzle(async (db) => {
    return db
      .update(schema.todos)
      .set({ isComplete: !isCompleteBool })
      .where(eq(schema.todos.id, BigInt(id)))
      .returning();
  });

  revalidatePath("/");
}
