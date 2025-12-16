import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMember } from "@/server/auth/ensureMember";

// GET /api/posts/[postId]/comments
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> } // params is a Promise in Next.js 15
) {
    try {
        const { postId } = await params;
        const member = await ensureMember();
        if (!member) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch comments
        // For nested comments, we can fetch all and reconstruct tree on client, or fetch root comments and their children.
        // Let's fetch all threads for this post.
        const comments = await prisma.comment.findMany({
            where: {
                postId: postId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("[COMMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST /api/posts/[postId]/comments
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const { postId } = await params;
        const member = await ensureMember();
        if (!member) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { content, parentId } = body;

        if (!content) {
            return new NextResponse("Content missing", { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId: postId,
                authorId: member.id,
                parentId: parentId || undefined,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return NextResponse.json(comment);
    } catch (error) {
        console.error("[COMMENTS_CREATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
