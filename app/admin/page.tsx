import { AdminDashboard } from "@/app/_components/admin-dashboard";

import "../_styles/admin.css";

export default function AdminPage() {
  return (
    <main className="portfolio-surface admin-page min-h-screen text-[var(--ink)]">
      <div className="admin-page__inner">
        <AdminDashboard />
      </div>
    </main>
  );
}
