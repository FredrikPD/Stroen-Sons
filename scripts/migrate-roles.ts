import "dotenv/config";
import { Role } from "@prisma/client";
import { prisma } from "../src/server/db";

console.log("DB URL exists:", !!process.env.DATABASE_URL);

async function main() {
    console.log("Starting migration...");

    // 1. Create Default Roles
    const roles = [
        {
            name: "Admin",
            description: "Administrator with full access",
            isSystem: true,
            allowedPaths: ["/admin.*"], // Regex or glob for all admin
        },
        {
            name: "Moderator",
            description: "Moderator with access to content management",
            isSystem: true,
            allowedPaths: ["/admin/events.*", "/admin/posts.*", "/admin/photos.*"],
        },
        {
            name: "Member",
            description: "Standard member",
            isSystem: true,
            allowedPaths: [],
        },
    ];

    for (const r of roles) {
        const existing = await prisma.userRole.findUnique({ where: { name: r.name } });
        if (!existing) {
            await prisma.userRole.create({ data: r });
            console.log(`Created role: ${r.name}`);
        } else {
            console.log(`Role already exists: ${r.name}`);
        }
    }

    // 2. Migrate Users
    const members = await prisma.member.findMany();
    console.log(`Found ${members.length} members to migrate.`);

    for (const member of members) {
        let roleName = "Member";
        if (member.role === Role.ADMIN) roleName = "Admin";
        if (member.role === Role.MODERATOR) roleName = "Moderator";

        const role = await prisma.userRole.findUnique({ where: { name: roleName } });
        if (role) {
            await prisma.member.update({
                where: { id: member.id },
                data: { userRoleId: role.id },
            });
            console.log(`Migrated ${member.email} to ${roleName}`);
        } else {
            console.error(`Role not found: ${roleName}`);
        }
    }

    console.log("Migration complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
