"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { upsertCafeRecordForBrewLog } from "@/lib/cafeMapStorage";
import { COFFEE_ORIGINS, ORIGIN_STORAGE_KEY } from "@/lib/coffeeOrigins";
import {
  loadBrewLogsFromStorage,
  persistBrewLogs,
  type StoredBrewLog
} from "@/lib/brewLogStorage";
import { compressImageFileForUpload } from "@/lib/compressImageForUpload";

const brewMethods = [
  "ハンドドリップ",
  "エスプレッソ",
  "フレンチプレス",
  "サイフォン",
  "ネルドリップ",
  "コールドブリュー",
  "エアロプレス"
];
const brewMethodCards: { value: string; label: string; icon: React.ReactNode }[] = [
  {
    value: "ハンドドリップ",
    label: "ハンドドリップ",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <path d="M14 8h20l-2 10H16L14 8Z" strokeWidth="1.8" />
        <path d="M16 18h16l-3 12H19l-3-12Z" strokeWidth="1.8" />
        <path d="M22 30v10M26 30v10" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "エスプレッソ",
    label: "エスプレッソ",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <rect x="10" y="18" width="18" height="14" rx="3" strokeWidth="1.8" />
        <path d="M28 21h6a3 3 0 0 1 0 6h-6" strokeWidth="1.8" />
        <path d="M12 35h24" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "フレンチプレス",
    label: "フレンチプレス",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <rect x="14" y="10" width="18" height="26" rx="3" strokeWidth="1.8" />
        <path d="M32 14h4v16h-4M23 10v-3m0 3v6m0 20v5" strokeWidth="1.8" />
        <path d="M18 22h10" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "サイフォン",
    label: "サイフォン",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <circle cx="24" cy="33" r="7" strokeWidth="1.8" />
        <path d="M24 10v16M19 10h10M20 18h8" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "ネルドリップ",
    label: "ネルドリップ",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <path d="M14 12h20l-5 12H19l-5-12Z" strokeWidth="1.8" />
        <path d="M24 24v14" strokeWidth="1.8" />
        <path d="M17 38h14" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "コールドブリュー",
    label: "コールドブリュー",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <rect x="14" y="10" width="20" height="28" rx="4" strokeWidth="1.8" />
        <path d="M20 10V7m8 3V7M19 21h10" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    value: "エアロプレス",
    label: "エアロプレス",
    icon: (
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor">
        <rect x="16" y="8" width="16" height="10" rx="2" strokeWidth="1.8" />
        <rect x="14" y="18" width="20" height="14" rx="3" strokeWidth="1.8" />
        <path d="M18 32h12v6H18z" strokeWidth="1.8" />
      </svg>
    )
  }
];
const grindSizes = ["極細挽き", "細挽き", "中細挽き", "中挽き", "粗挽き"];
const roastLevels = ["浅煎り", "中煎り", "中深煎り", "深煎り"];
const stars = [1, 2, 3, 4, 5];
const pairingTags = ["ケーキ", "スコーン", "チョコ", "クッキー", "どら焼き"];
const BREW_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

const flavorFamilies = [
  {
    id: "fruity",
    label: "Fruity",
    hint: "果実感・酸のニュアンス",
    cardClass: "border-rose-300 bg-rose-50 text-rose-900",
    activeClass: "border-rose-500 bg-rose-200",
    chipClass: "bg-rose-100 text-rose-900",
    items: ["Berry", "Dried Fruit", "Citrus Fruit", "Apple", "Tropical Fruit"]
  },
  {
    id: "floral",
    label: "Floral",
    hint: "花やハーブの香り",
    cardClass: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900",
    activeClass: "border-fuchsia-500 bg-fuchsia-200",
    chipClass: "bg-fuchsia-100 text-fuchsia-900",
    items: ["Black Tea", "Chamomile", "Rose", "Jasmine"]
  },
  {
    id: "roasted",
    label: "Roasted",
    hint: "焙煎由来の香ばしさ",
    cardClass: "border-amber-400 bg-amber-50 text-amber-900",
    activeClass: "border-amber-600 bg-amber-200",
    chipClass: "bg-amber-100 text-amber-900",
    items: ["Cacao", "Dark Chocolate", "Nutty", "Toasty", "Caramelized"]
  },
  {
    id: "sweet",
    label: "Sweet",
    hint: "甘さ・糖の印象",
    cardClass: "border-yellow-300 bg-yellow-50 text-yellow-900",
    activeClass: "border-yellow-500 bg-yellow-200",
    chipClass: "bg-yellow-100 text-yellow-900",
    items: ["Honey", "Brown Sugar", "Vanilla", "Maple Syrup"]
  },
  {
    id: "green",
    label: "Green/Vegetative",
    hint: "青さ・植物感",
    cardClass: "border-emerald-300 bg-emerald-50 text-emerald-900",
    activeClass: "border-emerald-500 bg-emerald-200",
    chipClass: "bg-emerald-100 text-emerald-900",
    items: ["Fresh Herb", "Green Tea", "Vegetative", "Hay-like"]
  }
] as const;

