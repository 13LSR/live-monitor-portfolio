import { AdminDashboard } from "@/app/_components/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#020617_0%,#111827_100%)] px-4 py-10 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminDashboard />
      </div>
    </main>
  );
}
