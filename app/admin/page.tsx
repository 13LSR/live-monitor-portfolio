import { AdminDashboard } from "@/app/_components/admin-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "站点管理", robots: { index: false, follow: false }, alternates: { canonical: null }, openGraph: null, twitter: null };

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
