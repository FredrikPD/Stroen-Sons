import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makePost, makeCategory, makeMember } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember } from "../../helpers/auth";

// posts.ts fires-and-(sometimes)-awaits these. Stub as async no-ops.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

// emails.ts side-effects — stub as async successes.
vi.mock("@/server/actions/emails", () => ({
    sendPostNotification: vi.fn(async () => ({ success: true })),
    sendPostUpdateNotification: vi.fn(async () => ({ success: true })),
    sendPaymentReminder: vi.fn(async () => ({ success: true })),
    sendBulkPaymentReminders: vi.fn(async () => ({ success: true })),
    sendEventNotification: vi.fn(async () => ({ success: true })),
    sendEventUpdateNotification: vi.fn(async () => ({ success: true }))
}));

import {
    createPost,
    deletePost,
    updatePost,
    getPosts,
    togglePinPost,
    getPinnedPosts
} from "@/server/actions/posts";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from "@/server/actions/categories";
import {
    getEventCategories,
    createEventCategory,
    updateEventCategory,
    deleteEventCategory
} from "@/server/actions/event-categories";
import { broadcastNotification } from "@/server/actions/notifications";
import { sendPostNotification, sendPostUpdateNotification } from "@/server/actions/emails";
import { revalidatePath } from "next/cache";

const validPost = () => ({
    title: "Sommerfest 2026",
    content: "Velkommen til årets sommerfest!",
    category: "NYHET"
});

// ---------------------------------------------------------------------------
// posts.ts
// ---------------------------------------------------------------------------

describe("createPost", () => {
    beforeEach(() => {
        prismaMock.post.create.mockResolvedValue(makePost({ id: "post_1" }) as never);
    });

    it("creates a post, broadcasts a POST_CREATED notification and revalidates", async () => {
        loginAsAdmin({ id: "admin_1", firstName: "Ada", lastName: "Admin" });

        const res = await createPost(validPost() as never);

        expect(res).toEqual({ success: true });
        expect(prismaMock.post.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: "Sommerfest 2026",
                    content: "Velkommen til årets sommerfest!",
                    category: "NYHET",
                    authorId: "admin_1"
                })
            })
        );
        expect(broadcastNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "POST_CREATED", link: "/posts/post_1" })
        );
        expect(revalidatePath).toHaveBeenCalledWith("/posts");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("allows a MODERATOR to create a post", async () => {
        loginAsMember({ id: "mod_1", role: "MODERATOR" });
        const res = await createPost(validPost() as never);
        expect(res.success).toBe(true);
        expect(prismaMock.post.create).toHaveBeenCalledTimes(1);
    });

    it("passes eventId through and maps attachments with a default type", async () => {
        loginAsAdmin({ id: "admin_1" });

        await createPost({
            ...validPost(),
            eventId: "event_9",
            attachments: [{ url: "https://files.example/a.pdf", name: "a.pdf", size: 100 }]
        } as never);

        const arg = prismaMock.post.create.mock.calls[0][0] as {
            data: { eventId?: string; attachments: { create: { type: string }[] } };
        };
        expect(arg.data.eventId).toBe("event_9");
        expect(arg.data.attachments.create[0].type).toBe("unknown");
    });

    it("treats an empty-string eventId as undefined (no link)", async () => {
        loginAsAdmin({ id: "admin_1" });
        await createPost({ ...validPost(), eventId: "" } as never);
        const arg = prismaMock.post.create.mock.calls[0][0] as { data: { eventId?: string } };
        expect(arg.data.eventId).toBeUndefined();
    });

    it("sends an email only when sendNotification is true", async () => {
        loginAsAdmin({ id: "admin_1", firstName: "Ada", lastName: "Admin" });
        await createPost({ ...validPost(), sendNotification: true } as never);
        expect(sendPostNotification).toHaveBeenCalledWith(
            expect.objectContaining({ postTitle: "Sommerfest 2026", authorName: "Ada Admin", postId: "post_1" })
        );
    });

    it("does not send an email when sendNotification is omitted", async () => {
        loginAsAdmin({ id: "admin_1" });
        await createPost(validPost() as never);
        expect(sendPostNotification).not.toHaveBeenCalled();
    });

    it("rejects a plain MEMBER", async () => {
        loginAsMember({ role: "MEMBER" });
        const res = await createPost(validPost() as never);
        expect(res.success).toBe(false);
        expect(res.error).toContain("tilgang");
        expect(prismaMock.post.create).not.toHaveBeenCalled();
    });

    it("rejects an unauthenticated caller (ensureMember resolves null-ish)", async () => {
        // ensureMember returns undefined → member falsy guard kicks in.
        const { ensureMemberMock } = await import("../../helpers/auth");
        ensureMemberMock.mockResolvedValue(undefined as never);
        const res = await createPost(validPost() as never);
        expect(res.success).toBe(false);
        expect(prismaMock.post.create).not.toHaveBeenCalled();
    });

    it("rejects invalid data (missing title) via zod", async () => {
        loginAsAdmin();
        const res = await createPost({ content: "x", category: "NYHET" } as never);
        expect(res.success).toBe(false);
        expect(res.error).toContain("Ugyldig data");
        expect(prismaMock.post.create).not.toHaveBeenCalled();
    });

    it("returns a friendly error when the create throws", async () => {
        loginAsAdmin();
        prismaMock.post.create.mockRejectedValue(new Error("db down"));
        const res = await createPost(validPost() as never);
        expect(res).toEqual({ success: false, error: "Kunne ikke opprette innlegg." });
        expect(broadcastNotification).not.toHaveBeenCalled();
    });
});

