"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  CAFE_PROFILE_STORAGE_KEY,
  CAFE_MAP_STORAGE_KEY,
  MOCK_PUBLIC_CAFE_RECORDS,
  SAMPLE_CAFE_RECORDS,
  type CafeRecord
} from "@/lib/cafeMapStorage";
const CafeMapCanvas = dynamic(() => import("@/components/CafeMapCanvas"), {
  ssr: false,
  loading: () => <div className="h-[62vh] min-h-[420px] bg-amber-100/50" />
});
const defaultCenter: [number, number] = [35.6804, 139.769];
const pairingTags = ["ケーキ", "スコーン", "チョコ", "クッキー", "タルト"];

export default function CafeMapPage() {
  const [records, setRecords] = useState<CafeRecord[]>(SAMPLE_CAFE_RECORDS);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("位置情報を取得していません。");
  const [candidateName, setCandidateName] = useState("");
  const [candidatePlace, setCandidatePlace] = useState("");
  const [pairing, setPairing] = useState("");
  const [isPublicRecord, setIsPublicRecord] = useState(false);
  const [nickname, setNickname] = useState("Coffee Lover");
  const [displayMode, setDisplayMode] = useState<"mine" | "community" | "all">("all");

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
        setLocationMessage("現在地を取得しました。");

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );
          const data = (await response.json()) as {
            display_name?: string;
            address?: { road?: string; city?: string; suburb?: string };
          };
          const road = data.address?.road ?? data.address?.suburb ?? "現在地付近";
          const city = data.address?.city ?? "";
          setCandidateName(`Cafe near ${road}`);
          setCandidatePlace(`${city}${city ? " / " : ""}${road}`);
        } catch {
          setCandidateName("Current Location Cafe");
          setCandidatePlace(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
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
    () => `現在中心: ${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)}`,
    [mapCenter]
  );
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
    if (!userPosition) {
      setLocationMessage("先に現在地を取得してください。");
      return;
    }
    const next: CafeRecord = {
      id: Date.now(),
      cafeName: candidateName || "Current Location Cafe",
      lat: userPosition[0],
      lng: userPosition[1],
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
    localStorage.setItem(CAFE_MAP_STORAGE_KEY, JSON.stringify(updated));
    setLocationMessage("現在地のカフェ記録を保存しました。");
  };
  const toggleRecordVisibility = (recordId: number) => {
    const updated = records.map((record) =>
      record.id === recordId ? { ...record, isPublic: !record.isPublic } : record
    );
    setRecords(updated);
    localStorage.setItem(CAFE_MAP_STORAGE_KEY, JSON.stringify(updated));
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
            <CafeMapCanvas
              records={mapRecords}
              mapCenter={mapCenter}
              userPosition={userPosition}
              ownRecordIds={records.map((record) => record.id)}
              onToggleRecordVisibility={toggleRecordVisibility}
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
            <h2 className="text-base font-semibold text-amber-900">現在地から記録候補</h2>
            <p className="mt-2 text-sm text-amber-900/80">{locationMessage}</p>
            <p className="mt-1 text-xs text-amber-900/60">{centerLabel}</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-xs font-semibold text-amber-700">店名候補</p>
                <p className="mt-1 text-sm text-amber-900">
                  {candidateName || "位置情報取得後に自動入力されます。"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-xs font-semibold text-amber-700">場所候補</p>
                <p className="mt-1 text-sm text-amber-900">
                  {candidatePlace || "位置情報取得後に住所候補を表示します。"}
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
    </main>
  );
}