function familyIdsFromFlavors(flavors: string[]) {
  const ids = flavorFamilies
    .filter((family) => family.items.some((name) => flavors.includes(name)))
    .map((family) => family.id);
  return ids.length > 0 ? ids : [flavorFamilies[0].id];
}

function BrewNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");
  const editingId =
    editParam != null && editParam.trim() !== "" && !Number.isNaN(Number(editParam))
      ? Number(editParam)
      : null;

  const [mode, setMode] = useState<"beginner" | "pro">("beginner");
  const [brewMethod, setBrewMethod] = useState<string>(brewMethods[0]);
  const [beanName, setBeanName] = useState<string>("");
  const [roastery, setRoastery] = useState<string>("");
  const [roastLevel, setRoastLevel] = useState<string>(roastLevels[0]);
  const [brewDate, setBrewDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [originEntries, setOriginEntries] = useState<
    { id: number; country: string; ratio: string }[]
  >([{ id: Date.now(), country: COFFEE_ORIGINS[0].value, ratio: "" }]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([
    flavorFamilies[0].id
  ]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [aftertaste, setAftertaste] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [overallRating, setOverallRating] = useState<number>(4);
  const [foodPairing, setFoodPairing] = useState<string>("");
  const [equipmentName, setEquipmentName] = useState<string>("");
  const [filterRinse, setFilterRinse] = useState<boolean>(false);
  const [rdtDone, setRdtDone] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [cafeLinkCoords, setCafeLinkCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [brewPhotoUrl, setBrewPhotoUrl] = useState("");
  const [brewPhotoUploading, setBrewPhotoUploading] = useState(false);
  const [brewPhotoError, setBrewPhotoError] = useState<string | null>(null);
  const brewPhotoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevEditingIdRef = useRef<number | null>(null);
  const selectedFamilies = flavorFamilies.filter((family) =>
    selectedFamilyIds.includes(family.id)
  );

  const resetToNewBrewDefaults = useCallback(() => {
    setMode("beginner");
    setBrewMethod(brewMethods[0]);
    setBeanName("");
    setRoastery("");
    setRoastLevel(roastLevels[0]);
    setBrewDate(new Date().toISOString().slice(0, 10));
    setOriginEntries([{ id: Date.now(), country: COFFEE_ORIGINS[0].value, ratio: "" }]);
    setSelectedFamilyIds([flavorFamilies[0].id]);
    setSelectedFlavors([]);
    setAftertaste("");
    setMemo("");
    setOverallRating(4);
    setFoodPairing("");
    setEquipmentName("");
    setFilterRinse(false);
    setRdtDone(false);
    setSaveMessage("");
    setFormDirty(false);
    setCafeLinkCoords(null);
    setBrewPhotoUrl("");
    setBrewPhotoError(null);
  }, []);

  useEffect(() => {
    if (editingId == null) {
      if (prevEditingIdRef.current != null) {
        resetToNewBrewDefaults();
      }
      prevEditingIdRef.current = null;
      return;
    }
    prevEditingIdRef.current = editingId;
    const logs = loadBrewLogsFromStorage();
    const log = logs.find((item) => item.id === editingId);
    if (!log) {
      setSaveMessage("指定の記録が見つかりませんでした。履歴から開き直してください。");
      return;
    }
    setSaveMessage("");
    setBrewMethod(brewMethods.includes(log.method) ? log.method : brewMethods[0]);
    setBeanName(log.beanName === "未入力" ? "" : log.beanName);
    setRoastery(log.roastery === "未入力" ? "" : log.roastery);
    setRoastLevel(roastLevels.includes(log.roastLevel) ? log.roastLevel : roastLevels[0]);
    setBrewDate(log.date);
    const origins =
      log.origins && log.origins.length > 0
        ? log.origins.map((entry, index) => ({
            id: Date.now() + index,
            country: entry.country,
            ratio: entry.ratio
          }))
        : [{ id: Date.now(), country: log.originCountry, ratio: "" }];
    setOriginEntries(origins);
    const flavors = log.flavors ?? [];
    setSelectedFlavors(flavors);
    setSelectedFamilyIds(familyIdsFromFlavors(flavors));
    setAftertaste(log.aftertaste);
    setMemo(log.memo);
    setOverallRating(
      log.overallRating >= 1 && log.overallRating <= 5 ? log.overallRating : 4
    );
    setFoodPairing(log.foodPairing ?? "");
    setEquipmentName(log.equipmentName ?? "");
    setFilterRinse(Boolean(log.filterRinse));
    setRdtDone(Boolean(log.rdtDone));
    const usePro =
      Boolean(log.equipmentName) ||
      Boolean(log.filterRinse) ||
      Boolean(log.rdtDone) ||
      flavors.length > 0;
    setMode(usePro ? "pro" : "beginner");
    const lat = log.cafeLat;
    const lng = log.cafeLng;
    if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
      setCafeLinkCoords({ lat, lng });
    } else {
      setCafeLinkCoords(null);
    }
    setBrewPhotoUrl(log.brewPhotoUrl ?? "");
    setBrewPhotoError(null);
    setFormDirty(false);
  }, [editingId, resetToNewBrewDefaults]);

  useEffect(() => {
    if (editingId != null) {
      return;
    }
    if (searchParams.get("from") !== "cafe-map") {
      return;
    }

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCafeLinkCoords({ lat, lng });
    }

    const cafe = searchParams.get("cafe");
    if (cafe) {
      setRoastery(cafe);
    }
    const place = searchParams.get("place");
    if (place) {
      setMemo((prev) => (prev.trim() === "" ? place : prev));
    }
    const pairingParam = searchParams.get("pairing");
    if (pairingParam) {
      setFoodPairing(pairingParam);
    }

    router.replace("/brew/new", { scroll: false });
  }, [editingId, searchParams, router]);

  useEffect(() => {
    const el = formRef.current;
    if (!el) {
      return;
    }
    const markDirty = () => setFormDirty(true);
    el.addEventListener("input", markDirty, true);
    el.addEventListener("change", markDirty, true);
    return () => {
      el.removeEventListener("input", markDirty, true);
      el.removeEventListener("change", markDirty, true);
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!formDirty || isSaving) {
        return;
      }
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formDirty, isSaving]);

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors((prev) =>
      prev.includes(flavor) ? prev.filter((item) => item !== flavor) : [...prev, flavor]
    );
  };
  const toggleFlavorFamily = (familyId: string) => {
    setSelectedFamilyIds((prev) =>
      prev.includes(familyId)
        ? prev.filter((item) => item !== familyId)
        : [...prev, familyId]
    );
  };
  const getFlavorChipClass = (flavor: string) => {
    const family = flavorFamilies.find((item) =>
      item.items.some((name) => name === flavor)
    );
    return family?.chipClass ?? "bg-amber-100 text-amber-900";
  };
  const addOriginEntry = () => {
    setOriginEntries((prev) => [
      ...prev,
      { id: Date.now() + prev.length, country: COFFEE_ORIGINS[0].value, ratio: "" }
    ]);
  };
  const removeOriginEntry = (id: number) => {
    setOriginEntries((prev) => (prev.length > 1 ? prev.filter((entry) => entry.id !== id) : prev));
  };
  const updateOriginEntry = (
    id: number,
    key: "country" | "ratio",
    value: string
  ) => {
    setOriginEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [key]: value } : entry))
    );
  };

  const handleBrewPhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    setBrewPhotoError(null);
    setBrewPhotoUploading(true);
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
        if (file.size > BREW_PHOTO_MAX_BYTES) {
          throw new Error("画像が大きすぎます（最大 6MB）。別の写真をお試しください。");
        }
        uploadBlob = file;
      }
      if (uploadBlob.size > BREW_PHOTO_MAX_BYTES) {
        throw new Error("画像が大きすぎます（最大 6MB）。別の写真をお試しください。");
      }
      const formData = new FormData();
      formData.append(
        "file",
        uploadBlob,
        uploadName.endsWith(".jpg") ? uploadName : `${uploadName}.jpg`
      );
      const response = await fetch("/api/cafe-photo", { method: "POST", body: formData });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "アップロードに失敗しました。");
      }
      if (!payload.url) {
        throw new Error("画像 URL を取得できませんでした。");
      }
      setBrewPhotoUrl(payload.url);
    } catch (err) {
      setBrewPhotoError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setBrewPhotoUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const cleanedOrigins = originEntries
      .map((entry) => ({
        country: entry.country,
        ratio: entry.ratio.trim()
      }))
      .filter((entry) => entry.country);
    const fallbackCountry = cleanedOrigins[0]?.country ?? COFFEE_ORIGINS[0].value;
    const nextLog: StoredBrewLog = {
      id: editingId ?? Date.now(),
      date: brewDate,
      beanName: beanName || "未入力",
      origins: cleanedOrigins,
      originCountry: fallbackCountry,
      method: brewMethod,
      equipmentName,
      roastLevel,
      roastery: roastery || "未入力",
      overallRating,
      foodPairing,
      filterRinse,
      rdtDone,
      flavors: selectedFlavors,
      aftertaste,
      memo,
      ...(cafeLinkCoords &&
      Number.isFinite(cafeLinkCoords.lat) &&
      Number.isFinite(cafeLinkCoords.lng)
        ? { cafeLat: cafeLinkCoords.lat, cafeLng: cafeLinkCoords.lng }
        : {}),
      ...(brewPhotoUrl.trim() !== "" ? { brewPhotoUrl: brewPhotoUrl.trim() } : {})
    };

    setIsSaving(true);
    setSaveMessage("");
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      if (editingId != null) {
        const existing = loadBrewLogsFromStorage();
        if (!existing.some((item) => item.id === editingId)) {
          setSaveMessage("更新できませんでした。記録が見つかりません。");
          return;
        }
        const updated = existing.map((item) =>
          item.id === editingId ? { ...nextLog, id: editingId } : item
        );
        persistBrewLogs(updated);
        const verify = loadBrewLogsFromStorage();
        const row = verify.find((item) => item.id === editingId);
        if (!row) {
          setSaveMessage("更新の反映を確認できませんでした。マイ・ノートを開き直してください。");
          return;
        }
        upsertCafeRecordForBrewLog({ ...nextLog, id: editingId });
        setSaveMessage("記録を更新しました。");
      } else {
        const storedLogs = loadBrewLogsFromStorage();
        persistBrewLogs([nextLog, ...storedLogs]);
        const verify = loadBrewLogsFromStorage();
        if (!verify.some((item) => item.id === nextLog.id)) {
          setSaveMessage("保存の反映を確認できませんでした。もう一度お試しください。");
          return;
        }
        upsertCafeRecordForBrewLog(nextLog);
        setSaveMessage(
          `記録を保存しました。${cleanedOrigins
            .map(
              (entry) =>
                COFFEE_ORIGINS.find((item) => item.value === entry.country)?.label ??
                entry.country
            )
            .join(" / ")} を産地コレクションに追加しました。`
        );
      }

      const storedOriginsRaw = localStorage.getItem(ORIGIN_STORAGE_KEY);
      const storedOrigins = storedOriginsRaw ? (JSON.parse(storedOriginsRaw) as string[]) : [];
      localStorage.setItem(
        ORIGIN_STORAGE_KEY,
        JSON.stringify(
          Array.from(new Set([...storedOrigins, ...cleanedOrigins.map((item) => item.country)]))
        )
      );
      setFormDirty(false);
    } catch {
      setSaveMessage("保存中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
      <section className="rounded-3xl border border-amber-900/15 bg-white/85 p-7 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-10">
        <header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {editingId != null ? "抽出ログ編集" : "抽出ログ作成"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-amber-950 sm:text-4xl">
                {editingId != null ? "記録を編集" : "新しい抽出を記録"}
              </h1>
              <p className="mt-3 text-sm text-amber-900/80 sm:text-base">
                抽出方法を選んで、あなたのモードに合わせた項目を入力してください。
              </p>
            </div>
            {editingId != null && (
              <Link
                href="/brew/new"
                className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                新規作成に切り替え
              </Link>
            )}
          </div>
        </header>

        <form ref={formRef} className="mt-8 space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <label className="block text-sm font-semibold text-amber-900">抽出方法</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {brewMethodCards.map((method) => {
                const selected = brewMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setBrewMethod(method.value)}
                    className={`rounded-xl border p-3 text-center transition-all duration-200 ${
                      selected
                        ? "border-amber-700 bg-amber-200/70 text-amber-950 shadow-sm"
                        : "border-amber-200 bg-white/90 text-amber-800 hover:border-amber-400 hover:bg-amber-100/70"
                    }`}
                    aria-pressed={selected}
                  >
                    <div className="flex items-center justify-center">{method.icon}</div>
                    <p className="mt-2 text-xs font-semibold">{method.label}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-amber-200/90 bg-white/80 p-4">
              <h2 className="text-sm font-semibold text-amber-900">豆の情報</h2>
              <p className="mt-1 text-xs text-amber-900/70">
                使用した豆のプロフィールを記録できます。
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                  豆の名前
                  <input
                    type="text"
                    value={beanName}
                    onChange={(event) => setBeanName(event.target.value)}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="例: エチオピア イルガチェフェ"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                  <span>
                    焙煎所 / 購入店
                    {cafeLinkCoords && (
                      <span className="ml-1 text-xs font-normal text-amber-700/90">
                        （カフェマップの店名が入っています）
                      </span>
                    )}
                  </span>
                  <input
                    type="text"
                    value={roastery}
                    onChange={(event) => setRoastery(event.target.value)}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="例: COFFEE ROASTER TOKYO / お気に入りのカフェ名"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                  焙煎度
                  <select
                    value={roastLevel}
                    onChange={(event) => setRoastLevel(event.target.value)}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {roastLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                  抽出日
                  <input
                    type="date"
                    value={brewDate}
                    onChange={(event) => setBrewDate(event.target.value)}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </label>
                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-900">産地（ブレンド対応）</p>
                    <button
                      type="button"
                      onClick={addOriginEntry}
                      className="rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      ＋ 追加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {originEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2 sm:grid-cols-[1fr_120px_auto]"
                      >
                        <select
                          value={entry.country}
                          onChange={(event) =>
                            updateOriginEntry(entry.id, "country", event.target.value)
                          }
                          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {COFFEE_ORIGINS.map((country) => (
                            <option key={country.value} value={country.value}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={entry.ratio}
                          onChange={(event) =>
                            updateOriginEntry(entry.id, "ratio", event.target.value)
                          }
                          placeholder="%"
                          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeOriginEntry(entry.id)}
                          disabled={originEntries.length === 1}
                          className="rounded-lg border border-amber-300 px-2 py-2 text-xs text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {index === 0 ? "基準" : "削除"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-900">入力モード</p>
              <button
                type="button"
                role="switch"
                aria-checked={mode === "pro"}
                onClick={() =>
                  setMode((prev) => (prev === "beginner" ? "pro" : "beginner"))
                }
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${
                  mode === "pro" ? "bg-amber-700" : "bg-amber-300"
                }`}
              >
                <span className="sr-only">モードを切り替える</span>
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                    mode === "pro" ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-900/80">
              {mode === "beginner"
                ? "初心者モード: 味の印象を星で簡単に記録できます。"
                : "プロモード: 基本条件と抽出方法別の詳細評価を入力できます。"}
            </p>
          </div>

          {mode === "beginner" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
              <p className="text-sm font-semibold text-amber-900">今日の一杯の評価</p>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-900/75 sm:text-sm">
                苦味・酸味・コクのバランスや好みを、総合的な満足度として星1〜5で選べます。
              </p>
              <div
                className="mt-5 flex max-w-md flex-wrap items-center justify-center gap-2 sm:mx-auto sm:gap-2.5"
                role="radiogroup"
                aria-label="評価を1から5で選択"
              >
                {stars.map((star) => {
                  const filled = star <= overallRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={overallRating === star}
                      aria-label={`${star} つ星`}
                      onClick={() => setOverallRating(star)}
                      className={`flex h-12 min-h-[48px] w-12 min-w-[48px] shrink-0 items-center justify-center rounded-xl text-2xl leading-none transition sm:h-14 sm:min-h-[56px] sm:w-14 sm:min-w-[56px] sm:text-3xl ${
                        filled
                          ? "text-amber-600 shadow-sm ring-2 ring-amber-500/35"
                          : "text-amber-200/55 hover:text-amber-400/90"
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50/80`}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-sm font-medium text-amber-900">
                選択中:{" "}
                <span className="inline-flex min-w-[2.5rem] justify-center tabular-nums">
                  {overallRating}
                </span>{" "}
                / 5
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <h2 className="text-base font-semibold text-amber-900">基本条件</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                    お湯の温度 (°C)
                    <input
                      type="number"
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="92"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                    気温 (°C)
                    <input
                      type="number"
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="24"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                    湿度 (%)
                    <input
                      type="number"
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="55"
                    />
                  </label>
                </div>
              </div>

              <details className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 open:shadow-sm">
                <summary className="cursor-pointer list-none text-base font-semibold text-amber-900">
                  詳細設定（器具・工程）
                </summary>
                <p className="mt-2 text-sm text-amber-900/75">
                  プロ向けに器具情報やこだわり工程を記録できます。
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                    使用器具（名前 / メーカー）
                    <input
                      type="text"
                      value={equipmentName}
                      onChange={(event) => setEquipmentName(event.target.value)}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="例: Hario V60 / Fellow Stagg EKG"
                    />
                  </label>
                  <label className="flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-medium text-amber-900">
                    <input
                      type="checkbox"
                      checked={filterRinse}
                      onChange={(event) => setFilterRinse(event.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                    />
                    フィルターリンス（あり）
                  </label>
                  <label className="flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-medium text-amber-900">
                    <input
                      type="checkbox"
                      checked={rdtDone}
                      onChange={(event) => setRdtDone(event.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                    />
                    RTD
                  </label>
                </div>
              </details>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <h2 className="text-base font-semibold text-amber-900">
                  抽出方法別の詳細
                </h2>
                <p className="mt-2 text-sm text-amber-900/80">
                  現在の選択: {brewMethod}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                    挽き目
                    <select className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400">
                      {grindSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  {brewMethod === "エスプレッソ" && (
                    <>
                      <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                        気圧 (bar)
                        <input
                          type="number"
                          step="0.1"
                          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="9.0"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                        粉の量 (g)
                        <input
                          type="number"
                          step="0.1"
                          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="18"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                        抽出量 (g)
                        <input
                          type="number"
                          step="0.1"
                          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="36"
                        />
                      </label>
                    </>
                  )}

                  {brewMethod === "サイフォン" && (
                    <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                      火力調整のメモ
                      <textarea
                        className="min-h-24 rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="例: 中火で開始、30秒後に弱火へ"
                      />
                    </label>
                  )}

                  {brewMethod === "コールドブリュー" && (
                    <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                      抽出時間 (時間)
                      <input
                        type="number"
                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="12"
                      />
                    </label>
                  )}

                  {brewMethod === "ネルドリップ" && (
                    <label className="flex items-center gap-3 text-sm font-medium text-amber-900 sm:col-span-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-400"
                      />
                      点滴抽出を行った
                    </label>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <h2 className="text-base font-semibold text-amber-900">
                  テイスティング評価
                </h2>
                <p className="mt-2 text-sm text-amber-900/80">
                  フレーバーホイールを参考に、系統から詳細フレーバーを選択できます。
                </p>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-amber-900">大分類</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {flavorFamilies.map((family) => (
                      <button
                        key={family.id}
                        type="button"
                        onClick={() => toggleFlavorFamily(family.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${family.cardClass} ${
                          selectedFamilyIds.includes(family.id)
                            ? `${family.activeClass} ring-2 ring-amber-300`
                            : "hover:brightness-95"
                        }`}
                      >
                        <p className="text-sm font-bold">{family.label}</p>
                        <p className="mt-1 text-xs opacity-80">{family.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-amber-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-amber-900">
                      選択中カテゴリの詳細フレーバー
                    </p>
                    <p className="text-xs text-amber-900/70">
                      複数選択可: {selectedFlavors.length}件
                    </p>
                  </div>
                  {selectedFamilies.length > 0 ? (
                    <div className="mt-3 space-y-4">
                      {selectedFamilies.map((family) => (
                        <div key={family.id}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900/70">
                            {family.label}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {family.items.map((flavor) => {
                              const isSelected = selectedFlavors.includes(flavor);
                              return (
                                <button
                                  key={flavor}
                                  type="button"
                                  onClick={() => toggleFlavor(flavor)}
                                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                                    isSelected
                                      ? `${family.activeClass} text-amber-950`
                                      : `${family.cardClass} bg-white hover:bg-amber-50`
                                  }`}
                                >
                                  {flavor}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-900/60">
                      まず大分類を1つ以上選択してください。
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">
                      Selected Flavors
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFlavors.length > 0 ? (
                        selectedFlavors.map((flavor) => (
                          <span
                            key={flavor}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getFlavorChipClass(flavor)}`}
                          >
                            {flavor}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-amber-900/60">
                          まだ選択されていません。
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-amber-900">今日のお供（Food Pairing）</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pairingTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFoodPairing(tag)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            foodPairing === tag
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
                      value={foodPairing}
                      onChange={(event) => setFoodPairing(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="例: アップルパイ"
                    />
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                    総合評価（星）
                    <select
                      value={overallRating}
                      onChange={(event) => setOverallRating(Number(event.target.value))}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>
                          {"★".repeat(rating)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900">
                    アフターテイスト
                    <input
                      type="text"
                      value={aftertaste}
                      onChange={(event) => setAftertaste(event.target.value)}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="例: 余韻が長く甘い"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-amber-900 sm:col-span-2">
                    総評メモ
                    <textarea
                      value={memo}
                      onChange={(event) => setMemo(event.target.value)}
                      className="min-h-28 rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="味のバランス、改善点などを記録"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">写真（任意）</h2>
            <p className="mt-1 text-xs text-amber-900/70">
              アルバムから選ぶとアップロードされ、マイ・ノートとカフェマップのピンにも反映されます。
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                type="text"
                inputMode="url"
                value={brewPhotoUrl}
                onChange={(event) => setBrewPhotoUrl(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="画像 URL（data: または https://）"
              />
              <input
                ref={brewPhotoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="アルバムから写真を選ぶ"
                onChange={handleBrewPhotoFileChange}
              />
              <button
                type="button"
                onClick={() => brewPhotoInputRef.current?.click()}
                disabled={brewPhotoUploading}
                className="shrink-0 rounded-xl border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {brewPhotoUploading ? "アップロード中…" : "アルバムから選ぶ"}
              </button>
            </div>
            {brewPhotoError && (
              <p className="mt-2 text-xs font-medium text-red-700">{brewPhotoError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "保存中…"
              : editingId != null
                ? "変更を保存（更新）"
                : "記録を保存"}
          </button>
          <p className="text-sm text-amber-900/80">
            保存した産地は「世界地図コレクション」でハイライトされます。
          </p>
          {saveMessage && (
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {saveMessage}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default function NewBrewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
          <p className="text-sm text-amber-800">読み込み中...</p>
        </main>
      }
    >
      <BrewNewPageContent />
    </Suspense>
  );
}
