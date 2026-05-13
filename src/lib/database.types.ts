export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BrewLogRow = {
  id: number;
  user_id: string;
  date: string;
  bean_name: string;
  origins: Json | null;
  origin_country: string;
  method: string;
  equipment_name: string | null;
  roast_level: string;
  roastery: string;
  overall_rating: number;
  food_pairing: string | null;
  filter_rinse: boolean;
  rdt_done: boolean;
  flavors: Json;
  aftertaste: string;
  memo: string;
  cafe_lat: number | null;
  cafe_lng: number | null;
  brew_photo_url: string | null;
  water_temp_c: number | null;
  bloom_time_sec: number | null;
  coffee_maker_course: string | null;
  created_at: string;
  updated_at: string;
};

export type CafeRecordRow = {
  user_id: string;
  id: number;
  brew_log_id: number | null;
  cafe_name: string;
  lat: number;
  lng: number;
  date: string;
  rating: number;
  bean: string;
  note: string;
  food_pairing: string | null;
  photo_url: string;
  created_at: string;
};

export type UserOriginExtraRow = {
  user_id: string;
  country_value: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      brew_logs: {
        Row: BrewLogRow;
        Insert: {
          id?: number;
          user_id: string;
          date: string;
          bean_name?: string;
          origins?: Json | null;
          origin_country?: string;
          method?: string;
          equipment_name?: string | null;
          roast_level?: string;
          roastery?: string;
          overall_rating?: number;
          food_pairing?: string | null;
          filter_rinse?: boolean;
          rdt_done?: boolean;
          flavors?: Json;
          aftertaste?: string;
          memo?: string;
          cafe_lat?: number | null;
          cafe_lng?: number | null;
          brew_photo_url?: string | null;
          water_temp_c?: number | null;
          bloom_time_sec?: number | null;
          coffee_maker_course?: string | null;
        };
        Update: Partial<Omit<BrewLogRow, "id" | "user_id">>;
        Relationships: [];
      };
      cafe_records: {
        Row: CafeRecordRow;
        Insert: {
          user_id: string;
          id: number;
          brew_log_id?: number | null;
          cafe_name: string;
          lat: number;
          lng: number;
          date: string;
          rating: number;
          bean: string;
          note?: string;
          food_pairing?: string | null;
          photo_url: string;
        };
        Update: Partial<Omit<CafeRecordRow, "user_id" | "id">>;
        Relationships: [];
      };
      user_origin_extras: {
        Row: UserOriginExtraRow;
        Insert: {
          user_id: string;
          country_value: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
