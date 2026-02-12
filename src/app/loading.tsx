import { LoadingState } from "@/components/ui/LoadingState";

export default function RootLoading() {
    return (
        <div className="min-h-[100dvh] bg-background-main px-6">
            <LoadingState className="min-h-[100dvh]" />
        </div>
    );
}
