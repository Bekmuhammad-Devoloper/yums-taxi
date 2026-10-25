// Veb xarita: Leaflet + OpenStreetMap/CARTO plitkalari.
// Plitka serveri ochilmasa (oflayn, CSP), xarita o'zi chizadigan sxematik qatlamga o'tadi —
// surish, kattalashtirish, marshrut va mashinalar baribir ishlaydi.
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CAR_TOP } from '@/lib/cars';
import type { LatLng } from '@/lib/data';
import { bearing } from '@/lib/geo';
import { useStore } from '@/lib/store';

import type { TaxiMapProps } from './taxi-map';

export type { MapHandle } from './taxi-map';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';
const OFFLINE_ATTRIBUTION = 'Sxematik xarita · xarita serveri bilan aloqa yo\'q';

const ll = (p: LatLng): L.LatLngTuple => [p.latitude, p.longitude];
const assetUri = (m: unknown) => (typeof m === 'object' && m && 'uri' in m ? String((m as { uri: string }).uri) : String(m));

/* ---------- Sxematik (oflayn) plitkalar ---------- */

type Palette = { road: string; roadCasing: string; land: string; block: string; building: string; buildingEdge: string; park: string; tree: string; water: string; street: string; casing: string; major: string; majorCasing: string };
const PALETTE: Record<'light' | 'dark', Palette> = {
  light: { road: '#FFFFFF', roadCasing: '#D3D8E0', land: '#EEF0F3', block: '#E8EBEF', building: '#DFE2E8', buildingEdge: '#D2D6DE', park: '#D5ECD1', tree: '#C3E2BE', water: '#B9D8F3', street: '#FFFFFF', casing: '#D6DAE1', major: '#FFE8A3', majorCasing: '#E9CB72' },
  dark: { road: '#313846', roadCasing: '#0F1217', land: '#15181E', block: '#1A1E26', building: '#20252F', buildingEdge: '#272D39', park: '#16261D', tree: '#1B3024', water: '#12273D', street: '#2A303C', casing: '#11141A', major: '#3D4352', majorCasing: '#0E1116' },
};

// Bir xil kirish → bir xil natija: plitkalar chegarasida chiziqlar uzilmaydi
const hash = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Dunyo koordinatalari (0..256 zoom 0 da): ~800 m oraliqda katta ko'chalar, ~160 m da oddiy ko'chalar
const MAJOR = 0.0068;
const STREET = MAJOR / 5;

