import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";

export async function ensureMember() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (!email) throw new Error("Missing email");

  // Read first (fastest)
  const existingMember = await prisma.member.findUnique({
    where: { clerkId: userId },
    include: { userRole: true },
  });

  if (existingMember) {
    // Update last active if > 15 min ago to reduce writes
    const now = new Date();
    // Check if lastActiveAt exists (it sits on the type now) and if it's old enough
    if (!existingMember.lastActiveAt || (now.getTime() - existingMember.lastActiveAt.getTime() > 15 * 60 * 1000)) {
      await prisma.member.update({
        where: { id: existingMember.id },
        data: {
          lastActiveAt: now,
        }
      });
    }
    return existingMember;
  }

  // If not found by Clerk ID, try by Email (Lazy Linking for Invited Users)
  const existingByEmail = await prisma.member.findUnique({
    where: { email },
    include: { userRole: true },
  });

  if (existingByEmail) {
    // Link the accounts and activate
    return await prisma.member.update({
      where: { id: existingByEmail.id },
      data: {
        clerkId: userId,
        status: "ACTIVE",
        // Update names if they were missing or placeholder?
        // Maybe better to keep what they put in Clerk?
        // Let's keep our DB as authority for now unless empty
        firstName: existingByEmail.firstName || user.firstName,
        lastName: existingByEmail.lastName || user.lastName,
      },
      include: { userRole: true },
    });
  }

  // Only write if doesn't exist
  const member = await prisma.member.create({
    data: {
      clerkId: userId,
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: "ACTIVE", // Self-sign up = Active
    },
    include: { userRole: true },
  });

  return member;
}