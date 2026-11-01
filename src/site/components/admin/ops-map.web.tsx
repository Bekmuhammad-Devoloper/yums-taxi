// Operatsion xarita (Leaflet): mashinalar holati bo'yicha rangli halqa bilan, kutayotgan buyurtmalar miltillaydi,
// yoqilgan hududlar to'liq, tavsiya etilganlari punktir doira bilan. Plitka serveri ochilmasa — sxematik xarita.
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ATTRIBUTION, assetUri, makeOfflineLayer, OFFLINE_ATTRIBUTION, PALETTE, TILES } from '@/components/taxi-map.web';
import { CAR_TOP } from '@/lib/cars';
import { DEFAULT_CENTER, type LatLng } from '@/lib/data';
import { distanceKm } from '@/lib/geo';
import { surgeLevel } from '@/lib/remote-config';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import type { OpsMapProps } from './ops-map';

export type { OpsMapProps } from './ops-map';

const ll = (p: LatLng): L.LatLngTuple => [p.latitude, p.longitude];
const ZONE: Record<1 | 2 | 3, string> = { 1: '#E0A800', 2: '#EB6834', 3: '#E34948' };
export const STATE_COLOR = { free: '#1BAF7A', busy: '#2A78D6', offer: '#FFC800', pending: '#8A93A6' };

