import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";

const MAX_BYTES = 6 * 1024 * 1024;

function isAllowedImageType(mime: string): boolean {
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "image/gif"
  );
}

/**
 * カフェ／抽出記録用: 画像を検証後 data URL として返す（ログインユーザーのみ）。
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "サーバー設定が不完全です。" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "フォームの解析に失敗しました。" }, { status: 400 });
  }

  const entry = formData.get("file");
  if (!entry || !(entry instanceof File)) {
    return NextResponse.json({ error: "画像ファイルを選択してください。" }, { status: 400 });
  }

  const mime = entry.type || "application/octet-stream";
  if (!mime.startsWith("image/") || !isAllowedImageType(mime)) {
    return NextResponse.json(
      { error: "対応形式は JPEG / PNG / WebP / GIF です。" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await entry.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "空のファイルです。" }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: `ファイルが大きすぎます（最大 ${MAX_BYTES / (1024 * 1024)}MB）。` },
      { status: 400 }
    );
  }

  const base64 = buffer.toString("base64");
  const url = `data:${mime};base64,${base64}`;
  return NextResponse.json({ url });
}
