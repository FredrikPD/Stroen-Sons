import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { withPrismaRetry } from "@/server/prismaResilience";

export async function ensureMember() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (!email) throw new Error("Missing email");

  // Read first (fastest)
  const existingMember = await withPrismaRetry(
    () =>
      prisma.member.findUnique({
        where: { clerkId: userId },
        include: { userRole: true },
      }),
    { operationName: "ensureMember:findByClerkId" }
  );

  if (existingMember) {
    const now = new Date();
    const shouldUpdateLastActive =
      !existingMember.lastActiveAt ||
      (now.getTime() - existingMember.lastActiveAt.getTime() > 15 * 60 * 1000);
    const nextAvatarUrl = user.imageUrl ?? null;
    const shouldSyncAvatar =
      existingMember.avatarUrl !== nextAvatarUrl;

    if (shouldUpdateLastActive || shouldSyncAvatar) {
      return await withPrismaRetry(
        () =>
          prisma.member.update({
            where: { id: existingMember.id },
            data: {
              avatarUrl: nextAvatarUrl,
              lastActiveAt: now,
            },
            include: { userRole: true },
          }),
        { operationName: "ensureMember:updateLastActiveOrAvatar" }
      );
    }
    return existingMember;
  }

  // If not found by Clerk ID, try by Email (Lazy Linking for Invited Users)
  const existingByEmail = await withPrismaRetry(
    () =>
      prisma.member.findUnique({
        where: { email },
        include: { userRole: true },
      }),
    { operationName: "ensureMember:findByEmail" }
  );

  if (existingByEmail) {
    // Link the accounts and activate
    return await withPrismaRetry(
      () =>
        prisma.member.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId: userId,
            status: "ACTIVE",
            // Update names if they were missing or placeholder?
            // Maybe better to keep what they put in Clerk?
            // Let's keep our DB as authority for now unless empty
            firstName: existingByEmail.firstName || user.firstName,
            lastName: existingByEmail.lastName || user.lastName,
            avatarUrl: user.imageUrl ?? null,
          },
          include: { userRole: true },
        }),
      { operationName: "ensureMember:linkByEmail" }
    );
  }

  // Only write if doesn't exist
  const member = await withPrismaRetry(
    () =>
      prisma.member.create({
        data: {
          clerkId: userId,
          email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.imageUrl ?? null,
          status: "ACTIVE", // Self-sign up = Active
        },
        include: { userRole: true },
      }),
    { operationName: "ensureMember:create" }
  );

  return member;
}
