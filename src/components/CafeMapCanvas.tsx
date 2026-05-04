"use client";

import { useEffect, useState } from "react";
import type { DivIcon } from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CafeRecord } from "@/lib/cafeMapStorage";

type DisplayCafeRecord = CafeRecord & { isOwn: boolean };

type CafeMapCanvasProps = {
  records: DisplayCafeRecord[];
  mapCenter: [number, number];
  userPosition: [number, number] | null;
  ownRecordIds: number[];
  onToggleRecordVisibility: (recordId: number) => void;
};

export default function CafeMapCanvas({
  records,
  mapCenter,
  userPosition,
  ownRecordIds,
  onToggleRecordVisibility
}: CafeMapCanvasProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [coffeeIcon, setCoffeeIcon] = useState<DivIcon | null>(null);
  const [publicIcon, setPublicIcon] = useState<DivIcon | null>(null);
  const [userIcon, setUserIcon] = useState<DivIcon | null>(null);

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
      const publicCup = leaflet.divIcon({
        className: "",
        html: `<div class="cafe-pin-icon-public fade-in-pin">☕</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const me = leaflet.divIcon({
        className: "",
        html: `<div class="user-location-pin"><span class="user-location-ripple"></span><span class="user-location-dot"></span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      setCoffeeIcon(cup);
      setPublicIcon(publicCup);
      setUserIcon(me);
    });

    return () => {
      active = false;
    };
  }, [isMounted]);

  if (!isMounted) {
    return <div className="h-full w-full bg-amber-100/50" />;
  }

  return (
    <div className="h-[62vh] min-h-[420px] bg-[#f5efe3]">
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}`}
        center={mapCenter}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {coffeeIcon &&
          publicIcon &&
          records.map((record) => (
            <Marker
              key={record.id}
              position={[record.lat, record.lng]}
              icon={record.isOwn ? coffeeIcon : publicIcon}
            >
              <Popup>
                <div className="w-52 space-y-2">
                  <img
                    src={record.photoUrl}
                    alt={record.cafeName}
                    className="h-24 w-full rounded-md object-cover"
                  />
                  <p className="font-semibold text-amber-900">{record.cafeName}</p>
                  <p className="text-xs text-amber-800">{record.date}</p>
                  <p className="text-xs text-amber-900/80">
                    投稿者: {record.authorNickname || "あなた"}
                  </p>
                  <p className="text-xs font-semibold text-amber-700">
                    {record.isOwn ? "あなたの記録" : "みんなの公開記録"}
                  </p>
                  <p className="text-sm">評価: {"★".repeat(record.rating)}</p>
                  <p className="text-xs font-semibold text-amber-800">
                    {record.isPublic ? "公開中" : "非公開（自分のみ）"}
                  </p>
                  <p className="text-sm">豆: {record.bean}</p>
                  <p className="text-sm">
                    お供: {record.foodPairing ? `🍰 ${record.foodPairing}` : "未入力"}
                  </p>
                  <p className="text-sm">{record.note}</p>
                  {ownRecordIds.includes(record.id) && (
                    <button
                      type="button"
                      onClick={() => onToggleRecordVisibility(record.id)}
                      className="w-full rounded-md bg-amber-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-amber-800"
                    >
                      {record.isPublic ? "非公開にする" : "公開する"}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {userPosition && userIcon && (
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
            <Marker position={userPosition} icon={userIcon}>
              <Popup>現在地</Popup>
            </Marker>
          </>
        )}
      </MapContainer>
      <style jsx global>{`
        .leaflet-container {
          background: #f5efe3;
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

        .cafe-pin-icon-public {
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: #c58a24;
          border: 2px solid rgba(255, 255, 255, 0.95);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow:
            0 14px 24px rgba(98, 63, 15, 0.45),
            0 4px 10px rgba(98, 63, 15, 0.32);
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
      `}</style>
    </div>
  );
}
