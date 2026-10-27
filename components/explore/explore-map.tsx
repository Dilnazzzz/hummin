"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { CATEGORY_HEX } from "@/components/events/category";
import type { Category } from "@/lib/db/schema";

export type MapPin = { id: string; title: string; lat: number; lng: number; category: Category; when: string; place: string | null };

type Props = { pins: MapPin[]; center: { lat: number; lng: number }; className?: string; selectedId?: string | null };

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function ExploreMap({ pins, center, className, selectedId }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !el.current || mapRef.current) return;
      // Turbopack can't resolve MapLibre's bundled worker URL; serve the worker from /public instead.
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      const map = new maplibregl.Map({
        container: el.current,
        style: STYLE,
        center: [center.lng, center.lat],
        zoom: 12,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; pins and center update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      const map = mapRef.current;
      if (cancelled || !map) return;
      const render = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        for (const p of pins) {
          const hex = CATEGORY_HEX[p.category];
          const dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("aria-label", p.title);
          const selected = p.id === selectedId;
          dot.style.cssText = `width:${selected ? 22 : 16}px;height:${selected ? 22 : 16}px;border-radius:999px;background:${selected ? "#D4F53C" : hex.bg};border:2px solid ${hex.ink};box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;padding:0`;
          const popup = new maplibregl.Popup({ offset: 14, closeButton: false, maxWidth: "260px" }).setHTML(
            `<div style="font:14px/1.4 system-ui;color:#1B1A20"><strong>${escapeHtml(p.title)}</strong><br><span style="color:#5E5B66">${escapeHtml(p.when)}${p.place ? " · " + escapeHtml(p.place) : ""}</span><br><a href="/e/${p.id}" style="display:inline-block;margin-top:6px;font-weight:600;color:#1B1A20">Details →</a></div>`,
          );
          const m = new maplibregl.Marker({ element: dot }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
          markersRef.current.push(m);
        }
        if (pins.length > 1) {
          const b = new maplibregl.LngLatBounds();
          pins.forEach((p) => b.extend([p.lng, p.lat]));
          map.fitBounds(b, { padding: 48, maxZoom: 14, duration: 400 });
        } else if (pins.length === 1) {
          map.easeTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 400 });
        }
      };
      if (map.loaded()) render();
      else map.once("load", render);
    })();
    return () => {
      cancelled = true;
    };
  }, [pins, selectedId]);

  return <div ref={el} className={className} role="region" aria-label="Map of events" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
