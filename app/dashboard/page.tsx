'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? null);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div style={{ padding: 24 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>Flow Dashboard</h1>
      <div style={{ opacity: 0.7, marginBottom: 24 }}>
        Logged in as: {email ?? "User"}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <Card title="Today" value="0 deals" />
        <Card title="This Week" value="0 deals" />
        <Card title="This Month" value="0 deals" />
      </div>

      <button
        onClick={() => router.push("/post-deal")}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
          fontWeight: 600
        }}
      >
        Post a Deal
      </button>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
          fontWeight: 600,
          marginLeft: 10
        }}
      >
        Log out
      </button>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, minWidth: 160 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
