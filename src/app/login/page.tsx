"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginFieldsProps = {
  nextPath: string;
  showConfigInstructions: boolean;
  showAuthError: boolean;
};

/**
 * useSearchParams を使う親と状態を分離し、タブ切替（mode）がリセットされないようにする。
 */
function LoginFields({ nextPath, showConfigInstructions, showAuthError }: LoginFieldsProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setMessage(
        "Supabase の設定を読み込めませんでした。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を書き、開発サーバー（npm run dev）を再起動してください。"
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          }
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage(
          "確認メールを送信しました（Supabase でメール確認を有効にしている場合）。メール内のリンクを開くか、そのままログインをお試しください。"
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        router.replace(nextPath.startsWith("/") ? nextPath : "/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel =
    loading ? "処理中…" : mode === "signup" ? "新規登録する" : "ログインする";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100/80 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-amber-900/15 bg-white/95 p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-amber-950">Coffee Record</h1>
        <p className="mt-2 text-center text-sm text-amber-900/75">ログインして自分の記録だけを表示・保存します</p>

        {showAuthError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            認証に失敗しました。もう一度お試しください。
          </p>
        )}
        {showConfigInstructions && (
          <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950">
            環境変数が未設定のためここにリダイレクトされました。Supabase のプロジェクト URL と anon
            キーを .env.local に設定し、開発サーバーを再起動してください。
          </p>
        )}

        <div className="mt-6 flex rounded-xl border border-amber-200 p-1" role="tablist" aria-label="ログインまたは新規登録">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => {
              setMode("signin");
              setMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signin" ? "bg-amber-700 text-white" : "text-amber-900 hover:bg-amber-50"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signup" ? "bg-amber-700 text-white" : "text-amber-900 hover:bg-amber-50"
            }`}
          >
            新規登録
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-amber-900">
            メールアドレス
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2.5 text-base text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="block text-sm font-medium text-amber-900">
            パスワード
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2.5 text-base text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          {message && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>
          )}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-amber-800/70">
          認証は Supabase Auth です。未ログインでは記録の閲覧・保存はできません。
        </p>
      </div>
    </main>
  );
}

function LoginSearchParamsBridge() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");

  return (
    <LoginFields
      nextPath={nextPath}
      showConfigInstructions={errorParam === "config"}
      showAuthError={errorParam === "auth"}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-amber-50 px-4">
          <p className="text-sm font-medium text-amber-900">読み込み中…</p>
        </main>
      }
    >
      <LoginSearchParamsBridge />
    </Suspense>
  );
}
