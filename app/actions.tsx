"use server";

import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";
import { Todo } from "@/app/schema";
import { revalidatePath } from "next/cache";
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwksURL = new URL(process.env.CLERK_JWKS_URL!);
const sql = neon(process.env.DATABASE_APPLICATION_URL!);

export const verifyAuth = async (): Promise<any> => {
  try {
    const { getToken, userId } = await auth();
    const token = await getToken();
    if (!token || !userId) {
      throw new Error("Authentication is required.");
    }

    const { payload } = await jwtVerify(token, createRemoteJWKSet(jwksURL));
    const claims = JSON.stringify(payload);
    return { userId, claims };
  }
  catch (error) {
    console.error("JWT Verification failed:", error);
    throw new Error("Invalid authentication token.");
  }
};


export async function insertTodo({ newTodo }: { newTodo: string }) {
  const { userId, claims } = await verifyAuth();
  const [_, result] = await sql.transaction([
    sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    sql`INSERT INTO todos (task, user_id) VALUES (${newTodo}, ${userId}) RETURNING *`,
  ]);

  if (result.length === 0) {
    throw new Error("Failed to insert todo.");
  }

  revalidatePath("/");
}

export async function getTodos(): Promise<Array<Todo>> {
  const { userId, claims } = await verifyAuth();
  const [_, results] = await sql.transaction([
    sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    sql`SELECT * FROM todos ORDER BY inserted_at DESC`,
  ]);


  results.map((todo) => {
    // Map database fields to match the Todo type of drizzle-orm
    todo.isComplete = todo.is_complete;
    todo.insertedAt = todo.inserted_at;
    delete todo.is_complete;
    delete todo.inserted_at;
    return todo;
  });

  return results as Array<Todo>;
}

export async function deleteTodoFormAction(formData: FormData) {
  const id = formData.get("id");
  if (!id) {
    throw new Error("No id");
  }
  if (typeof id !== "string") {
    throw new Error("The id must be a string");
  }

  const { userId, claims } = await verifyAuth();
  await sql.transaction([
    sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    sql`DELETE FROM todos WHERE id = ${BigInt(id)}`,
  ]);

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

  const { userId, claims } = await verifyAuth();
  await sql.transaction([
    sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    sql`UPDATE todos SET is_complete = ${!isCompleteBool} WHERE id = ${BigInt(id)}`,
  ]);

  revalidatePath("/");
}