describe("deletePost", () => {
    it("deletes a post as ADMIN and revalidates", async () => {
        loginAsAdmin();
        prismaMock.post.delete.mockResolvedValue(makePost() as never);
        const res = await deletePost("post_del");
        expect(res).toEqual({ success: true });
        expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: "post_del" } });
        expect(revalidatePath).toHaveBeenCalledWith("/posts");
    });

    it("rejects a MODERATOR (delete is ADMIN-only)", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await deletePost("post_x");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    it("rejects a plain MEMBER", async () => {
        loginAsMember({ role: "MEMBER" });
        const res = await deletePost("post_x");
        expect(res.success).toBe(false);
        expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    it("returns a friendly error when the delete throws", async () => {
        loginAsAdmin();
        prismaMock.post.delete.mockRejectedValue(new Error("fk violation"));
        const res = await deletePost("post_x");
        expect(res).toEqual({ success: false, error: "Kunne ikke slette innlegg" });
    });
});

describe("updatePost", () => {
    beforeEach(() => {
        prismaMock.post.update.mockResolvedValue(makePost({ id: "post_u" }) as never);
    });

    it("updates a post, replaces attachments, broadcasts POST_UPDATED and revalidates", async () => {
        loginAsAdmin({ id: "admin_1", firstName: "Ada", lastName: "Admin" });

        const res = await updatePost("post_u", {
            ...validPost(),
            title: "Oppdatert tittel",
            attachments: [{ url: "https://files.example/b.pdf", name: "b.pdf", size: 5 }]
        } as never);

        expect(res).toEqual({ success: true });
        const arg = prismaMock.post.update.mock.calls[0][0] as {
            where: { id: string };
            data: { eventId: string | null; attachments: { deleteMany: object; create: unknown[] } };
        };
        expect(arg.where).toEqual({ id: "post_u" });
        expect(arg.data.eventId).toBeNull();
        expect(arg.data.attachments.deleteMany).toEqual({});
        expect(arg.data.attachments.create).toHaveLength(1);

        expect(broadcastNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "POST_UPDATED", link: "/posts/post_u" })
        );
        expect(revalidatePath).toHaveBeenCalledWith("/posts/post_u");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/posts");
    });

    it("sends an update email only when sendNotification is true", async () => {
        loginAsAdmin({ id: "admin_1", firstName: "Ada", lastName: "Admin" });
        await updatePost("post_u", { ...validPost(), sendNotification: true } as never);
        expect(sendPostUpdateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ postId: "post_u", authorName: "Ada Admin" })
        );
    });

    it("rejects a MODERATOR (update is ADMIN-only)", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await updatePost("post_u", validPost() as never);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    it("rejects invalid data via zod", async () => {
        loginAsAdmin();
        const res = await updatePost("post_u", { title: "", content: "", category: "" } as never);
        expect(res).toEqual({ success: false, error: "Invalid data" });
        expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    it("returns a friendly error and skips the broadcast when the update throws", async () => {
        loginAsAdmin();
        prismaMock.post.update.mockRejectedValue(new Error("missing row"));
        const res = await updatePost("post_u", validPost() as never);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere innlegg" });
        expect(broadcastNotification).not.toHaveBeenCalled();
    });
});

describe("getPosts", () => {
    it("returns items without a nextCursor when fewer than the limit are returned", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([makePost({ id: "p1" }), makePost({ id: "p2" })] as never);

        const res = await getPosts({ limit: 10 });
        expect(res.items).toHaveLength(2);
        expect(res.nextCursor).toBeUndefined();
    });

    it("pops the extra row and returns its id as the nextCursor", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([
            makePost({ id: "p1" }),
            makePost({ id: "p2" }),
            makePost({ id: "p3" })
        ] as never);

        const res = await getPosts({ limit: 2 });
        expect(res.items).toHaveLength(2);
        expect(res.nextCursor).toBe("p3");
    });

    it("builds a case-insensitive OR search filter", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([] as never);
        await getPosts({ search: "fest" });
        const arg = prismaMock.post.findMany.mock.calls[0][0] as { where: { OR?: unknown[] } };
        expect(arg.where.OR).toEqual([
            { title: { contains: "fest", mode: "insensitive" } },
            { content: { contains: "fest", mode: "insensitive" } }
        ]);
    });

    it("filters by category but ignores the ALL sentinel and orders by sort", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([] as never);

        await getPosts({ category: "ALL", sort: "oldest" });
        const allArg = prismaMock.post.findMany.mock.calls[0][0] as {
            where: { category?: string };
            orderBy: { createdAt: string };
        };
        expect(allArg.where.category).toBeUndefined();
        expect(allArg.orderBy.createdAt).toBe("asc");

        prismaMock.post.findMany.mockClear();
        await getPosts({ category: "NYHET" });
        const catArg = prismaMock.post.findMany.mock.calls[0][0] as { where: { category?: string } };
        expect(catArg.where.category).toBe("NYHET");
    });

    it("applies cursor pagination (skip 1, cursor set)", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([] as never);
        await getPosts({ cursor: "p_after", limit: 5 });
        const arg = prismaMock.post.findMany.mock.calls[0][0] as {
            skip: number;
            cursor: { id: string };
            take: number;
        };
        expect(arg.skip).toBe(1);
        expect(arg.cursor).toEqual({ id: "p_after" });
        expect(arg.take).toBe(6);
    });

    it("throws Unauthorized for an unauthenticated caller", async () => {
        const { ensureMemberMock } = await import("../../helpers/auth");
        ensureMemberMock.mockResolvedValue(null as never);
        await expect(getPosts()).rejects.toThrow("Unauthorized");
    });
});

