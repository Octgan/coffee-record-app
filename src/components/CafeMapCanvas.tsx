"use client";

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
import type { CafeSpot, VisitRank } from "@/lib/cafeSpotUtils";

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

function buildCafePinHtml(visitCount: number, rank: VisitRank): string {
  const rankClass =
    rank === "gold" ? "cafe-pin-gold" : rank === "silver" ? "cafe-pin-silver" : "";
  const rankEmoji = rank === "gold" ? "🥇" : rank === "silver" ? "🥈" : "☕";
  const countBadge =
    visitCount > 1
      ? `<span class="cafe-pin-count" aria-hidden="true">${visitCount}</span>`
      : "";
  return `<div class="cafe-pin-icon fade-in-pin ${rankClass}"><span class="cafe-pin-emoji">${rankEmoji}</span>${countBadge}</div>`;
}

type CafeMapCanvasProps = {
  spots: CafeSpot[];
  mapCenter: [number, number];
  mapZoom?: number;
  userPosition: [number, number] | null;
  registrationCoords: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  onCafeMarkerClick: (spotKey: string) => void;
  className?: string;
};

export default function CafeMapCanvas({
  spots,
  mapCenter,
  mapZoom = 13,
  userPosition,
  registrationCoords,
  onMapClick,
  onCafeMarkerClick,
  className = "h-full min-h-[min(52vh,480px)] w-full"
}: CafeMapCanvasProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [pinIcons, setPinIcons] = useState<Map<string, DivIcon>>(new Map());
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

      const nextPins = new Map<string, DivIcon>();
      for (const spot of spots) {
        nextPins.set(
          spot.spotKey,
          leaflet.divIcon({
            className: "",
            html: buildCafePinHtml(spot.visitCount, spot.rank),
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        );
      }

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

      setPinIcons(nextPins);
      setUserIcon(me);
      setRegistrationIcon(reg);
    });

    return () => {
      active = false;
    };
  }, [isMounted, spots]);

  if (!isMounted) {
    return <div className={`${className} bg-amber-100/50`} />;
  }

  const showUserMarker =
    Boolean(userPosition) &&
    (!registrationCoords ||
      !userPosition ||
      Math.abs(userPosition[0] - registrationCoords[0]) > 0.000_02 ||
      Math.abs(userPosition[1] - registrationCoords[1]) > 0.000_02);

  return (
    <div className={`${className} bg-[#f5efe3]`}>
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom className="h-full w-full">
        <MapViewSync center={mapCenter} zoom={mapZoom} />
        <MapClickLayer onMapClick={onMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {spots.map((spot) => {
          const icon = pinIcons.get(spot.spotKey);
          if (!icon) {
            return null;
          }
          return (
            <Marker
              key={spot.spotKey}
              position={[spot.lat, spot.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onCafeMarkerClick(spot.spotKey);
                }
              }}
            />
          );
        })}

        {registrationCoords && registrationIcon && (
          <Marker position={registrationCoords} icon={registrationIcon} zIndexOffset={600}>
            <Popup>この位置で記録します</Popup>
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

        .leaflet-tile {
          filter: sepia(0.06) saturate(0.86) contrast(1.14) brightness(0.98);
        }

        .cafe-pin-icon {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: linear-gradient(145deg, #8f2f1e, #6b2318);
          border: 2px solid rgba(255, 255, 255, 0.95);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 14px 24px rgba(61, 22, 12, 0.5),
            0 4px 10px rgba(61, 22, 12, 0.35);
        }

        .cafe-pin-icon.cafe-pin-silver {
          background: linear-gradient(145deg, #94a3b8, #64748b);
          border-color: rgba(255, 255, 255, 0.98);
          box-shadow:
            0 14px 24px rgba(51, 65, 85, 0.45),
            0 0 0 2px rgba(226, 232, 240, 0.5);
        }

        .cafe-pin-icon.cafe-pin-gold {
          background: linear-gradient(145deg, #fbbf24, #d97706);
          border-color: rgba(255, 251, 235, 0.98);
          box-shadow:
            0 14px 26px rgba(180, 83, 9, 0.5),
            0 0 0 2px rgba(253, 230, 138, 0.55);
        }

        .cafe-pin-emoji {
          font-size: 17px;
          line-height: 1;
        }

        .cafe-pin-count {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9999px;
          background: #fff;
          color: #78350f;
          font-size: 10px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
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
