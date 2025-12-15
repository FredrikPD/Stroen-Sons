import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuthContext(): Promise<null | { userId: string; email: string; firstName: string | null; lastName: string | null }> {


  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("Missing email");

  const firstName = user.firstName;
  const lastName = user.lastName;

  return { userId, email, firstName, lastName };
}