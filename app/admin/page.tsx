import { AdminDashboard } from "@/app/_components/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="portfolio-surface min-h-screen px-4 py-10 text-[var(--ink)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminDashboard />
      </div>
    </main>
  );
}
