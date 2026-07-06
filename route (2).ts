"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("ユーザー名またはパスワードが違います。");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 340,
          background: "#fff",
          borderRadius: 20,
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 20px 50px -30px rgba(20,40,80,.4)",
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: ".06em", fontSize: 16, color: "#16233d", textAlign: "center", marginBottom: 6 }}>
          CORE<span style={{ color: "#2f6bed" }}>.</span>PT 店舗管理
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5468", marginBottom: 6 }}>ユーザー名</div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} autoFocus />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5468", marginBottom: 6 }}>パスワード</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>
        {error && <div style={{ fontSize: 12, color: "#d0607a" }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting || !username || !password}
          style={{
            marginTop: 4,
            padding: 14,
            borderRadius: 13,
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: submitting || !username || !password ? "not-allowed" : "pointer",
            background: submitting || !username || !password ? "#c2c8d2" : "#16233d",
            color: "#fff",
          }}
        >
          {submitting ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1.5px solid #e0e5ee",
  borderRadius: 11,
  fontSize: 13,
  fontFamily: "inherit",
  color: "#1a2233",
  background: "#fbfcfe",
  outline: "none",
};
