import { useEffect, useState } from "react";

export type AccentId = "yellow" | "white" | "orange" | "red" | "pink" | "violet" | "cyan" | "green";

export type AppAccent = {
  id: AccentId;
  name: string;
  gold: string;
  goldBright: string;
};

export const APP_ACCENTS: AppAccent[] = [
  { id: "yellow", name: "Amarelo", gold: "#c4be6a", goldBright: "#9e9848" },
  { id: "white", name: "Branco", gold: "#c8c8c8", goldBright: "#9a9a9a" },
  { id: "orange", name: "Laranja", gold: "#d08a58", goldBright: "#a86a3e" },
  { id: "red", name: "Vermelho", gold: "#c8726c", goldBright: "#a4544e" },
  { id: "pink", name: "Rosa", gold: "#c87e98", goldBright: "#a45e78" },
  { id: "violet", name: "Violeta", gold: "#9a84bc", goldBright: "#7a6698" },
  { id: "cyan", name: "Ciano", gold: "#6ea8b4", goldBright: "#548490" },
  { id: "green", name: "Verde", gold: "#86a86a", goldBright: "#66844e" },
];

const STORAGE_KEY = "gerador-accent";

export function getAccent(id: string | null | undefined): AppAccent {
  return APP_ACCENTS.find((item) => item.id === id) ?? APP_ACCENTS[0];
}

export function readSavedAccentId(): AccentId {
  try {
    return getAccent(window.localStorage.getItem(STORAGE_KEY)).id;
  } catch {
    return "yellow";
  }
}

export function applyAppAccent(id: AccentId | string) {
  const accent = getAccent(id);
  const root = document.documentElement;
  root.dataset.accent = accent.id;
  root.style.setProperty("--color-gold", accent.gold);
  root.style.setProperty("--color-gold-bright", accent.goldBright);
  root.style.setProperty("--color-cream", accent.gold);
  root.style.setProperty("--color-accent-1", accent.gold);
  root.style.setProperty("--color-accent-2", accent.gold);
  root.style.setProperty("--color-accent-3", accent.goldBright);
  try {
    window.localStorage.setItem(STORAGE_KEY, accent.id);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event("app-accent-change"));
  return accent;
}

export function loadAppAccent() {
  return applyAppAccent(readSavedAccentId());
}

export function useAppAccent(): AccentId {
  const [id, setId] = useState<AccentId>(() => readSavedAccentId());
  useEffect(() => {
    const sync = () => setId(readSavedAccentId());
    window.addEventListener("app-accent-change", sync);
    return () => window.removeEventListener("app-accent-change", sync);
  }, []);
  return id;
}
