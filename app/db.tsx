import * as schema from "@/app/schema";
import { auth } from "@clerk/nextjs/server";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

export async function fetchWithDrizzle<T>(
  callback: (
    db: Omit<
      NeonHttpDatabase<typeof schema> & {
        $client: NeonQueryFunction<false, false>;
      },
      "_" | "transaction" | "$withAuth" | "batch" | "$with" | "$client"
    >,
    { userId, authToken }: { userId: string; authToken: string }
  ) => Promise<T>
) {
  const { getToken, userId } = auth();
  const authToken = await getToken();

  if (!authToken) {
    throw new Error("No token");
  }

  if (!userId) {
    throw new Error("No userId");
  }

  const db = drizzle(neon(process.env.DATABASE_AUTHENTICATED_URL!), {
    schema,
  });
  const dbWithAuth = db.$withAuth(authToken);
  return callback(dbWithAuth, { userId, authToken });
}
