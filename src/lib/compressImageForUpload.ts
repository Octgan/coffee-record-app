/**
 * アルバム画像をアップロード用に軽量化（長辺を縮小し JPEG 化）。
 * createImageBitmap 非対応時は呼び出し側で元ファイルへフォールバックする想定。
 */
export async function compressImageFileForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.82;

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
        "image/jpeg",
        quality
      );
    });
    return blob;
  } finally {
    bitmap.close();
  }
}
