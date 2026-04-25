export const CAFE_MAP_STORAGE_KEY = "coffee-cafe-map-logs";
export const CAFE_PROFILE_STORAGE_KEY = "coffee-cafe-profile";

export type CafeRecord = {
  id: number;
  cafeName: string;
  lat: number;
  lng: number;
  date: string;
  rating: number;
  bean: string;
  note: string;
  foodPairing?: string;
  isPublic?: boolean;
  authorNickname?: string;
  photoUrl: string;
};

export const SAMPLE_CAFE_RECORDS: CafeRecord[] = [
  {
    id: 1,
    cafeName: "Amber Roastery Tokyo",
    lat: 35.6826,
    lng: 139.7671,
    date: "2026-04-10",
    rating: 5,
    bean: "エチオピア イルガチェフェ",
    note: "シトラス感が綺麗で、余韻が長い。",
    foodPairing: "レモンケーキ",
    isPublic: false,
    authorNickname: "あなた",
    photoUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 2,
    cafeName: "Night Owl Coffee",
    lat: 35.6769,
    lng: 139.7632,
    date: "2026-04-14",
    rating: 4,
    bean: "ブラジル / コロンビア ブレンド",
    note: "ダークチョコとナッツのバランスが良い。",
    foodPairing: "チョコブラウニー",
    isPublic: false,
    authorNickname: "あなた",
    photoUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 3,
    cafeName: "Harbor Drip Lab",
    lat: 35.6707,
    lng: 139.7717,
    date: "2026-04-18",
    rating: 5,
    bean: "ケニア AA",
    note: "明るい酸味と華やかなアロマ。",
    foodPairing: "バタークッキー",
    isPublic: false,
    authorNickname: "あなた",
    photoUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80"
  }
];

export const MOCK_PUBLIC_CAFE_RECORDS: CafeRecord[] = [
  {
    id: 9001,
    cafeName: "Sunset Beans",
    lat: 35.6841,
    lng: 139.7584,
    date: "2026-04-11",
    rating: 4,
    bean: "グァテマラ SHB",
    note: "キャラメル感が心地よく、余韻が長い。",
    foodPairing: "スコーン",
    isPublic: true,
    authorNickname: "Mika",
    photoUrl:
      "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 9002,
    cafeName: "River Side Brew",
    lat: 35.6668,
    lng: 139.7761,
    date: "2026-04-19",
    rating: 5,
    bean: "エチオピア ナチュラル",
    note: "ベリー系の香りが鮮明。",
    foodPairing: "チョコ",
    isPublic: true,
    authorNickname: "Takumi",
    photoUrl:
      "https://images.unsplash.com/photo-1521302200778-33500795e128?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 9003,
    cafeName: "Morning Drip Stand",
    lat: 35.6732,
    lng: 139.7529,
    date: "2026-04-22",
    rating: 4,
    bean: "ブラジル イエローブルボン",
    note: "ナッツとカカオの甘い印象。",
    foodPairing: "クッキー",
    isPublic: true,
    authorNickname: "CoffeeNeko",
    photoUrl:
      "https://images.unsplash.com/photo-1455470956270-4cbb357f4a56?auto=format&fit=crop&w=700&q=80"
  }
];
