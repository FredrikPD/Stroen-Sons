
import { prisma } from "../src/server/db";
import { clerkClient } from "@clerk/nextjs/server";

async function test() {
    console.log("🚀 Starting library connectivity test...");

    // 1. Test Prisma
    try {
        console.log("Testing Prisma connection...");
        const count = await prisma.userRole.count();
        console.log(`✅ Prisma connected! Found ${count} roles.`);
    } catch (e) {
        console.error("❌ Prisma Error:", e);
    }

    // 2. Test Clerk
    try {
        console.log("Testing Clerk connection...");
        const client = await clerkClient();
        const response = await client.users.getUserList({ limit: 1 });
        console.log(`✅ Clerk connected! Fetched ${response.data.length} users.`);
    } catch (e) {
        console.error("❌ Clerk Error:", e);
    }

    process.exit(0);
}

test();
