import SignInPageClient from "./client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Logg inn",
};

export default async function SignInPage() {
    const { userId } = await auth();
    if (userId) {
        redirect("/dashboard");
    }

    return <SignInPageClient />;
}