const CSS = `
.am-icon{background:none;border:none}
.am-car{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;border:3px solid var(--c);background:var(--bg);box-shadow:0 2px 6px rgba(0,0,0,.25);cursor:pointer;transition:transform .15s}
.am-car img{width:13px;height:24px;transition:transform .6s ease}
.am-car.am-sel{transform:scale(1.35);box-shadow:0 0 0 4px rgba(255,200,0,.45),0 2px 8px rgba(0,0,0,.3)}
.am-car.am-pending{opacity:.6}
.am-glide{transition:transform .9s linear}
.am-zooming .am-glide{transition:none}
.am-pin{width:22px;height:22px;border-radius:50%;background:#E34948;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);box-sizing:border-box;position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font:800 11px/1 Onest_800ExtraBold,system-ui,sans-serif}
.am-pin:after{content:"";position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(227,73,72,.55);animation:am-pulse 1.6s ease-out infinite}
.am-pin.am-sel{background:#0F1E3D}
.am-dot{width:14px;height:14px;border-radius:50%;background:#0F1E3D;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box}
.am-flag{width:16px;height:16px;border-radius:5px;background:#FFC800;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box}
.am-zone{font:800 11px/18px Onest_800ExtraBold,system-ui,sans-serif;color:#1A1205;background:#FFD23F;border-radius:8px;padding:0 7px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2);transform:translate(-50%,-50%);display:inline-block}
.am-zone.am-rec{background:#fff;color:#B4410F;border:1.5px dashed #EB6834}
@keyframes am-pulse{from{transform:scale(.6);opacity:1}to{transform:scale(1.5);opacity:0}}
`;
let cssAdded = false;
function addCss() {
  if (cssAdded || typeof document === 'undefined') return;
  cssAdded = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

const carIcon = (state: keyof typeof STATE_COLOR, rot: number, sel: boolean, bg: string) => L.divIcon({
  className: 'am-icon am-glide',
  html: `<div class="am-car${sel ? ' am-sel' : ''}${state === 'pending' ? ' am-pending' : ''}" style="--c:${STATE_COLOR[state]};--bg:${bg}"><img src="${assetUri(CAR_TOP.taxi)}" style="transform:rotate(${Math.round(rot)}deg)" alt="" draggable="false"></div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});
const pinIcon = (sel: boolean, n: string) => L.divIcon({ className: 'am-icon', html: `<div class="am-pin${sel ? ' am-sel' : ''}">${n}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
const dotIcon = L.divIcon({ className: 'am-icon', html: '<div class="am-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
const flagIcon = L.divIcon({ className: 'am-icon', html: '<div class="am-flag"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
const zoneLabel = (text: string, rec: boolean) => L.divIcon({ className: 'am-icon', html: `<span class="am-zone${rec ? ' am-rec' : ''}">${text.replace(/[<>&"]/g, '')}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] });

export default function OpsMap({ drivers, live, orders, zones, hotspots, selectedDriver, selectedOrder, onSelectDriver, onSelectOrder, onMapClick, draftZone, focus, legend = true }: OpsMapProps) {
  const { dark, colors: c } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cars = useRef(new Map<string, L.Marker>());
  const pins = useRef(new Map<string, L.Marker>());
  const zoneLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const cb = useRef({ onSelectDriver, onSelectOrder, onMapClick });
  useEffect(() => { cb.current = { onSelectDriver, onSelectOrder, onMapClick }; }, [onSelectDriver, onSelectOrder, onMapClick]);
  const [offline, setOffline] = useState(false);
  const theme = dark ? 'dark' : 'light';

  useEffect(() => {
    addCss();
    const el = box.current;
    if (!el) return;
    const m = L.map(el, { zoomControl: true, attributionControl: false, zoomSnap: 0.25, wheelPxPerZoomLevel: 110, minZoom: 9, maxZoom: 18 }).setView(ll(DEFAULT_CENTER), 12.5);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m);
    m.on('click', e => cb.current.onMapClick?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }));
    m.on('zoomstart', () => el.classList.add('am-zooming'));
    m.on('zoomend', () => setTimeout(() => el.classList.remove('am-zooming'), 50));
    zoneLayer.current = L.layerGroup().addTo(m);
    routeLayer.current = L.layerGroup().addTo(m);
    draftLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el);
    const carsMap = cars.current, pinsMap = pins.current;
    return () => { ro.disconnect(); m.remove(); map.current = null; carsMap.clear(); pinsMap.clear(); };
  }, []);

  // asosiy qatlam: plitkalar, ochilmasa — sxematik
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.getContainer().style.background = PALETTE[theme].land;
    if (offline) {
      const off = makeOfflineLayer(theme).addTo(m);
      m.attributionControl?.addAttribution(OFFLINE_ATTRIBUTION);
      return () => { off.remove(); m.attributionControl?.removeAttribution(OFFLINE_ATTRIBUTION); };
    }
    const tiles = L.tileLayer(TILES[theme], { subdomains: 'abcd', maxZoom: 19, detectRetina: true, attribution: ATTRIBUTION, crossOrigin: true });
    let loaded = false, errors = 0;
    tiles.on('tileload', () => { loaded = true; });
    tiles.on('tileerror', () => { if (!loaded && ++errors >= 2) setOffline(true); });
    const timer = setTimeout(() => { if (!loaded) setOffline(true); }, 7000);
    tiles.addTo(m);
    return () => { clearTimeout(timer); tiles.remove(); };
  }, [theme, offline]);

  // hududlar: yoqilganlari va tavsiya etilganlari
  useEffect(() => {
    const g = zoneLayer.current;
    if (!g) return;
    g.clearLayers();
    for (const z of zones) {
      const col = ZONE[surgeLevel(z.surge)];
      L.circle(ll(z.center), { radius: z.radiusKm * 1000, color: col, weight: 2, fillColor: col, fillOpacity: 0.12, interactive: false }).addTo(g);
      L.marker(ll(z.center), { icon: zoneLabel(`×${z.surge.toFixed(1)}${z.label ? ` · ${z.label}` : ''}`, false), interactive: false, keyboard: false }).addTo(g);
    }
    for (const h of hotspots ?? []) {
      if (h.surge <= 1 || h.covered) continue;
      L.circle(ll(h.place), { radius: 1500, color: '#EB6834', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(g);
      L.marker(ll(h.place), { icon: zoneLabel(`Tavsiya ×${h.surge.toFixed(1)}`, true), interactive: false, keyboard: false }).addTo(g);
    }
  }, [zones, hotspots]);

  // mashinalar
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    const bg = dark ? '#151A24' : '#FFFFFF';
    for (const l of live) {
      if (!l.pos) continue;
      seen.add(l.id);
      const state: keyof typeof STATE_COLOR = l.pending ? 'pending' : l.offering ? 'offer' : l.busy ? 'busy' : 'free';
      const key = `${state}:${l.id === selectedDriver}:${bg}`;
      let mk = cars.current.get(l.id);
      if (!mk) {
        mk = L.marker(ll(l.pos), { icon: carIcon(state, l.heading ?? 0, l.id === selectedDriver, bg), keyboard: false, title: drivers[l.id]?.name ?? l.id, zIndexOffset: l.id === selectedDriver ? 900 : 0 }).addTo(m);
        mk.on('click', () => cb.current.onSelectDriver?.(l.id));
        (mk as L.Marker & { key?: string }).key = key;
        cars.current.set(l.id, mk);
      } else {
        mk.setLatLng(ll(l.pos));
        const prev = (mk as L.Marker & { key?: string }).key;
        if (prev !== key) {
          mk.setIcon(carIcon(state, l.heading ?? 0, l.id === selectedDriver, bg));
          mk.setZIndexOffset(l.id === selectedDriver ? 900 : 0);
          (mk as L.Marker & { key?: string }).key = key;
        } else {
          const img = mk.getElement()?.querySelector('img');
          if (img) img.style.transform = `rotate(${Math.round(l.heading ?? 0)}deg)`;
        }
      }
    }
    cars.current.forEach((mk, id) => { if (!seen.has(id)) { mk.remove(); cars.current.delete(id); } });
  }, [live, drivers, selectedDriver, dark]);

  // kutayotgan buyurtmalar
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const waiting = orders.filter(o => o.status === 'searching');
    const seen = new Set<string>();
    for (const o of waiting) {
      seen.add(o.id);
      const sel = o.id === selectedOrder;
      const secs = Math.floor((Date.now() - Date.parse(o.createdAt)) / 1000);
      const label = secs >= 60 ? '!' : '';
      let mk = pins.current.get(o.id);
      if (!mk) {
        mk = L.marker(ll(o.pickup), { icon: pinIcon(sel, label), keyboard: false, title: `${o.pickup.title} → ${o.destination.title}`, zIndexOffset: 800 }).addTo(m);
        mk.on('click', () => cb.current.onSelectOrder?.(o.id));
        pins.current.set(o.id, mk);
      } else mk.setIcon(pinIcon(sel, label));
    }
    pins.current.forEach((mk, id) => { if (!seen.has(id)) { mk.remove(); pins.current.delete(id); } });
  }, [orders, selectedOrder]);

  // tanlangan buyurtma marshruti (to'g'ri chiziq) va haydovchining olish nuqtasiga yo'li
  useEffect(() => {
    const g = routeLayer.current;
    if (!g) return;
    g.clearLayers();
    const o = orders.find(x => x.id === selectedOrder);
    if (!o) return;
    const ink = dark ? '#FFC800' : '#0F1E3D';
    L.polyline([ll(o.pickup), ll(o.destination)], { color: ink, weight: 3, opacity: 0.9, interactive: false }).addTo(g);
    if (o.status !== 'searching') L.marker(ll(o.pickup), { icon: dotIcon, interactive: false, keyboard: false }).addTo(g);
    L.marker(ll(o.destination), { icon: flagIcon, interactive: false, keyboard: false }).addTo(g);
    const drv = o.driverId ? live.find(l => l.id === o.driverId) : undefined;
    if (drv?.pos && (o.status === 'accepted')) L.polyline([ll(drv.pos), ll(o.pickup)], { color: '#2A78D6', weight: 2, dashArray: '4 8', interactive: false }).addTo(g);
  }, [orders, selectedOrder, live, dark]);

  // yangi hudud qoralamasi
  useEffect(() => {
    const g = draftLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!draftZone) return;
    const col = ZONE[surgeLevel(draftZone.surge)];
    L.circle(ll(draftZone.center), { radius: draftZone.radiusKm * 1000, color: col, weight: 2.5, dashArray: '8 6', fillColor: col, fillOpacity: 0.16, interactive: false }).addTo(g);
    L.marker(ll(draftZone.center), { icon: zoneLabel(`×${draftZone.surge.toFixed(1)} · yangi`, true), interactive: false, keyboard: false }).addTo(g);
  }, [draftZone]);

  // tanlangan obyektga yaqinlashish (nuqtalar 300 m dan ko'proq siljigandagina — harakatdagi mashinada xarita silkinmasin)
  const lastFocus = useRef<LatLng[] | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!m || !focus?.length) return;
    const prev = lastFocus.current;
    if (prev && prev.length === focus.length && focus.every((p, i) => distanceKm(p, prev[i]) < 0.3)) return;
    lastFocus.current = focus;
    if (focus.length === 1) m.flyTo(ll(focus[0]), Math.max(m.getZoom(), 14.5), { duration: 0.6 });
    else m.flyToBounds(L.latLngBounds(focus.map(ll)), { padding: [60, 60], maxZoom: 15, duration: 0.6 });
  }, [focus]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: PALETTE[theme].land }]}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      {legend ? (
        <View style={[styles.legend, { backgroundColor: c.surface, borderColor: c.line }]} pointerEvents="none">
          {([['free', "Bo'sh"], ['busy', 'Safarda'], ['offer', 'Taklif'], ['pending', 'Tekshiruvda']] as const).map(([k, label]) => (
            <View key={k} style={styles.legendRow}>
              <View style={[styles.legendRing, { borderColor: STATE_COLOR[k] }]} />
              <Text style={[styles.legendText, { color: c.text }]}>{label}</Text>
            </View>
          ))}
          <View style={styles.legendRow}>
            <View style={[styles.legendPin]} />
            <Text style={[styles.legendText, { color: c.text }]}>Haydovchi kutmoqda</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { position: 'absolute', right: 10, top: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, gap: 5, zIndex: 500 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
  legendPin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E34948', borderWidth: 2, borderColor: '#fff' },
  legendText: { fontFamily: F.semi, fontSize: 11.5 },
});
