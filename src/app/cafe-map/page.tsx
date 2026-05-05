"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAFE_PROFILE_STORAGE_KEY,
  CAFE_MAP_STORAGE_KEY,
  MOCK_PUBLIC_CAFE_RECORDS,
  SAMPLE_CAFE_RECORDS,
  persistCafeRecords,
  type CafeRecord
} from "@/lib/cafeMapStorage";
const CafeMapCanvas = dynamic(() => import("@/components/CafeMapCanvas"), {
  ssr: false,
  loading: () => <div className="h-[62vh] min-h-[420px] bg-amber-100/50" />
});
const defaultCenter: [number, number] = [35.6804, 139.769];
const pairingTags = ["ケーキ", "スコーン", "チョコ", "クッキー", "タルト"];

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
  const [records, setRecords] = useState<CafeRecord[]>(SAMPLE_CAFE_RECORDS);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("位置情報を取得していません。");
  const [candidateName, setCandidateName] = useState("");
  const [candidatePlace, setCandidatePlace] = useState("");
  /** 保存するスポットの座標（現在地取得 or 地図タップで決まる。名前とは独立） */
  const [registrationCoords, setRegistrationCoords] = useState<[number, number] | null>(null);
  const [pairing, setPairing] = useState("");
  const [isPublicRecord, setIsPublicRecord] = useState(false);
  const [nickname, setNickname] = useState("Coffee Lover");
  const [displayMode, setDisplayMode] = useState<"mine" | "community" | "all">("all");
  const [editingDraft, setEditingDraft] = useState<CafeRecord | null>(null);

  useEffect(() => {
    const storedRaw = localStorage.getItem(CAFE_MAP_STORAGE_KEY);
    const profileRaw = localStorage.getItem(CAFE_PROFILE_STORAGE_KEY);
    if (profileRaw) {
      try {
        const parsedProfile = JSON.parse(profileRaw) as { nickname?: string };
        if (parsedProfile.nickname) {
          setNickname(parsedProfile.nickname);
        }
      } catch {
        setNickname("Coffee Lover");
      }
    }
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw) as CafeRecord[];
        if (parsed.length > 0) {
          setRecords(parsed);
        }
      } catch {
        setRecords(SAMPLE_CAFE_RECORDS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CAFE_PROFILE_STORAGE_KEY, JSON.stringify({ nickname }));
  }, [nickname]);

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("このブラウザは位置情報取得に対応していません。");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextPos: [number, number] = [lat, lng];
        setUserPosition(nextPos);
        setMapCenter(nextPos);
        setRegistrationCoords(nextPos);
        setLocationMessage("現在地を取得しました。右の「スポット名」で好きな名前に編集して保存できます。");

        try {
          const hint = await reverseGeocodeSuggestion(lat, lng);
          setCandidateName(hint.nameSuggestion ? `お気に入りスポット（${hint.nameSuggestion}）` : "");
          setCandidatePlace(hint.placeLabel);
        } catch {
          setCandidateName("");
          setCandidatePlace(`緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setLocationMessage("位置情報の取得に失敗しました。許可設定をご確認ください。");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const centerLabel = useMemo(
    () => `地図の中心: ${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)}`,
    [mapCenter]
  );
  const registrationLabel = useMemo(() => {
    if (!registrationCoords) {
      return "登録位置: 未設定（地図をタップするか現在地を取得）";
    }
    return `登録位置: ${registrationCoords[0].toFixed(5)}, ${registrationCoords[1].toFixed(5)}`;
  }, [registrationCoords]);

  const handleMapSelectSpot = useCallback(async (lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng];
    setRegistrationCoords(pos);
    setLocationMessage(
      "タップした位置を保存先に設定しました。名前は右側で自由に入力してください。"
    );
    const hint = await reverseGeocodeSuggestion(lat, lng);
    setCandidateName(hint.nameSuggestion ? `マイスポット（${hint.nameSuggestion}）` : "");
    setCandidatePlace(hint.placeLabel);
  }, []);
  const mapRecords = useMemo(() => {
    const own = records.map((record) => ({ ...record, isOwn: true }));
    const others = MOCK_PUBLIC_CAFE_RECORDS.map((record) => ({ ...record, isOwn: false }));
    if (displayMode === "mine") {
      return own;
    }
    if (displayMode === "community") {
      return others.filter((record) => record.isPublic);
    }
    return [...own, ...others];
  }, [records, displayMode]);
  const saveCurrentSpotRecord = () => {
    if (!registrationCoords) {
      setLocationMessage("先に地図をタップするか、「＋ ここで記録する」で位置を決めてください。");
      return;
    }
    const trimmedName = candidateName.trim();
    const next: CafeRecord = {
      id: Date.now(),
      cafeName: trimmedName || "名称未設定のスポット",
      lat: registrationCoords[0],
      lng: registrationCoords[1],
      date: new Date().toISOString().slice(0, 10),
      rating: 4,
      bean: "未入力",
      note: candidatePlace || "現在地から記録",
      foodPairing: pairing,
      isPublic: isPublicRecord,
      authorNickname: nickname,
      photoUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80"
    };
    const updated = [next, ...records];
    setRecords(updated);
    persistCafeRecords(updated);
    setLocationMessage("スポットを保存しました（ブラウザに保存されています）。");
  };
  const toggleRecordVisibility = (recordId: number) => {
    const updated = records.map((record) =>
      record.id === recordId ? { ...record, isPublic: !record.isPublic } : record
    );
    setRecords(updated);
    persistCafeRecords(updated);
  };

  const handleDeleteRecord = (record: CafeRecord) => {
    const ok = window.confirm(
      `「${record.cafeName}」のスポット記録を削除しますか？\nこの操作は取り消せません。`
    );
    if (!ok) {
      return;
    }
    const next = records.filter((item) => item.id !== record.id);
    setRecords(next);
    persistCafeRecords(next);
    if (editingDraft?.id === record.id) {
      setEditingDraft(null);
    }
  };

  const saveEditedRecord = () => {
    if (!editingDraft) {
      return;
    }
    const updated = records.map((record) =>
      record.id === editingDraft.id ? editingDraft : record
    );
    setRecords(updated);
    persistCafeRecords(updated);
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
              地図からコーヒー遍歴を振り返り、今いる場所ですぐ記録できます。
            </p>
          </div>
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-70"
            disabled={isLocating}
          >
            {isLocating ? "位置情報を取得中..." : "＋ ここで記録する"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative overflow-hidden rounded-2xl border border-amber-200">
            <div className="absolute right-3 top-3 z-[500] flex rounded-xl border border-amber-200 bg-white/95 p-1 shadow-md">
              <button
                type="button"
                onClick={() => setDisplayMode("mine")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  displayMode === "mine"
                    ? "bg-amber-700 text-white"
                    : "text-amber-900 hover:bg-amber-100"
                }`}
              >
                自分のみ
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("community")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  displayMode === "community"
                    ? "bg-amber-700 text-white"
                    : "text-amber-900 hover:bg-amber-100"
                }`}
              >
                みんなの記録
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  displayMode === "all"
                    ? "bg-amber-700 text-white"
                    : "text-amber-900 hover:bg-amber-100"
                }`}
              >
                すべて表示
              </button>
            </div>
            <p className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] rounded-xl border border-amber-200/80 bg-white/90 px-3 py-2 text-center text-xs text-amber-900/90 shadow sm:left-auto sm:right-3 sm:max-w-sm sm:text-left">
              地図をタップするとその地点に登録ピンが立ちます。位置はそのまま、右の欄で名前だけ変えて保存できます。
            </p>
            <CafeMapCanvas
              records={mapRecords}
              mapCenter={mapCenter}
              userPosition={userPosition}
              registrationCoords={registrationCoords}
              ownRecordIds={records.map((record) => record.id)}
              onToggleRecordVisibility={toggleRecordVisibility}
              onMapClick={handleMapSelectSpot}
            />
          </div>

          <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="mb-4 rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold text-amber-700">ニックネーム設定</p>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="表示名を入力"
              />
              <p className="mt-1 text-xs text-amber-900/65">
                公開記録にこのニックネームが表示されます。
              </p>
            </div>
            <h2 className="text-base font-semibold text-amber-900">スポット登録</h2>
            <p className="mt-2 text-sm text-amber-900/80">{locationMessage}</p>
            <p className="mt-1 text-xs text-amber-900/60">{registrationLabel}</p>
            <p className="mt-0.5 text-xs text-amber-900/50">{centerLabel}</p>

            <div className="mt-4 space-y-3">
              <label className="block rounded-xl border border-amber-200 bg-white p-3">
                <span className="text-xs font-semibold text-amber-700">スポット名（自由入力）</span>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(event) => setCandidateName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-950 placeholder:text-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="例: 秘密の隠れ家カフェ、お気に入りの公園ベンチ…"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs leading-relaxed text-amber-900/65">
                  緯度・経度は地図のタップ位置または現在地のままです。表示名だけここで好きな文字にできます。
                </p>
              </label>
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3">
                <p className="text-xs font-semibold text-amber-700">位置メモ（自動）</p>
                <p className="mt-1 text-sm text-amber-900">
                  {candidatePlace || "地図をタップするか現在地を取得すると、付近の地名がここに表示されます。"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-xs font-semibold text-amber-700">今日のお供（Food Pairing）</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pairingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPairing(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        pairing === tag
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
                  value={pairing}
                  onChange={(event) => setPairing(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="例: カヌレ"
                />
                <button
                  type="button"
                  onClick={saveCurrentSpotRecord}
                  className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
                >
                  この内容でカフェ記録を保存
                </button>
                <label className="mt-3 flex items-center gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    checked={isPublicRecord}
                    onChange={(event) => setIsPublicRecord(event.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                  />
                  この記録を公開する
                </label>
                <p className="mt-1 text-xs text-amber-900/65">
                  デフォルトは非公開です。公開するとコミュニティマップに表示されます。
                </p>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-semibold text-amber-900">過去の記録</h3>
            <ul className="mt-2 space-y-2">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{record.cafeName}</span>
                    <span className="text-xs text-amber-800">{record.date}</span>
                    <span className="text-xs text-amber-700">
                      {record.foodPairing ? `🍰 ${record.foodPairing}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingDraft({ ...record })}
                      className="rounded-md border border-amber-600 bg-amber-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-amber-800"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record)}
                      className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-amber-800">
                    <input
                      type="checkbox"
                      checked={Boolean(record.isPublic)}
                      onChange={() => toggleRecordVisibility(record.id)}
                      className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                    />
                    公開する
                  </label>
                </li>
              ))}
            </ul>
          </aside>
        </div>
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
                スポットを編集
              </h2>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-900 hover:bg-amber-50"
              >
                閉じる
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              位置（緯度・経度）は記録時のままです。変更する場合は一度削除してから、地図で現在地から記録し直してください。
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
                豆・ドリンク
                <input
                  type="text"
                  value={editingDraft.bean}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, bean: event.target.value } : d))
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
              <label className="flex flex-col gap-1 font-medium text-amber-900">
                写真URL
                <input
                  type="url"
                  value={editingDraft.photoUrl}
                  onChange={(event) =>
                    setEditingDraft((d) => (d ? { ...d, photoUrl: event.target.value } : d))
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <p className="text-xs text-amber-800">
                緯度 {editingDraft.lat.toFixed(5)} / 経度 {editingDraft.lng.toFixed(5)}
              </p>
              <label className="flex items-center gap-2 text-amber-900">
                <input
                  type="checkbox"
                  checked={Boolean(editingDraft.isPublic)}
                  onChange={(event) =>
                    setEditingDraft((d) =>
                      d ? { ...d, isPublic: event.target.checked } : d
                    )
                  }
                  className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                />
                この記録を公開する
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveEditedRecord}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
              >
                変更を保存
              </button>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
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
