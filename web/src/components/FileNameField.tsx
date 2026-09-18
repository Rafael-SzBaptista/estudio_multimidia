import { useEffect, useState } from "react";
import { exportFilename } from "../lib/buildSlides";

export function useExportFileName(preset: string, fallback = "slides") {
  const [name, setName] = useState(preset);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) setName(preset);
  }, [preset, touched]);

  return {
    name,
    filename: exportFilename(name, fallback),
    setName(value: string) {
      setTouched(true);
      setName(value);
    },
  };
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
};

export function FileNameField({ value, onChange, suffix = ".pptx" }: Props) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-widest text-mist uppercase">
        Nome do arquivo
      </span>
      <div className="flex items-center rounded-xl border border-white/10 bg-ink-soft ring-gold/40 focus-within:ring-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\.(pptx?|odp)$/i, ""))}
          spellCheck={false}
          aria-label="Nome do arquivo"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-cream outline-none"
        />
        <span className="shrink-0 pr-3 text-sm text-mist">{suffix}</span>
      </div>
    </label>
  );
}