describe("togglePinPost", () => {
    it("flips an unpinned post to pinned", async () => {
        loginAsAdmin();
        prismaMock.post.findUnique.mockResolvedValue(makePost({ id: "p1", isPinned: false }) as never);
        prismaMock.post.update.mockResolvedValue(makePost() as never);

        const res = await togglePinPost("p1");
        expect(res).toEqual({ success: true });
        expect(prismaMock.post.update).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: { isPinned: true }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/posts");
    });

    it("flips a pinned post to unpinned", async () => {
        loginAsAdmin();
        prismaMock.post.findUnique.mockResolvedValue(makePost({ id: "p2", isPinned: true }) as never);
        prismaMock.post.update.mockResolvedValue(makePost() as never);

        await togglePinPost("p2");
        expect(prismaMock.post.update).toHaveBeenCalledWith({
            where: { id: "p2" },
            data: { isPinned: false }
        });
    });

    it("returns not-found when the post does not exist", async () => {
        loginAsAdmin();
        prismaMock.post.findUnique.mockResolvedValue(null as never);
        const res = await togglePinPost("missing");
        expect(res).toEqual({ success: false, error: "Post not found" });
        expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    it("rejects a non-admin", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await togglePinPost("p1");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.post.findUnique).not.toHaveBeenCalled();
    });

    it("returns a friendly error when the update throws", async () => {
        loginAsAdmin();
        prismaMock.post.findUnique.mockResolvedValue(makePost({ id: "p1" }) as never);
        prismaMock.post.update.mockRejectedValue(new Error("db"));
        const res = await togglePinPost("p1");
        expect(res).toEqual({ success: false, error: "Failed to toggle pin" });
    });
});

