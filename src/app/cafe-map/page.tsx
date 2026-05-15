"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CafeMapDetailCard from "@/components/CafeMapDetailCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compressImageFileForUpload } from "@/lib/compressImageForUpload";
import {
  DEFAULT_CAFE_PHOTO_URL,
  type CafeRecord
} from "@/lib/cafeMapStorage";
import { fetchCafeRecords, syncCafeRecordsForUser, CAFE_RECORDS_UPDATED_EVENT } from "@/lib/data/cafeRecordsDb";
import { createClient } from "@/lib/supabase/client";
const CafeMapCanvas = dynamic(() => import("@/components/CafeMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[min(56vh,400px)] bg-amber-100/50" />
  )
});
const defaultCenter: [number, number] = [35.6804, 139.769];
const pairingTags = ["ケーキ", "スコーン", "チョコ", "クッキー", "タルト"];
const CAFE_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

async function reverseGeocodeSuggestion(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = (await response.json()) as {
      display_name?: string;
      address?: { road?: string; city?: string; suburb?: string };
    };
    const road = data.address?.road ?? data.address?.suburb ?? "この付近";
    const city = data.address?.city ?? "";
    return {
      nameSuggestion: `${road} 付近`,
      placeLabel: `${city}${city ? " / " : ""}${road}`
    };
  } catch {
    return {
      nameSuggestion: "",
      placeLabel: `緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`
    };
  }
}

