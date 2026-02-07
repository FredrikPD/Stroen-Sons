import "server-only";
import { Role } from "@prisma/client";
import { ensureMember } from "./ensureMember";
import { redirect } from "next/navigation";

export async function ensureRole(allowedRoles: Role[]) {
  const member = await ensureMember();

  if (!allowedRoles.includes(member.role)) {
    redirect("/dashboard");
  }

  return member;
}
