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
    console.log("Seeding posts...");

    // Get or create a member
    let author = await prisma.member.findFirst();
    if (!author) {
        console.log("Creating dummy member...");
        author = await prisma.member.create({
            data: {
                clerkId: "dummy_clerk_id_" + Date.now(),
                email: "dummy@example.com",
                firstName: "Test",
                lastName: "User",
                role: "ADMIN",
            },
        });
    }

    // Create some posts
    const post1 = await prisma.post.create({
        data: {
            title: "Velkommen til det nye forumet!",
            content: "Her kan vi diskutere alt som skjer i klubben bygge fellesskap. Gleder meg til å se hva dere deler!",
            authorId: author.id,
        },
    });

    const post2 = await prisma.post.create({
        data: {
            title: "Neste samling?",
            content: "Er det noen som vet når neste store samling blir? Jeg hørte rykter om desember, men finner ingenting i kalenderen.",
            authorId: author.id,
        },
    });

    // Create an event with a program
    const event = await prisma.event.create({
        data: {
            title: "Julebord 2023",
            description: "Årets store høydepunkt!",
            startAt: new Date("2023-12-15T18:00:00Z"),
            location: "Grand Hotel",
            address: "Karl Johans gate 31, 0159 Oslo",
            createdById: author.id,
            program: {
                create: [
                    { time: "18:00", title: "Aperitif", description: "Oppmøte i lobbyen.", order: 1 },
                    { time: "19:30", title: "Middag", description: "Tre retters middag med vinpakke.", order: 2 },
                    { time: "23:00", title: "Fest", description: "Dansegulvet åpner.", order: 3 },
                ]
            }
        }
    });

    // Add comments
    await prisma.comment.create({
        data: {
            content: "Veldig bra initiativ! Dette trengte vi.",
            postId: post1.id,
            authorId: author.id,
        },
    });

    const c2 = await prisma.comment.create({
        data: {
            content: "Sjekk arrangementer-siden, det skal ligge der nå.",
            postId: post2.id,
            authorId: author.id,
        },
    });

    // Reply
    await prisma.comment.create({
        data: {
            content: "Fant det! Takk for tipset.",
            postId: post2.id,
            authorId: author.id,
            parentId: c2.id,
        },
    });

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
