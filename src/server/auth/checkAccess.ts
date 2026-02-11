import "server-only";
import { UserRole } from "@prisma/client";

/**
 * Checks if a user role has access to a specific path.
 * Supports wildcards (*) at the end of the path.
 * @param role The user's role object
 * @param path The path to check access for
 * @returns boolean
 */
export function checkAccess(role: UserRole | null | undefined, path: string): boolean {
    if (!role) return false;

    // System admins might have implicit access, but let's rely on allowedPaths for now.
    // Or hardcode Admin bypass?
    if (role.name === "Admin") return true;

    if (!role.allowedPaths || role.allowedPaths.length === 0) return false;

    // Special case for the main Admin Dashboard link
    // If user requests "/admin" or "/admin/dashboard", allow if they have access to ANY path starting with "/admin"
    if (path === "/admin" || path === "/admin/dashboard") {
        return role.allowedPaths.some(pattern => pattern.startsWith("/admin") || pattern === "*" || pattern === "/admin");
    }

    return role.allowedPaths.some(pattern => {
        // Regex conversion for simple wildcards
        // e.g. "/admin/events.*" matches "/admin/events", "/admin/events/new", etc.
        // We assume the pattern is a regex string or simple glob.
        // Let's assume regex for now as per migration script.
        try {
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(path);
        } catch (e) {
            console.error("Invalid regex in role allowedPaths:", pattern);
            return false;
        }
    });
}
