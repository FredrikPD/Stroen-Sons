import { Metadata } from "next";
import PostList from "@/components/posts/PostList";

export const metadata: Metadata = {
    title: "Innlegg | Strøen Søns",
    description: "Nyheter og oppdateringer fra klubben.",
};

export default function PostsPage() {
    return (
        <div className="w-full">
            {/* PostList now contains the header */}
            <PostList />
        </div>
    );
}
