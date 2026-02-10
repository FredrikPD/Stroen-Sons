import { Role } from "@prisma/client";
import { ensureMember } from "./ensureMember";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkAccess } from "./checkAccess";

export async function ensureRole(allowedRoles: Role[]) {
  const member = await ensureMember();
  const headerList = await headers(); // Asynchronous in newer Next.js/React versions? Ensure compatibility.
  const currentPath = headerList.get("x-current-path");

  // 1. Dynamic Access Check (Priority)
  if (currentPath && member.userRole) {
    if (checkAccess(member.userRole, currentPath)) {
      return member;
    }
  }

  // 2. Legacy Enum Check (Fallback)
  if (!allowedRoles.includes(member.role)) {
    // If dynamic check failed AND legacy check failed, deny.
    redirect("/admin/access-denied");
  }

  return member;
}