describe("getPinnedPosts", () => {
    it("returns up to 5 pinned posts ordered newest first", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockResolvedValue([makePost({ isPinned: true })] as never);
        const res = await getPinnedPosts();
        expect(res).toHaveLength(1);
        expect(prismaMock.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { isPinned: true },
                orderBy: { createdAt: "desc" },
                take: 5
            })
        );
    });

    it("returns an empty array for an unauthenticated caller", async () => {
        const { ensureMemberMock } = await import("../../helpers/auth");
        ensureMemberMock.mockResolvedValue(null as never);
        const res = await getPinnedPosts();
        expect(res).toEqual([]);
        expect(prismaMock.post.findMany).not.toHaveBeenCalled();
    });

    it("returns an empty array when the query throws", async () => {
        loginAsMember();
        prismaMock.post.findMany.mockRejectedValue(new Error("db"));
        const res = await getPinnedPosts();
        expect(res).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// categories.ts
// ---------------------------------------------------------------------------

describe("getCategories", () => {
    it("merges post counts (matched by category name) into each category", async () => {
        loginAsAdmin();
        prismaMock.category.findMany.mockResolvedValue([
            makeCategory({ id: "c1", name: "NYHET" }),
            makeCategory({ id: "c2", name: "REFERAT" })
        ] as never);
        prismaMock.post.groupBy.mockResolvedValue([
            { category: "NYHET", _count: { _all: 3 } }
        ] as never);

        const res = await getCategories();
        expect(res.success).toBe(true);
        expect(res.data).toEqual([
            expect.objectContaining({ name: "NYHET", _count: { posts: 3 } }),
            expect.objectContaining({ name: "REFERAT", _count: { posts: 0 } })
        ]);
    });

    it("allows a MODERATOR to read", async () => {
        loginAsMember({ role: "MODERATOR" });
        prismaMock.category.findMany.mockResolvedValue([] as never);
        prismaMock.post.groupBy.mockResolvedValue([] as never);
        const res = await getCategories();
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
    });

    it("rejects a plain MEMBER with Unauthorized before any query", async () => {
        loginAsMember({ role: "MEMBER" });
        const res = await getCategories();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.category.findMany).not.toHaveBeenCalled();
        expect(prismaMock.post.groupBy).not.toHaveBeenCalled();
    });
});

describe("createCategory", () => {
    it("creates a category with the supplied color and revalidates", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(null as never);
        prismaMock.category.create.mockResolvedValue(makeCategory() as never);

        const res = await createCategory({ name: "Turer", description: "d", color: "green" });
        expect(res).toEqual({ success: true });
        expect(prismaMock.category.create).toHaveBeenCalledWith({
            data: { name: "Turer", description: "d", color: "green" }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/system/categories");
    });

    it("defaults the color to blue when none is given", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(null as never);
        prismaMock.category.create.mockResolvedValue(makeCategory() as never);

        await createCategory({ name: "Turer" });
        const arg = prismaMock.category.create.mock.calls[0][0] as { data: { color: string } };
        expect(arg.data.color).toBe("blue");
    });

    it("rejects an empty name", async () => {
        loginAsAdmin();
        const res = await createCategory({ name: "" });
        expect(res).toEqual({ success: false, error: "Navn er påkrevd" });
        expect(prismaMock.category.create).not.toHaveBeenCalled();
    });

    it("rejects a duplicate name", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ name: "Turer" }) as never);
        const res = await createCategory({ name: "Turer" });
        expect(res).toEqual({ success: false, error: "Kategorien finnes allerede" });
        expect(prismaMock.category.create).not.toHaveBeenCalled();
    });

    it("rejects a MODERATOR with Unauthorized (create is ADMIN-only)", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await createCategory({ name: "Turer" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.category.create).not.toHaveBeenCalled();
    });
});

