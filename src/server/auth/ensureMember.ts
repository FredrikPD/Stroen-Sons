import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function ensureMember() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("Missing email");

  // Opprett hvis ikke finnes
  const member = await prisma.member.upsert({
    where: { clerkId: userId },
    update: { email, firstName: user.firstName, lastName: user.lastName },
    create: { clerkId: userId, email, firstName: user.firstName, lastName: user.lastName },
  });

  return member;
}