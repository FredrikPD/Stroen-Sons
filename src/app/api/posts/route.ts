import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";

// GET /api/posts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor");
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        const sort = searchParams.get("sort") || "newest";
        const category = searchParams.get("category");

        const member = await ensureMember();
        if (!member) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
            ];
        }

        if (category && category !== "ALL") {
            where.category = category;
        }

        const posts = await prisma.post.findMany({
            take: limit + 1, // Get one extra to determine if there's a next page
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where,
            orderBy: {
                createdAt: sort === "oldest" ? "asc" : "desc",
            },
            include: {
                author: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                event: {
                    select: {
                        title: true,
                        id: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
        });

        console.log(`[POSTS_GET] Found ${posts.length} posts for member ${member.id}`);

        let nextCursor: typeof cursor | undefined = undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem?.id;
        }

        return NextResponse.json({
            items: posts,
            nextCursor,
        });
    } catch (error) {
        console.error("[POSTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST /api/posts (Admin only - though prompt said no admin UI yet, backend support is good to have or we can skip for now. 
// Plan said "Create a new post (Admin only)". I will implement basic creation just to be safe and use it for seeding if needed).
export async function POST(req: NextRequest) {
    try {
        const member = await ensureMember();
        if (!member || member.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { title, content, eventId } = body;

        const post = await prisma.post.create({
            data: {
                title,
                content,
                authorId: member.id,
                eventId: eventId || undefined,
            },
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("[POSTS_CREATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
