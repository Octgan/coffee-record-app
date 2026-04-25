export const BREW_LOG_STORAGE_KEY = "coffee-brew-logs";

export type StoredBrewLog = {
  id: number;
  date: string;
  beanName: string;
  origins?: {
    country: string;
    ratio: string;
  }[];
  originCountry: string;
  method: string;
  equipmentName?: string;
  roastLevel: string;
  roastery: string;
  overallRating: number;
  foodPairing?: string;
  filterRinse?: boolean;
  rdtDone?: boolean;
  flavors: string[];
  aftertaste: string;
  memo: string;
};

export const SAMPLE_BREW_LOGS: StoredBrewLog[] = [
  {
    id: 1,
    date: "2026-04-06",
    beanName: "エチオピア イルガチェフェ",
    origins: [{ country: "Ethiopia", ratio: "100" }],
    originCountry: "Ethiopia",
    method: "ハンドドリップ",
    equipmentName: "Hario V60 / Fellow Stagg EKG",
    roastLevel: "浅煎り",
    roastery: "Local Roaster",
    overallRating: 4,
    foodPairing: "スコーン",
    filterRinse: true,
    rdtDone: true,
    flavors: ["Berry", "Jasmine"],
    aftertaste: "紅茶のような余韻",
    memo: "華やかな酸味。"
  },
  {
    id: 2,
    date: "2026-04-12",
    beanName: "ブラジル セラード",
    origins: [
      { country: "Brazil", ratio: "70" },
      { country: "Colombia", ratio: "30" }
    ],
    originCountry: "Brazil",
    method: "エスプレッソ",
    equipmentName: "La Marzocco Linea Mini",
    roastLevel: "中深煎り",
    roastery: "COFFEE ROASTER TOKYO",
    overallRating: 5,
    foodPairing: "チョコ",
    filterRinse: false,
    rdtDone: false,
    flavors: ["Dark Chocolate", "Nutty"],
    aftertaste: "甘い余韻",
    memo: "抽出量36gで安定。"
  },
  {
    id: 3,
    date: "2026-04-21",
    beanName: "コロンビア ウィラ",
    origins: [{ country: "Colombia", ratio: "100" }],
    originCountry: "Colombia",
    method: "コールドブリュー",
    equipmentName: "Toddy Cold Brew System",
    roastLevel: "中煎り",
    roastery: "Beans Market",
    overallRating: 4,
    foodPairing: "チーズケーキ",
    filterRinse: false,
    rdtDone: true,
    flavors: ["Citrus Fruit", "Honey"],
    aftertaste: "すっきり",
    memo: "12時間抽出。"
  }
];