function drawTile(ctx: CanvasRenderingContext2D, tx: number, ty: number, z: number, pal: Palette) {
  const k = 2 ** z; // dunyo birligidan pikselga
  const u0 = (tx * 256) / k, v0 = (ty * 256) / k, span = 256 / k;
  const X = (u: number) => (u - u0) * k;
  const Y = (v: number) => (v - v0) * k;
  const lines = (step: number, jitter: number, from: number) => {
    const out: number[] = [];
    for (let i = Math.floor(from / step) - 1; i <= Math.ceil((from + span) / step) + 1; i++) out.push((i + (hash(i, step) - 0.5) * jitter) * step);
    return out;
  };

  ctx.fillStyle = pal.land;
  ctx.fillRect(0, 0, 256, 256);

  const showStreets = STREET * k >= 8;
  const xs = lines(STREET, 0.35, u0), ys = lines(STREET, 0.35, v0);

  // Kvartallar va bog'lar
  if (showStreets) {
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const id = Math.round(xs[i] / STREET), jd = Math.round(ys[j] / STREET);
        const r = hash(id * 1.31, jd * 0.77);
        const pad = Math.max(1.5, STREET * k * 0.05);
        const bx = X(xs[i]) + pad, by = Y(ys[j]) + pad, bw = X(xs[i + 1]) - X(xs[i]) - pad * 2, bh = Y(ys[j + 1]) - Y(ys[j]) - pad * 2;
        ctx.fillStyle = r < 0.1 ? pal.park : pal.block;
        ctx.fillRect(bx, by, bw, bh);
        if (r < 0.1) {
          // bog': daraxtlar
          if (z >= 15) {
            ctx.fillStyle = pal.tree;
            for (let t = 0; t < 14; t++) {
              ctx.beginPath();
              ctx.arc(bx + hash(id + t, jd) * bw, by + hash(jd + t, id) * bh, Math.max(1.5, 2 ** (z - 16) * 4), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (z >= 15 && bw > 14 && bh > 14) {
          // binolar: kvartal ichida 2×2 / 3×2 bo'laklar
          const cols = r > 0.6 ? 3 : 2, rows = 2, g = Math.max(2, bw * 0.06);
          ctx.fillStyle = pal.building;
          ctx.strokeStyle = pal.buildingEdge;
          ctx.lineWidth = 1;
          for (let a = 0; a < cols; a++) {
            for (let b = 0; b < rows; b++) {
              const h = hash(id * 7 + a, jd * 5 + b);
              if (h < 0.12) continue;
              const cw = (bw - g * (cols + 1)) / cols, ch = (bh - g * (rows + 1)) / rows;
              const w = cw * (0.65 + h * 0.35), hh = ch * (0.6 + hash(a + id, b + jd) * 0.4);
              const x = bx + g + a * (cw + g), y = by + g + b * (ch + g);
              ctx.fillRect(x, y, w, hh);
              ctx.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
            }
          }
        }
      }
    }
  }

  // Kanal: sekin to'lqinlanuvchi suv yo'li
  const canalW = Math.max(3, 0.0007 * k);
  ctx.strokeStyle = pal.water;
  ctx.lineWidth = canalW;
  ctx.lineCap = 'round';
  for (let c = Math.floor(u0 / (MAJOR * 9)) - 1; c <= Math.ceil((u0 + span) / (MAJOR * 9)) + 1; c++) {
    const base = c * MAJOR * 9 + MAJOR * 2.5;
    ctx.beginPath();
    for (let s = 0; s <= 32; s++) {
      const v = v0 - span * 0.1 + (span * 1.2 * s) / 32;
      const u = base + Math.sin(v / (MAJOR * 1.7)) * MAJOR * 0.6;
      if (s === 0) ctx.moveTo(X(u), Y(v)); else ctx.lineTo(X(u), Y(v));
    }
    ctx.stroke();
  }

  const stroke = (pos: number[], vertical: boolean, width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (const p of pos) {
      if (vertical) { ctx.moveTo(X(p), -4); ctx.lineTo(X(p), 260); } else { ctx.moveTo(-4, Y(p)); ctx.lineTo(260, Y(p)); }
    }
    ctx.stroke();
  };

  // Oddiy ko'chalar
  if (showStreets) {
    const w = Math.min(12, Math.max(1.5, 2 ** (z - 15) * 4));
    stroke(xs, true, w + 1.5, pal.casing); stroke(ys, false, w + 1.5, pal.casing);
    stroke(xs, true, w, pal.street); stroke(ys, false, w, pal.street);
  }

  // Katta ko'chalar va diagonal shoh ko'cha
  const mx = lines(MAJOR, 0.12, u0), my = lines(MAJOR, 0.12, v0);
  const mw = Math.min(18, Math.max(2, 2 ** (z - 15) * 8));
  // har uchinchisi — shahar magistrali (sariq), qolganlari keng oq ko'chalar
  const primary = (a: number[]) => a.filter(p => Math.round(p / MAJOR) % 3 === 0);
  stroke(mx, true, mw + 2, pal.roadCasing); stroke(my, false, mw + 2, pal.roadCasing);
  stroke(mx, true, mw, pal.road); stroke(my, false, mw, pal.road);
  stroke(primary(mx), true, mw + 3, pal.majorCasing); stroke(primary(my), false, mw + 3, pal.majorCasing);
  stroke(primary(mx), true, mw + 1, pal.major); stroke(primary(my), false, mw + 1, pal.major);

  ctx.lineCap = 'round';
  for (let d = Math.floor((u0 + v0) / (MAJOR * 8)) - 2; d <= Math.ceil((u0 + v0 + span * 2) / (MAJOR * 8)) + 2; d++) {
    const c0 = d * MAJOR * 8 + MAJOR * 0.5; // u + v = c0
    for (const [w, col] of [[mw + 2, pal.majorCasing], [mw, pal.major]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(X(u0 - span), Y(c0 - (u0 - span)));
      ctx.lineTo(X(u0 + span * 2), Y(c0 - (u0 + span * 2)));
      ctx.stroke();
    }
  }
}

function makeOfflineLayer(theme: 'light' | 'dark') {
  const Layer = L.GridLayer.extend({
    createTile(coords: L.Coords) {
      const tile = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      tile.width = 256 * dpr;
      tile.height = 256 * dpr;
      const ctx = tile.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawTile(ctx, coords.x, coords.y, coords.z, PALETTE[theme]);
      }
      return tile;
    },
  }) as unknown as new (o?: L.GridLayerOptions) => L.GridLayer;
  return new Layer({ maxZoom: 19 });
}

/* ---------- Belgilar ---------- */

const CSS = `
.ym-map{background:var(--ym-land);font-family:inherit}
.ym-map .leaflet-control-attribution{background:rgba(255,255,255,.72);backdrop-filter:blur(6px);border-radius:8px;margin:0 0 6px 8px!important;padding:1px 7px;font:10px/1.5 Onest_500Medium,system-ui,sans-serif;color:#5b6472}
.ym-dark .leaflet-control-attribution{background:rgba(20,24,31,.72);color:#8b95a7}
.ym-map .leaflet-control-attribution a{color:inherit}
.ym-icon{background:none;border:none}
.ym-me{width:18px;height:18px;border-radius:50%;background:#2F7BFF;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);box-sizing:border-box;position:relative}
.ym-me:after{content:"";position:absolute;inset:-9px;border-radius:50%;background:rgba(47,123,255,.25);animation:ym-pulse 2s ease-out infinite}
.ym-pick{width:22px;height:22px;border-radius:50%;background:#0F1E3D;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);box-sizing:border-box;position:relative}
.ym-radar:before{content:"";position:absolute;left:50%;top:50%;width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,0,.0) 0,rgba(255,200,0,.28) 60%,rgba(255,200,0,0) 70%);animation:ym-radar 2.2s ease-out infinite;pointer-events:none}
@keyframes ym-radar{from{transform:scale(.15);opacity:1}to{transform:scale(1);opacity:0}}
.ym-pick:after{content:"";position:absolute;inset:-12px;border-radius:50%;background:rgba(15,30,61,.18);animation:ym-pulse 2s ease-out infinite}
.ym-dest{display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3))}
.ym-dest b{width:30px;height:30px;border-radius:10px;background:#FFC800;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.ym-dest i{width:3px;height:10px;border-radius:2px;background:#0E1525}
.ym-car{width:100%;height:100%;display:block;transition:transform .6s ease}
.ym-glide{transition:transform .45s linear}
.ym-zooming .ym-glide{transition:none}
.ym-flow{stroke-dasharray:2 14;animation:ym-flow 1s linear infinite}
@keyframes ym-flow{to{stroke-dashoffset:-16}}
@keyframes ym-pulse{from{transform:scale(.5);opacity:1}to{transform:scale(1.4);opacity:0}}
`;

let cssAdded = false;
function addCss() {
  if (cssAdded || typeof document === 'undefined') return;
  cssAdded = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

const FLAG_SVG = '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#0E1525" d="M5 21V4h9l.4 2H20v10h-7l-.4-2H7v7z"/></svg>';

const pickupIcon = (radar: boolean) =>
  L.divIcon({ className: 'ym-icon', html: `<div class="ym-pick${radar ? ' ym-radar' : ''}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
const destIcon = L.divIcon({ className: 'ym-icon', html: `<div class="ym-dest"><b>${FLAG_SVG}</b><i></i></div>`, iconSize: [30, 40], iconAnchor: [15, 40] });
const carIcon = (kind: 'taxi' | 'car', rot: number, w: number) =>
  L.divIcon({
    className: 'ym-icon ym-glide',
    html: `<img class="ym-car" src="${assetUri(CAR_TOP[kind])}" style="transform:rotate(${rot}deg)" alt="" draggable="false">`,
    iconSize: [w, w * 1.8],
    iconAnchor: [w / 2, w * 0.9],
  });

// Atrofdagi bo'sh mashinalar: olish nuqtasi atrofida sekin harakatlanadi
type Nearby = { lat: number; lng: number; rot: number };
const seedNearby = (c: LatLng): Nearby[] =>
  Array.from({ length: 7 }, (_, i) => ({
    lat: c.latitude + Math.sin(i * 1.7) * 0.0055 * (1 + (i % 3) * 0.45),
    lng: c.longitude + Math.cos(i * 1.7) * 0.0075 * (1 + (i % 2) * 0.55),
    rot: [0, 90, 180, 270][i % 4],
  }));

function setRot(m: L.Marker, rot: number) {
  const img = m.getElement()?.querySelector('img');
  if (img) img.style.transform = `rotate(${rot}deg)`;
}

/** Marshrut chizig'ini "chizilayotgandek" ko'rsatish */
function drawIn(line: L.Polyline) {
  const el = line.getElement() as SVGPathElement | undefined;
  if (!el?.getTotalLength) return;
  const len = el.getTotalLength();
  el.style.transition = 'none';
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
  requestAnimationFrame(() => {
    el.style.transition = 'stroke-dashoffset .9s ease-out';
    el.style.strokeDashoffset = '0';
    setTimeout(() => { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; el.style.transition = ''; }, 950);
  });
}

/* ---------- Xarita ---------- */

export default function TaxiMap(props: TaxiMapProps) {
  const { ref, initial, pickup, destination, route, driverPath, driverPos, showPickup, showNearby, searching = false, bottomPad, topPad, overlayBottom = 0, onCenterChange, onDragStart, userPos, fleet } = props;
  const { dark } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ pickup?: L.Marker; dest?: L.Marker; driver?: L.Marker; route?: L.LayerGroup; approach?: L.Polyline; nearby: L.Marker[]; fleet: Map<string, L.Marker>; me?: L.Marker; meAcc?: L.Circle }>({ nearby: [], fleet: new Map() });
  const cb = useRef({ onCenterChange, onDragStart });
  const pads = useRef({ topPad, bottomPad });
  const [offline, setOffline] = useState(false);
  const theme = dark ? 'dark' : 'light';
  const live = !!fleet;

  useEffect(() => { cb.current = { onCenterChange, onDragStart }; }, [onCenterChange, onDragStart]);
  useEffect(() => { pads.current = { topPad, bottomPad }; }, [topPad, bottomPad]);

  useImperativeHandle(ref, () => ({
    center: (p, zoomed = true) => {
      const m = map.current;
      if (!m) return;
      const z = zoomed ? 16 : 15;
      // Yuqori/pastki panellar hisobga olinadi: nuqta ko'rinadigan maydon markaziga tushadi
      const shift = (pads.current.bottomPad - pads.current.topPad) / 2;
      const target = m.unproject(m.project(ll(p), z).add([0, shift]), z);
      m.flyTo(target, z, { duration: 0.6 });
    },
    fit: pts => {
      const m = map.current;
      if (!m || !pts.length) return;
      m.flyToBounds(L.latLngBounds(pts.map(ll)), {
        paddingTopLeft: [48, pads.current.topPad + 40],
        paddingBottomRight: [48, pads.current.bottomPad + 40],
        duration: 0.7,
        maxZoom: 16,
      });
    },
  }), []);

  // Xaritani yaratish
  useEffect(() => {
    addCss();
    const el = box.current;
    if (!el) return;
    const m = L.map(el, { zoomControl: false, attributionControl: false, zoomSnap: 0.25, wheelPxPerZoomLevel: 90, inertia: true, minZoom: 4, maxZoom: 19 })
      .setView(ll(initial), 15.5);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m);
    m.on('dragstart', () => cb.current.onDragStart?.());
    m.on('moveend', () => { const c = m.getCenter(); cb.current.onCenterChange?.({ latitude: c.lat, longitude: c.lng }); });
    m.on('zoomstart', () => el.classList.add('ym-zooming'));
    m.on('zoomend', () => setTimeout(() => el.classList.remove('ym-zooming'), 50));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
    // xarita bir marta yaratiladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asosiy qatlam: haqiqiy plitkalar, ochilmasa — sxematik
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const el = m.getContainer();
    el.classList.add('ym-map');
    el.classList.toggle('ym-dark', dark);
    el.style.setProperty('--ym-land', PALETTE[theme].land);
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
  }, [theme, dark, offline]);

  // Mualliflik yozuvi pastki panel ustida tursin
  useEffect(() => {
    const c = map.current?.attributionControl?.getContainer()?.parentElement;
    if (c) c.style.bottom = `${overlayBottom}px`;
  }, [overlayBottom]);

  // Foydalanuvchining joyi: ko'k nuqta + GPS aniqligi doirasi
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    if (!userPos) { l.me?.remove(); l.meAcc?.remove(); l.me = l.meAcc = undefined; return; }
    const at = ll(userPos);
    const radius = Math.min(userPos.accuracy ?? 0, 1500);
    if (!l.me) {
      l.meAcc = L.circle(at, { radius, color: '#2F7BFF', weight: 1, opacity: 0.35, fillColor: '#2F7BFF', fillOpacity: 0.1, interactive: false }).addTo(m);
      l.me = L.marker(at, { icon: L.divIcon({ className: 'ym-icon', html: '<div class="ym-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, keyboard: false, zIndexOffset: 400 }).addTo(m);
    } else {
      l.me.setLatLng(at);
      l.meAcc?.setLatLng(at).setRadius(radius);
    }
  }, [userPos]);

  // Olish nuqtasi
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    if (showPickup && pickup) {
      if (!l.pickup) l.pickup = L.marker(ll(pickup), { icon: pickupIcon(searching), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(m);
      else { l.pickup.setLatLng(ll(pickup)); l.pickup.setIcon(pickupIcon(searching)); }
    } else if (l.pickup) { l.pickup.remove(); l.pickup = undefined; }
  }, [showPickup, pickup, searching]);

  // Manzil
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    if (destination) {
      if (!l.dest) l.dest = L.marker(ll(destination), { icon: destIcon, interactive: false, keyboard: false, zIndexOffset: 600 }).addTo(m);
      else l.dest.setLatLng(ll(destination));
    } else if (l.dest) { l.dest.remove(); l.dest = undefined; }
  }, [destination]);

  // Marshrut: soya + asosiy chiziq + harakatlanuvchi oqim
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    l.route?.remove();
    l.route = undefined;
    if (!route || route.length < 2) return;
    const pts = route.map(ll);
    const main = L.polyline(pts, { color: dark ? '#FFC800' : '#0F1E3D', weight: 6, lineCap: 'round', lineJoin: 'round', interactive: false });
    l.route = L.layerGroup([
      L.polyline(pts, { color: dark ? '#0B0E13' : '#FFFFFF', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false }),
      main,
      L.polyline(pts, { color: dark ? '#0E1525' : '#FFC800', weight: 2.5, className: 'ym-flow', interactive: false }),
    ]).addTo(m);
    drawIn(main);
  }, [route, dark]);

  // Haydovchining kelish yo'li (punktir)
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    l.approach?.remove();
    l.approach = undefined;
    if (driverPath && driverPath.length > 1 && !route) {
      l.approach = L.polyline(driverPath.map(ll), { color: '#2457F5', weight: 4, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(m);
    }
  }, [driverPath, route]);

  // Haydovchi mashinasi — yo'nalishga burilib, silliq harakatlanadi
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    if (!driverPos) { l.driver?.remove(); l.driver = undefined; return; }
    let heading = 0;
    if (driverPath && driverPath.length > 1) {
      let best = 0, bestD = Infinity;
      driverPath.forEach((p, i) => {
        const d = (p.latitude - driverPos.latitude) ** 2 + (p.longitude - driverPos.longitude) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      });
      const i = Math.min(best, driverPath.length - 2);
      heading = bearing(driverPath[i], driverPath[i + 1]);
    }
    if (!l.driver) l.driver = L.marker(ll(driverPos), { icon: carIcon('taxi', heading, 28), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(m);
    else { l.driver.setLatLng(ll(driverPos)); setRot(l.driver, heading); }
  }, [driverPos, driverPath]);

  // Atrofdagi mashinalar
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    l.nearby.forEach(x => x.remove());
    l.nearby = [];
    if (!showNearby || live) return;
    const cars = seedNearby(pickup ?? initial);
    l.nearby = cars.map((c, i) => L.marker([c.lat, c.lng], { icon: carIcon(i % 3 === 2 ? 'car' : 'taxi', c.rot, 21), interactive: false, keyboard: false }).addTo(m));
    // Har 2.5 soniyada mashinalar ko'cha bo'ylab biroz siljiydi, ba'zan buriladi
    let tick = 0;
    const iv = setInterval(() => {
      tick++;
      cars.forEach((c, i) => {
        if (hash(i, tick) < 0.25) c.rot = (c.rot + (hash(tick, i) < 0.5 ? 90 : 270)) % 360;
        const step = 0.00045 * (0.5 + hash(i * 3, tick));
        const r = (c.rot * Math.PI) / 180;
        c.lat += Math.cos(r) * step;
        c.lng += Math.sin(r) * step * 1.3;
        l.nearby[i]?.setLatLng([c.lat, c.lng]);
        if (l.nearby[i]) setRot(l.nearby[i], c.rot);
      });
    }, 2500);
    return () => clearInterval(iv);
    // olish nuqtasi o'zgarganda mashinalar qayta joylashmaydi — faqat ko'rinish yoqilganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNearby, initial, live]);

  // Haqiqiy haydovchilar (dispetcher serveri)
  useEffect(() => {
    const m = map.current, l = layers.current;
    if (!m) return;
    const list = showNearby ? fleet ?? [] : [];
    const ids = new Set(list.map(f => f.id));
    l.fleet.forEach((mk, id) => { if (!ids.has(id)) { mk.remove(); l.fleet.delete(id); } });
    list.forEach(f => {
      const mk = l.fleet.get(f.id);
      if (!mk) l.fleet.set(f.id, L.marker(ll(f.pos), { icon: carIcon('taxi', f.heading, 21), interactive: false, keyboard: false }).addTo(m));
      else { mk.setLatLng(ll(f.pos)); setRot(mk, f.heading); }
    });
  }, [fleet, showNearby]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: PALETTE[theme].land }]}>
      <div ref={box} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}
