import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/server/db";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    eventImage: f({ image: { maxFileSize: "32MB", maxFileCount: 100 } })
        .input(z.object({ eventId: z.string(), fileCount: z.number().optional() }))
        // Set permissions and file types for this FileRoute
        .middleware(async ({ input }) => {
            // This code runs on your server before upload
            const user = await currentUser();

            // If you throw, the user will not be able to upload
            if (!user) throw new UploadThingError("Unauthorized");

            // Verify admin role (assuming Clerk metadata or DB check)
            // Since currentUser doesn't always have metadata depending on setup, 
            // let's check our Member model or assume basic auth is enough for now 
            // but ideally we check role.
            const member = await db.member.findUnique({
                where: { clerkId: user.id },
            });

            if (!member || member.role !== "ADMIN") {
                throw new UploadThingError("Admin access required");
            }

            // Validate File Count against System Setting
            if (input.fileCount) {
                const setting = await db.systemSetting.findUnique({ where: { key: "PHOTO_MAX_FILES" } });
                const maxFiles = setting ? parseInt(setting.value, 10) : 50;
                if (input.fileCount > maxFiles) {
                    throw new UploadThingError(`Du kan maksimalt laste opp ${maxFiles} bilder samtidig.`);
                }
            }

            // Whatever is returned here is accessible in onUploadComplete as `metadata`
            return { userId: user.id, eventId: input.eventId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for userId:", metadata.userId);
            console.log("file url", file.ufsUrl);

            // Create Photo record in DB
            await db.photo.create({
                data: {
                    url: file.ufsUrl,
                    eventId: metadata.eventId,
                    caption: file.name, // Use filename as default caption or leave empty
                },
            });

            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId, url: file.ufsUrl };
        }),

    coverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new UploadThingError("Unauthorized");
            const member = await db.member.findUnique({ where: { clerkId: user.id } });
            if (!member || member.role !== "ADMIN") throw new UploadThingError("Admin access required");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl };
        }),

    postAttachment: f({
        image: { maxFileSize: "16MB", maxFileCount: 5 },
        pdf: { maxFileSize: "16MB", maxFileCount: 5 }
    })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new UploadThingError("Unauthorized");
            // Assuming simplified auth for now as established in previous endpoints
            // but ideally checks for admin/member role.
            // Re-using the same check as coverImage for consistency if needed, 
            // or allowing all members if it's for general posts? 
            // The prompt implies "posts list" which might be open to members? 
            // But existing 'createPost' action checks 'ensureAdmin' usually? 
            // Actually 'createPost' in 'server/actions/posts.ts' - we should check that.
            // For now, let's use the same admin check as coverImage to be safe.
            const member = await db.member.findUnique({ where: { clerkId: user.id } });
            if (!member || member.role !== "ADMIN") throw new UploadThingError("Admin access required");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl, name: file.name, size: file.size, type: file.type };
        }),

    expenseReceipt: f({
        image: { maxFileSize: "16MB", maxFileCount: 1 },
        pdf: { maxFileSize: "16MB", maxFileCount: 1 }
    })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new UploadThingError("Unauthorized");
            const member = await db.member.findUnique({ where: { clerkId: user.id } });
            if (!member || member.role !== "ADMIN") throw new UploadThingError("Admin access required");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl, key: file.key, name: file.name, size: file.size, type: file.type };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