describe("updateCategory", () => {
    it("updates the category and cascades the rename to posts when the name changes", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ id: "c1", name: "Gammelt" }) as never);
        prismaMock.category.update.mockResolvedValue(makeCategory() as never);
        prismaMock.post.updateMany.mockResolvedValue({ count: 4 } as never);

        const res = await updateCategory("c1", { name: "Nytt", color: "red" });
        expect(res).toEqual({ success: true });
        expect(prismaMock.category.update).toHaveBeenCalledWith({
            where: { id: "c1" },
            data: { name: "Nytt", description: undefined, color: "red" }
        });
        expect(prismaMock.post.updateMany).toHaveBeenCalledWith({
            where: { category: "Gammelt" },
            data: { category: "Nytt" }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/system/categories");
    });

    it("does NOT cascade to posts when the name is unchanged", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ id: "c1", name: "Samme" }) as never);
        prismaMock.category.update.mockResolvedValue(makeCategory() as never);

        const res = await updateCategory("c1", { name: "Samme", color: "blue" });
        expect(res).toEqual({ success: true });
        expect(prismaMock.post.updateMany).not.toHaveBeenCalled();
    });

    it("returns not-found when the category is missing", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(null as never);
        const res = await updateCategory("missing", { name: "X" });
        expect(res).toEqual({ success: false, error: "Fant ikke kategori" });
        expect(prismaMock.category.update).not.toHaveBeenCalled();
    });

    it("rejects a non-admin with Unauthorized before reading or writing", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await updateCategory("c1", { name: "X" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.category.update).not.toHaveBeenCalled();
        expect(prismaMock.post.updateMany).not.toHaveBeenCalled();
    });
});

describe("deleteCategory", () => {
    it("deletes an unused category", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ id: "c1", name: "Ubrukt" }) as never);
        prismaMock.post.count.mockResolvedValue(0 as never);
        prismaMock.category.delete.mockResolvedValue(makeCategory() as never);

        const res = await deleteCategory("c1");
        expect(res).toEqual({ success: true });
        expect(prismaMock.category.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/system/categories");
    });

    it("blocks deleting a category still in use", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ id: "c1", name: "Brukt" }) as never);
        prismaMock.post.count.mockResolvedValue(2 as never);

        const res = await deleteCategory("c1");
        expect(res.success).toBe(false);
        expect(res.error).toContain("2 innlegg");
        expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });

    it("returns not-found when the category is missing", async () => {
        loginAsAdmin();
        prismaMock.category.findUnique.mockResolvedValue(null as never);
        const res = await deleteCategory("missing");
        expect(res).toEqual({ success: false, error: "Fant ikke kategori" });
    });

    it("rejects a non-admin with Unauthorized before reading or deleting", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await deleteCategory("c1");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.post.count).not.toHaveBeenCalled();
        expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// event-categories.ts
// ---------------------------------------------------------------------------

describe("getEventCategories", () => {
    it("merges event counts into each event category", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findMany.mockResolvedValue([
            makeCategory({ id: "ec1", name: "SOCIAL" }),
            makeCategory({ id: "ec2", name: "TRAINING" })
        ] as never);
        prismaMock.event.groupBy.mockResolvedValue([
            { category: "SOCIAL", _count: { _all: 7 } }
        ] as never);

        const res = await getEventCategories();
        expect(res.success).toBe(true);
        expect(res.data).toEqual([
            expect.objectContaining({ name: "SOCIAL", _count: { events: 7 } }),
            expect.objectContaining({ name: "TRAINING", _count: { events: 0 } })
        ]);
    });

    it("allows a MODERATOR to read", async () => {
        loginAsMember({ role: "MODERATOR" });
        prismaMock.eventCategory.findMany.mockResolvedValue([] as never);
        prismaMock.event.groupBy.mockResolvedValue([] as never);
        const res = await getEventCategories();
        expect(res.success).toBe(true);
    });

    it("rejects a plain MEMBER with Unauthorized before any query", async () => {
        loginAsMember({ role: "MEMBER" });
        const res = await getEventCategories();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.eventCategory.findMany).not.toHaveBeenCalled();
        expect(prismaMock.event.groupBy).not.toHaveBeenCalled();
    });
});

