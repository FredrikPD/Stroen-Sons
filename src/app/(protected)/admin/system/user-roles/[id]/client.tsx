"use client";

import RoleEditor from "@/components/admin/system/RoleEditor";

export default function RoleEditorClient({ id }: { id: string }) {
    return <RoleEditor id={id} />;
}
