import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { APP_ACCENTS, applyAppAccent, getAccent, readSavedAccentId, type AccentId } from "../lib/appAccent";

export function ThemePicker() {
  const [accentId, setAccentId] = useState<AccentId>(() => readSavedAccentId());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getAccent(accentId);

  useEffect(() => {
    applyAppAccent(accentId);
  }, [accentId]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(id: AccentId) {
    setAccentId(id);
    applyAppAccent(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="absolute top-5 right-5 z-20 sm:top-6 sm:right-6">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tema de cores: ${current.name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full py-1 pr-1 pl-1 transition hover:opacity-90"
      >
        <span
          className="h-8 w-8 rounded-full border border-white/20 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{ background: current.gold }}
        />
        <ChevronDown
          size={16}
          className={`text-mist transition ${open ? "rotate-180 text-gold" : ""}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Cores do tema"
          className="theme-cascade absolute top-full right-0 mt-2 flex flex-col items-center gap-2 rounded-full border border-white/10 bg-black/80 px-1.5 py-2 backdrop-blur-md"
        >
          {APP_ACCENTS.map((accent, index) => {
            const selected = accent.id === accentId;
            return (
              <li key={accent.id} style={{ animationDelay: `${index * 28}ms` }}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={accent.name}
                  title={accent.name}
                  onClick={() => choose(accent.id)}
                  className={`h-7 w-7 rounded-full border transition hover:scale-110 ${
                    selected ? "border-white shadow-[0_0_0_2px_var(--color-gold)]" : "border-white/25"
                  }`}
                  style={{ background: accent.gold }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
