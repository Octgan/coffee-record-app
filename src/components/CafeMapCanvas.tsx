"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DivIcon } from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CafeRecord } from "@/lib/cafeMapStorage";

function MapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickLayer({
  onMapClick
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function CafeMarkerPopupContent({
  record,
  onEdit,
  onDelete
}: {
  record: CafeRecord;
  onEdit: (record: CafeRecord) => void;
  onDelete: (record: CafeRecord) => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <motion.div
      key={record.id}
      initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="w-[min(18rem,calc(100vw-4rem))] space-y-3 rounded-2xl bg-gradient-to-b from-[#fffbeb] to-[#fef3c7]/90 p-1 text-amber-950"
    >
      {record.photoUrl && (
        <img
          src={record.photoUrl}
          alt={record.cafeName}
          className="h-20 w-full rounded-xl object-cover ring-1 ring-amber-200/80"
        />
      )}
      <div className="space-y-1 border-b border-amber-200/70 pb-2">
        <p className="text-base font-bold leading-snug text-amber-950">{record.cafeName}</p>
        <p className="text-xs font-medium text-amber-800/90">訪問日 {record.date}</p>
        <p className="text-sm text-amber-900" aria-label={`評価 ${record.rating} / 5`}>
          <span className="text-amber-600">{"★".repeat(record.rating)}</span>
          <span className="text-amber-400/90">{"★".repeat(5 - record.rating)}</span>
          <span className="ml-1.5 text-xs text-amber-800/80">{record.rating} / 5</span>
        </p>
      </div>
      {record.bean.trim() !== "" && record.bean !== "未入力" && (
        <p className="text-xs leading-relaxed text-amber-900/85">
          <span className="font-semibold text-amber-800">ドリンク</span> {record.bean}
        </p>
      )}
      {record.foodPairing && (
        <p className="text-xs text-amber-800/90">お供 {record.foodPairing}</p>
      )}
      {record.note.trim() !== "" && (
        <p className="line-clamp-3 text-xs leading-relaxed text-amber-900/80">{record.note}</p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-amber-200/60 pt-2">
        <button
          type="button"
          onClick={() => onEdit(record)}
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-800"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(record)}
          className="rounded-lg border border-red-300/90 bg-white px-3 py-1.5 text-xs font-bold text-red-800 transition hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </motion.div>
  );
}

type CafeMapCanvasProps = {
  records: CafeRecord[];
  mapCenter: [number, number];
  mapZoom?: number;
  userPosition: [number, number] | null;
  registrationCoords: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  onRecordEdit: (record: CafeRecord) => void;
  onRecordDelete: (record: CafeRecord) => void;
};

export default function CafeMapCanvas({
  records,
  mapCenter,
  mapZoom = 13,
  userPosition,
  registrationCoords,
  onMapClick,
  onRecordEdit,
  onRecordDelete
}: CafeMapCanvasProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [coffeeIcon, setCoffeeIcon] = useState<DivIcon | null>(null);
  const [userIcon, setUserIcon] = useState<DivIcon | null>(null);
  const [registrationIcon, setRegistrationIcon] = useState<DivIcon | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    let active = true;
    import("leaflet").then((leaflet) => {
      if (!active) {
        return;
      }
      const cup = leaflet.divIcon({
        className: "",
        html: `<div class="cafe-pin-icon fade-in-pin">☕</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const me = leaflet.divIcon({
        className: "",
        html: `<div class="user-location-pin"><span class="user-location-ripple"></span><span class="user-location-dot"></span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const reg = leaflet.divIcon({
        className: "",
        html: `<div class="registration-pin-icon fade-in-pin">📍</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 36]
      });
      setCoffeeIcon(cup);
      setUserIcon(me);
      setRegistrationIcon(reg);
    });

    return () => {
      active = false;
    };
  }, [isMounted]);

  if (!isMounted) {
    return <div className="h-full w-full bg-amber-100/50" />;
  }

  const showUserMarker =
    Boolean(userPosition) &&
    (!registrationCoords ||
      !userPosition ||
      Math.abs(userPosition[0] - registrationCoords[0]) > 0.000_02 ||
      Math.abs(userPosition[1] - registrationCoords[1]) > 0.000_02);

  return (
    <div className="h-[min(78vh,calc(100dvh-11rem))] min-h-[460px] w-full bg-[#f5efe3]">
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom className="h-full w-full">
        <MapViewSync center={mapCenter} zoom={mapZoom} />
        <MapClickLayer onMapClick={onMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {coffeeIcon &&
          records.map((record) => (
            <Marker key={record.id} position={[record.lat, record.lng]} icon={coffeeIcon}>
              <Popup
                className="cafe-map-popup-shell"
                closeButton
                minWidth={272}
                maxWidth={320}
              >
                <div className="leaflet-popup-inner">
                  <CafeMarkerPopupContent
                    record={record}
                    onEdit={onRecordEdit}
                    onDelete={onRecordDelete}
                  />
                </div>
              </Popup>
            </Marker>
          ))}

        {registrationCoords && registrationIcon && (
          <Marker position={registrationCoords} icon={registrationIcon} zIndexOffset={600}>
            <Popup>この位置でスポットを保存します（名前は右側で編集）</Popup>
          </Marker>
        )}

        {showUserMarker && userPosition && userIcon && (
          <>
            <Circle
              center={userPosition}
              radius={170}
              pathOptions={{ color: "#14b8a6", fillColor: "#14b8a6", fillOpacity: 0.12 }}
            />
            <Circle
              center={userPosition}
              radius={90}
              pathOptions={{ color: "#0f766e", fillColor: "#2dd4bf", fillOpacity: 0.18 }}
            />
            <Marker position={userPosition} icon={userIcon} zIndexOffset={500}>
              <Popup>現在地</Popup>
            </Marker>
          </>
        )}
      </MapContainer>
      <style jsx global>{`
        .leaflet-container {
          background: #f5efe3;
        }

        .cafe-map-popup-shell .leaflet-popup-content-wrapper {
          border-radius: 18px;
          padding: 0;
          overflow: hidden;
          background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid rgba(180, 83, 9, 0.22);
          box-shadow:
            0 18px 40px rgba(69, 26, 3, 0.18),
            0 6px 14px rgba(120, 53, 15, 0.12);
        }

        .cafe-map-popup-shell .leaflet-popup-content {
          margin: 10px 12px 12px;
          min-width: 0;
        }

        .cafe-map-popup-shell .leaflet-popup-tip {
          background: #fef3c7;
          border: 1px solid rgba(180, 83, 9, 0.15);
          box-shadow: none;
        }

        .cafe-map-popup-shell a.leaflet-popup-close-button {
          width: 28px;
          height: 28px;
          padding: 0;
          top: 8px;
          right: 8px;
          font-size: 18px;
          line-height: 26px;
          color: #78350f;
          border-radius: 9999px;
          background: rgba(255, 251, 235, 0.95);
          border: 1px solid rgba(180, 83, 9, 0.2);
        }

        .cafe-map-popup-shell a.leaflet-popup-close-button:hover {
          background: #fff7ed;
          color: #451a03;
        }

        .leaflet-tile {
          filter: sepia(0.06) saturate(0.86) contrast(1.14) brightness(0.98);
        }

        .cafe-pin-icon {
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: #8f2f1e;
          border: 2px solid rgba(255, 255, 255, 0.95);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow:
            0 14px 24px rgba(61, 22, 12, 0.5),
            0 4px 10px rgba(61, 22, 12, 0.35);
        }

        .user-location-pin {
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-location-dot {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #14b8a6;
          border: 2px solid #ffffff;
          box-shadow: 0 8px 16px rgba(8, 85, 77, 0.4);
          z-index: 2;
        }

        .user-location-ripple {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          border: 2px solid rgba(20, 184, 166, 0.45);
          background: rgba(45, 212, 191, 0.2);
          animation: user-location-pulse 1.8s ease-out infinite;
          z-index: 1;
        }

        .fade-in-pin {
          animation: marker-fade-in 220ms ease-out;
        }

        @keyframes user-location-pulse {
          0% {
            transform: scale(0.55);
            opacity: 0.85;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes marker-fade-in {
          0% {
            opacity: 0;
            transform: translateY(4px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .registration-pin-icon {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: linear-gradient(145deg, #ea580c, #c2410c);
          border: 3px solid rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          box-shadow:
            0 12px 22px rgba(154, 52, 18, 0.45),
            0 4px 10px rgba(124, 45, 18, 0.35);
        }
      `}</style>
    </div>
  );
}