export default function CafeMapPage() {
  const [records, setRecords] = useState<CafeRecord[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  /** ピン選択時のみ下部固定エリアに詳細カードを表示 */
  const [selectedCafeId, setSelectedCafeId] = useState<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const [candidateName, setCandidateName] = useState("");
  const [candidatePlace, setCandidatePlace] = useState("");
  /** 保存するスポットの座標（現在地取得 or 地図タップで決まる。名前とは独立） */
  const [registrationCoords, setRegistrationCoords] = useState<[number, number] | null>(null);
  const [pairing, setPairing] = useState("");
  const [editingDraft, setEditingDraft] = useState<CafeRecord | null>(null);
  /** true のときモーダルは新規ピン追加。false のとき既存レコードの編集 */
  const [editingIsNew, setEditingIsNew] = useState(false);
  const cafePhotoInputRef = useRef<HTMLInputElement>(null);
  const [cafePhotoUploading, setCafePhotoUploading] = useState(false);
  const [cafePhotoUploadError, setCafePhotoUploadError] = useState<string | null>(null);

  const handleCafePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    if (!editingDraft) {
      return;
    }

    setCafePhotoUploadError(null);
    setCafePhotoUploading(true);
    try {
      let uploadBlob: Blob;
      let uploadName = file.name?.trim() || "photo";

      try {
        uploadBlob = await compressImageFileForUpload(file);
        uploadName = uploadName.replace(/\.[^.]+$/i, "") + ".jpg";
      } catch {
        const allowed =
          file.type === "image/jpeg" ||
          file.type === "image/png" ||
          file.type === "image/webp" ||
          file.type === "image/gif";
        if (!allowed) {
          throw new Error(
            "この画像は自動縮小できませんでした。写真アプリで JPEG に書き出してから選び直してください。"
          );
        }
        if (file.size > CAFE_PHOTO_MAX_BYTES) {
          throw new Error("画像が大きすぎます（最大 6MB）。別の写真をお試しください。");
        }
        uploadBlob = file;
      }

      if (uploadBlob.size > CAFE_PHOTO_MAX_BYTES) {
        throw new Error("画像が大きすぎます（最大 6MB）。別の写真をお試しください。");
      }

      const formData = new FormData();
      formData.append("file", uploadBlob, uploadName.endsWith(".jpg") ? uploadName : `${uploadName}.jpg`);

      const response = await fetch("/api/cafe-photo", { method: "POST", body: formData });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "アップロードに失敗しました。");
      }
      if (!payload.url) {
        throw new Error("画像 URL を取得できませんでした。");
      }
      setEditingDraft((draft) => (draft ? { ...draft, photoUrl: payload.url! } : draft));
    } catch (err) {
      setCafePhotoUploadError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setCafePhotoUploading(false);
    }
  };

  const persistRemote = useCallback(async (next: CafeRecord[]) => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }
    await syncCafeRecordsForUser(supabase, user.id, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CAFE_RECORDS_UPDATED_EVENT));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        setRecords(await fetchCafeRecords(supabase));
      } catch {
        setRecords([]);
      }
    })();
  }, []);

  useEffect(() => {
    setCafePhotoUploadError(null);
  }, [editingDraft?.id]);

  const selectedCafeRecord = useMemo(() => {
    if (selectedCafeId == null) {
      return null;
    }
    return records.find((r) => r.id === selectedCafeId) ?? null;
  }, [records, selectedCafeId]);

  useEffect(() => {
    if (selectedCafeId != null && !records.some((r) => r.id === selectedCafeId)) {
      setSelectedCafeId(null);
    }
  }, [records, selectedCafeId]);

  const openNewRecordModal = useCallback(async () => {
    let lat: number;
    let lng: number;
    let name = candidateName.trim();
    let place = candidatePlace;

    if (registrationCoords) {
      lat = registrationCoords[0];
      lng = registrationCoords[1];
      if (!name || !place) {
        try {
          const hint = await reverseGeocodeSuggestion(lat, lng);
          if (!name) {
            name = hint.nameSuggestion ? `マイスポット（${hint.nameSuggestion}）` : "";
          }
          if (!place) {
            place = hint.placeLabel;
          }
        } catch {
          /* keep */
        }
      }
    } else {
      if (!navigator.geolocation) {
        return;
      }
      setIsLocating(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setUserPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setRegistrationCoords([lat, lng]);
        const hint = await reverseGeocodeSuggestion(lat, lng);
        if (!name) {
          name = hint.nameSuggestion ? `お気に入りスポット（${hint.nameSuggestion}）` : "";
        }
        if (!place) {
          place = hint.placeLabel;
        }
      } catch {
        return;
      } finally {
        setIsLocating(false);
      }
    }

    const safeName = name || "名称未設定のスポット";
    const safePlace = place || `緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`;

    setCandidateName(safeName);
    setCandidatePlace(safePlace);

    const today = new Date().toISOString().slice(0, 10);
    const nextId = Math.max(0, ...records.map((r) => r.id)) + 1;

    setEditingIsNew(true);
    setEditingDraft({
      id: nextId,
      cafeName: safeName.slice(0, 400),
      lat,
      lng,
      date: today,
      rating: 4,
      bean: "",
      note: "",
      foodPairing: pairing.trim() ? pairing.trim().slice(0, 120) : undefined,
      photoUrl: DEFAULT_CAFE_PHOTO_URL
    });
  }, [registrationCoords, candidateName, candidatePlace, pairing, records]);

  const openCafeRecordEdit = useCallback((record: CafeRecord) => {
    setEditingIsNew(false);
    setEditingDraft({ ...record });
  }, []);

  const handleMapSelectSpot = useCallback(async (lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng];
    setSelectedCafeId(null);
    setRegistrationCoords(pos);
    const hint = await reverseGeocodeSuggestion(lat, lng);
    setCandidateName(hint.nameSuggestion ? `マイスポット（${hint.nameSuggestion}）` : "");
    setCandidatePlace(hint.placeLabel);
  }, []);

  const handleDeleteRecord = useCallback(
    (record: CafeRecord) => {
      const ok = window.confirm(
        `「${record.cafeName}」のスポット記録を削除しますか？\nこの操作は取り消せません。`
      );
      if (!ok) {
        return;
      }
      setRecords((prev) => {
        const next = prev.filter((item) => item.id !== record.id);
        void persistRemote(next);
        return next;
      });
      let closedEditing = false;
      setEditingDraft((current) => {
        if (current?.id === record.id) {
          closedEditing = true;
          return null;
        }
        return current;
      });
      if (closedEditing) {
        setEditingIsNew(false);
      }
      setSelectedCafeId((id) => (id === record.id ? null : id));
    },
    [persistRemote]
  );

  const saveEditedRecord = () => {
    if (!editingDraft) {
      return;
    }
    if (editingIsNew) {
      const next = [editingDraft, ...records];
      setRecords(next);
      void persistRemote(next);
    } else {
      const updated = records.map((record) =>
        record.id === editingDraft.id ? editingDraft : record
      );
      setRecords(updated);
      void persistRemote(updated);
    }
    setEditingIsNew(false);
    setEditingDraft(null);
  };

  const closeEditModal = () => {
    setEditingIsNew(false);
    setEditingDraft(null);
  };

  return (
    <main className="min-h-screen w-full px-4 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 rounded-3xl border border-amber-900/15 bg-white/85 p-4 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Cafe Map</p>
            <h1 className="mt-1 text-3xl font-bold text-amber-950 sm:text-4xl">
              Coffee Spot Explorer
            </h1>
            <p className="mt-2 text-sm text-amber-900/80">
              地図のピンをタップして記録を確認。地図をタップして位置を決め、「＋」で新規記録を追加できます。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openNewRecordModal()}
            className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-70"
            disabled={isLocating}
          >
            {isLocating ? "位置情報を取得中..." : "＋ ここで記録する"}
          </button>
        </div>

        <motion.div className="flex min-h-[min(72vh,calc(100dvh-12rem))] flex-col overflow-hidden rounded-2xl border border-amber-200 bg-[#faf6f0]">
          <div className="relative min-h-0 flex-1">
            <CafeMapCanvas
              className="absolute inset-0 h-full w-full"
              records={records}
              mapCenter={mapCenter}
              userPosition={userPosition}
              registrationCoords={registrationCoords}
              onMapClick={handleMapSelectSpot}
              onCafeMarkerClick={(record) => setSelectedCafeId(record.id)}
            />
          </div>

          <motion.div
            layout
            className="shrink-0 border-t border-amber-200/80 bg-[#faf6f0] px-4 py-3 sm:px-5 sm:py-4"
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
          >
            <AnimatePresence mode="wait">
              {selectedCafeRecord ? (
                <CafeMapDetailCard
                  key={selectedCafeRecord.id}
                  record={selectedCafeRecord}
                  onEdit={openCafeRecordEdit}
                  onDelete={handleDeleteRecord}
                  onClose={() => setSelectedCafeId(null)}
                />
              ) : (
                <motion.p
                  key="cafe-detail-placeholder"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={reduceMotion ? undefined : { opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="min-h-10 py-1 text-center text-xs text-amber-900/45 sm:text-sm"
                >
                  地図のピンをタップすると、ここに記録の詳細が表示されます
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

      </section>

      {editingDraft && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-amber-950/40 px-4 py-6">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cafe-edit-title"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="cafe-edit-title" className="text-lg font-bold text-amber-950">
                {editingIsNew ? "新しいカフェ記録" : "スポットを編集"}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-900 hover:bg-amber-50"
              >
                閉じる
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              {editingIsNew
                ? "座標はこの画面を開いたときの位置です。変えたい場合は閉じて地図で位置を選び直してから、もう一度「＋ ここで記録する」を押してください。"
                : "位置の変更は、マップで新しく「＋ ここで記録する」から記録し直すか、いったん削除してからやり直してください。"}
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                店名
                <input
                  type="text"
                  value={editingDraft.cafeName}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, cafeName: event.target.value } : d))
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                訪問日
                <input
                  type="date"
                  value={editingDraft.date}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, date: event.target.value } : d))
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                評価（1〜5）
                <select
                  value={editingDraft.rating}
                  onChange={(event) =>
                    setEditingDraft((d) =>
                      d ? { ...d, rating: Number(event.target.value) } : d
                    )
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                <span>ドリンク / 豆の名前</span>
                <span className="text-xs font-normal text-amber-800/90">
                  メニュー名・レシピ名・銘柄など、短く書いておくとピン表示にも使われます。
                </span>
                <input
                  type="text"
                  value={editingDraft.bean}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, bean: event.target.value } : d))
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="例: アイスラテ / エチオピア イルガチェフェ"
                />
              </label>
              <div>
                <p className="font-medium text-amber-900">お供（Food Pairing）</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pairingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setEditingDraft((d) => (d ? { ...d, foodPairing: tag } : d))
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        editingDraft.foodPairing === tag
                          ? "bg-amber-700 text-white"
                          : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editingDraft.foodPairing ?? ""}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, foodPairing: event.target.value } : d))
                  }
                  className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="自由入力"
                />
              </div>
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                メモ
                <textarea
                  value={editingDraft.note}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, note: event.target.value } : d))
                  }
                  rows={3}
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-amber-900">写真URL</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    type="text"
                    inputMode="url"
                    value={editingDraft.photoUrl}
                    onChange={(event) =>
                      setEditingDraft((d) => (d ? { ...d, photoUrl: event.target.value } : d))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="https://… またはアップロードで自動入力"
                  />
                  <input
                    ref={cafePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="アルバムから写真を選ぶ"
                    onChange={handleCafePhotoFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => cafePhotoInputRef.current?.click()}
                    disabled={cafePhotoUploading}
                    className="shrink-0 rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cafePhotoUploading ? "アップロード中…" : "アルバムから選ぶ"}
                  </button>
                </div>
                <p className="text-xs text-amber-800/90">
                  スマホの写真を選ぶとサーバーへ一度送られ、URL 欄に自動で入ります（このアプリ内の保存用です）。
                </p>
                {cafePhotoUploadError && (
                  <p className="text-xs font-medium text-red-700">{cafePhotoUploadError}</p>
                )}
              </div>
              <p className="text-xs text-amber-800">
                緯度 {editingDraft.lat.toFixed(5)} / 経度 {editingDraft.lng.toFixed(5)}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveEditedRecord}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
              >
                {editingIsNew ? "保存" : "変更を保存"}
              </button>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
