
import fs from "fs";
import path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const [key, ...value] = line.split("=");
        if (key && value) {
            const val = value.join("=").trim().replace(/^["']|["']$/g, "");
            process.env[key.trim()] = val;
        }
    });
}

async function main() {
    const { db } = await import("./src/server/db");
    console.log("DB Keys:", Object.keys(db));
    const backupPath = path.resolve(process.cwd(), "backup_categories.json");

    if (!fs.existsSync(backupPath)) {
        console.error("Backup file not found!");
        process.exit(1);
    }

    const posts = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    console.log(`Restoring ${posts.length} posts...`);

    // Distinct categories to create
    const categories = new Set<string>();
    posts.forEach((p: any) => {
        if (p.category) categories.add(p.category);
    });

    console.log(`Found ${categories.size} unique categories to create.`);

    // Create Categories
    for (const name of categories) {
        const existing = await db.category.findUnique({ where: { name } });
        if (!existing) {
            await db.category.create({ data: { name } });
            console.log(`Created category: ${name}`);
        }
    }

    // Restore Post categories
    let updated = 0;
    for (const p of posts) {
        if (p.category) {
            await db.post.update({
                where: { id: p.id },
                data: { category: p.category }
            });
            updated++;
        }
    }

    console.log(`Updated ${updated} posts.`);
}

main().catch(console.error);
