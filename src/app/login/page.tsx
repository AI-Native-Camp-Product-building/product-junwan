"use client";

import * as React from "react";
import { landingContent } from "@/config/content";

export default function LoginPage() {
  const [id, setId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      // 로그인 성공 → 대시보드로 이동 (추후 구현)
      window.location.href = "/";
    } catch {
      setError("서버에 연결할 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Background bloom */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(100,149,237,0.12) 0%, transparent 55%)",
          animation: "pulse-bloom 5s ease-in-out infinite",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1
            className="text-3xl font-bold tracking-tight text-white/95"
            style={{ textShadow: "0 0 40px rgba(100,149,237,0.3)" }}
          >
            {landingContent.productName}
          </h1>
          <p className="mt-2 text-sm text-white/40">로그인하여 대시보드에 접속하세요</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="id" className="text-xs font-medium tracking-wide text-white/50">
              아이디
            </label>
            <input
              id="id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ID를 입력하세요"
              required
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 backdrop-blur-md outline-none transition-colors focus:border-[rgba(100,149,237,0.4)] focus:shadow-[0_0_20px_rgba(100,149,237,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-medium tracking-wide text-white/50">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 backdrop-blur-md outline-none transition-colors focus:border-[rgba(100,149,237,0.4)] focus:shadow-[0_0_20px_rgba(100,149,237,0.1)]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400/80">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-medium text-white/95 backdrop-blur-md transition-all duration-300 hover:border-white/35 hover:shadow-[0_0_40px_rgba(100,149,237,0.2),inset_0_0_20px_rgba(100,149,237,0.06)] disabled:opacity-50"
            style={{
              boxShadow: "0 0 20px rgba(100,149,237,0.1), inset 0 0 15px rgba(100,149,237,0.04)",
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs text-white/20">OR</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Google OAuth placeholder */}
        <button
          disabled
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/40 backdrop-blur-md transition-all duration-300 hover:border-white/15 hover:text-white/60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google로 로그인 (준비 중)
        </button>
      </div>
    </div>
  );
}
