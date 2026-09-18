import { useEffect, useRef, useState } from "react";
import { ChevronDown, Type } from "lucide-react";
import { AUTHOR_SIZE, FONT_SIZE, TITLE_SIZE } from "../lib/buildSlides";

type Props = {
  size: number;
  onChange: (size: number) => void;
};

const OPTIONS = [
  { label: "Título", size: TITLE_SIZE },
  { label: "Subtítulo", size: AUTHOR_SIZE },
  { label: "Letra", size: FONT_SIZE },
] as const;

export function FontPicker({ size, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((option) => option.size === size)?.label ?? "Letra";

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

  function choose(next: number) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Fonte de escrita: ${current}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10"
      >
        <Type size={16} />
        Fonte
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Fonte de escrita"
          className="theme-cascade absolute top-full left-0 z-50 mt-2 min-w-[10.5rem] rounded-2xl border border-white/10 bg-black/85 px-1.5 py-2 backdrop-blur-md"
        >
          {OPTIONS.map((option, index) => {
            const selected = option.label === current;
            return (
              <li key={option.label} style={{ animationDelay: `${index * 28}ms` }}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option.size)}
                  className={`flex w-full items-center rounded-full px-3 py-1.5 text-left text-sm transition ${
                    selected ? "bg-gold text-ink" : "text-mist hover:bg-white/8 hover:text-cream"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
