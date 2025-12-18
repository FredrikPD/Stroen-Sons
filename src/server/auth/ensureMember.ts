import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";

export async function ensureMember() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("Missing email");

  // Read first (fastest)
  const existingMember = await prisma.member.findUnique({
    where: { clerkId: userId },
  });

  if (existingMember) {
    return existingMember;
  }

  // Only write if doesn't exist
  const member = await prisma.member.create({
    data: {
      clerkId: userId,
      email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  return member;
}