describe("createEventCategory", () => {
    it("creates an event category and revalidates the event-categories path", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(null as never);
        prismaMock.eventCategory.create.mockResolvedValue(makeCategory() as never);

        const res = await createEventCategory({ name: "Dugnad", color: "yellow" });
        expect(res).toEqual({ success: true });
        expect(prismaMock.eventCategory.create).toHaveBeenCalledWith({
            data: { name: "Dugnad", description: undefined, color: "yellow" }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/system/event-categories");
    });

    it("defaults the color to blue", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(null as never);
        prismaMock.eventCategory.create.mockResolvedValue(makeCategory() as never);
        await createEventCategory({ name: "Dugnad" });
        const arg = prismaMock.eventCategory.create.mock.calls[0][0] as { data: { color: string } };
        expect(arg.data.color).toBe("blue");
    });

    it("rejects an empty name", async () => {
        loginAsAdmin();
        const res = await createEventCategory({ name: "" });
        expect(res).toEqual({ success: false, error: "Navn er påkrevd" });
        expect(prismaMock.eventCategory.create).not.toHaveBeenCalled();
    });

    it("rejects a duplicate name", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(makeCategory({ name: "Dugnad" }) as never);
        const res = await createEventCategory({ name: "Dugnad" });
        expect(res).toEqual({ success: false, error: "Kategorien finnes allerede" });
        expect(prismaMock.eventCategory.create).not.toHaveBeenCalled();
    });

    it("rejects a MODERATOR with Unauthorized (create is ADMIN-only)", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await createEventCategory({ name: "Dugnad" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.eventCategory.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.eventCategory.create).not.toHaveBeenCalled();
    });
});

describe("updateEventCategory", () => {
    it("updates and cascades the rename to events when the name changes", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(makeCategory({ id: "ec1", name: "Gammelt" }) as never);
        prismaMock.eventCategory.update.mockResolvedValue(makeCategory() as never);
        prismaMock.event.updateMany.mockResolvedValue({ count: 3 } as never);

        const res = await updateEventCategory("ec1", { name: "Nytt" });
        expect(res).toEqual({ success: true });
        expect(prismaMock.event.updateMany).toHaveBeenCalledWith({
            where: { category: "Gammelt" },
            data: { category: "Nytt" }
        });
    });

    it("does NOT cascade when the name is unchanged", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(makeCategory({ id: "ec1", name: "Samme" }) as never);
        prismaMock.eventCategory.update.mockResolvedValue(makeCategory() as never);
        await updateEventCategory("ec1", { name: "Samme" });
        expect(prismaMock.event.updateMany).not.toHaveBeenCalled();
    });

    it("returns not-found when missing", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(null as never);
        const res = await updateEventCategory("missing", { name: "X" });
        expect(res).toEqual({ success: false, error: "Fant ikke kategori" });
    });

    it("rejects a non-admin with Unauthorized before reading or writing", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await updateEventCategory("ec1", { name: "X" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.eventCategory.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.eventCategory.update).not.toHaveBeenCalled();
        expect(prismaMock.event.updateMany).not.toHaveBeenCalled();
    });
});

describe("deleteEventCategory", () => {
    it("deletes an unused event category", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(makeCategory({ id: "ec1", name: "Ubrukt" }) as never);
        prismaMock.event.count.mockResolvedValue(0 as never);
        prismaMock.eventCategory.delete.mockResolvedValue(makeCategory() as never);

        const res = await deleteEventCategory("ec1");
        expect(res).toEqual({ success: true });
        expect(prismaMock.eventCategory.delete).toHaveBeenCalledWith({ where: { id: "ec1" } });
    });

    it("blocks deleting an event category still in use", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(makeCategory({ id: "ec1", name: "Brukt" }) as never);
        prismaMock.event.count.mockResolvedValue(5 as never);

        const res = await deleteEventCategory("ec1");
        expect(res.success).toBe(false);
        expect(res.error).toContain("5 arrangementer");
        expect(prismaMock.eventCategory.delete).not.toHaveBeenCalled();
    });

    it("returns not-found when missing", async () => {
        loginAsAdmin();
        prismaMock.eventCategory.findUnique.mockResolvedValue(null as never);
        const res = await deleteEventCategory("missing");
        expect(res).toEqual({ success: false, error: "Fant ikke kategori" });
    });

    it("rejects a non-admin with Unauthorized before reading or deleting", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await deleteEventCategory("ec1");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.eventCategory.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.event.count).not.toHaveBeenCalled();
        expect(prismaMock.eventCategory.delete).not.toHaveBeenCalled();
    });
});
