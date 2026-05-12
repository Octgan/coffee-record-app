import { NextRequest, NextResponse } from "next/server";

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
 * カフェ記録用の「アップロード」: 画像を受け取り、検証後に data URL として返す。
 * ブラウザの localStorage に載せる前提で、クライアント側で事前圧縮することを推奨。
 */
export async function POST(request: NextRequest) {
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
