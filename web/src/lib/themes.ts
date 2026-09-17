import { getAccent, readSavedAccentId, type AppAccent } from "./appAccent";

export type ThemeId = "midnight" | "forest" | "goldpath" | "ocean" | "dusk";

export type Theme = {
  id: ThemeId;
  name: string;
  hint: string;
};

export const THEMES: Theme[] = [
  { id: "midnight", name: "Meia-noite", hint: "céu profundo e chama" },
  { id: "goldpath", name: "Caminho", hint: "luz no fim do túnel" },
  { id: "forest", name: "Floresta", hint: "névoa e folhas" },
  { id: "ocean", name: "Oceano", hint: "água e horizonte" },
  { id: "dusk", name: "Entardecer", hint: "âmbar sobre as colinas" },
];

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "").padEnd(6, "0");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fillRadial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: [number, string][],
) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function paintTheme(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: ThemeId,
  accent: AppAccent = getAccent(readSavedAccentId()),
) {
  const main = accent.gold;
  const dim = accent.goldBright;
  const deep = mixHex(dim, "#000000", 0.28);

  ctx.clearRect(0, 0, w, h);

  if (theme === "midnight") {
    fillRadial(ctx, w * 0.5, h * 0.08, 20, h * 0.95, [
      [0, main],
      [0.12, dim],
      [0.35, "#404040"],
      [0.7, "#202020"],
      [1, "#000000"],
    ]);
    ctx.fillStyle = withAlpha(main, 0.45);
    for (let i = 0; i < 90; i++) {
      const x = ((i * 97) % w) + (i % 7);
      const y = ((i * 53) % Math.floor(h * 0.55)) + 8;
      ctx.beginPath();
      ctx.arc(x, y, i % 5 === 0 ? 1.4 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === "goldpath") {
    fillRadial(ctx, w * 0.5, h * 0.18, 10, w * 0.72, [
      [0, main],
      [0.1, dim],
      [0.28, dim],
      [0.55, "#404040"],
      [1, "#000000"],
    ]);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = dim;
    ctx.lineWidth = 6;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.2, 80 + i * 48, 46 + i * 34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (theme === "forest") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, deep);
    g.addColorStop(0.35, "#5f5f5f");
    g.addColorStop(0.7, "#202020");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.62);
    ctx.lineTo(w * 0.18, h * 0.42);
    ctx.lineTo(w * 0.32, h * 0.58);
    ctx.lineTo(w * 0.5, h * 0.36);
    ctx.lineTo(w * 0.68, h * 0.56);
    ctx.lineTo(w * 0.84, h * 0.4);
    ctx.lineTo(w, h * 0.58);
    ctx.lineTo(w, h);
    ctx.fill();
  } else if (theme === "ocean") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, dim);
    g.addColorStop(0.28, "#5f5f5f");
    g.addColorStop(0.62, "#202020");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = withAlpha(main, 0.14);
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const y = h * 0.55 + i * 28;
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, y + Math.sin(x / 70 + i) * 10);
      }
      ctx.stroke();
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
    g.addColorStop(0, main);
    g.addColorStop(0.35, deep);
    g.addColorStop(0.7, "#404040");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(32, 32, 32, 0.55)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.72);
    ctx.quadraticCurveTo(w * 0.35, h * 0.5, w * 0.7, h * 0.7);
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(w, h);
    ctx.fill();
  }
}

export function themeToDataUrl(theme: ThemeId, w = 1920, h = 1080): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  paintTheme(ctx, w, h, theme);
  return canvas.toDataURL("image/jpeg", 0.92);
}
