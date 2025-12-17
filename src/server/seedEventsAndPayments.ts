
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding events and payments...");

    // Get or create a member
    let member = await prisma.member.findFirst();
    if (!member) {
        console.log("Creating dummy member for seeding...");
        member = await prisma.member.create({
            data: {
                clerkId: "seeding_admin_" + Date.now(),
                email: "admin@stroensons.no",
                firstName: "Strøen",
                lastName: "Admin",
                role: "ADMIN",
            },
        });
    }

    const coverImage = "https://as2.ftcdn.net/v2/jpg/00/64/81/97/1000_F_64819783_bO18d6WGTEmDreGV8kHJd1uQ0w7ALl9n.jpg";

    // Create Events
    const event1 = await prisma.event.create({
        data: {
            title: "Julebord 2025",
            description: "Årets høydepunkt! Vi samles for god mat, drikke og stemning.",
            location: "Grand Hotel",
            startAt: new Date("2026-01-15T18:00:00Z"),
            coverImage: coverImage,
            createdById: member.id,
        },
    });

    const event2 = await prisma.event.create({
        data: {
            title: "Sommerfest 2026",
            description: "Vi griller og koser oss i parken.",
            location: "Frognerparken",
            startAt: new Date("2026-06-15T14:00:00Z"),
            coverImage: coverImage,
            createdById: member.id,
        },
    });

    console.log("Created events:", event1.title, event2.title);

    // Create Payments for the member
    // Generate payments for 2025
    const periods = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];

    for (const period of periods) {
        // Upsert to avoid unique constraint violations if re-running
        await prisma.payment.upsert({
            where: {
                memberId_period: {
                    memberId: member.id,
                    period: period
                }
            },
            update: {},
            create: {
                period,
                status: Math.random() > 0.5 ? "PAID" : "UNPAID",
                memberId: member.id
            }
        });
    }

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
