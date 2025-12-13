import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Strøen – Dashboard
      </h1>

      <p style={{ marginTop: 12 }}>
        Velkommen{user?.firstName ? `, ${user.firstName}` : ""} 👋
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Siste aktivitet</h2>
        <ul style={{ marginTop: 8, lineHeight: 1.8 }}>
          <li>• (placeholder) Nytt innlegg: “Årsmøte”</li>
          <li>• (placeholder) Event: “Julebord 2025”</li>
          <li>• (placeholder) Bilder lastet opp: “Sommerfest”</li>
        </ul>
      </section>
    </main>
  );
}