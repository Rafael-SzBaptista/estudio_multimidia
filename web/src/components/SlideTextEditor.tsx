import { useLayoutEffect, useRef, useState } from "react";
import {
  deleteInLine,
  emptyLine,
  insertInLine,
  joinLines,
  lineLength,
  lineText,
  MAX_SLIDE_LINES,
  splitLine,
  type SlideLine,
} from "../lib/buildSlides";

type Pos = { line: number; offset: number };

type Props = {
  lines: SlideLine[];
  writingSize: number;
  fontSize: (size: number) => string | number;
  onChange: (lines: SlideLine[]) => void;
};

function cmp(a: Pos, b: Pos) {
  return a.line === b.line ? a.offset - b.offset : a.line - b.line;
}

function ordered(a: Pos, b: Pos): [Pos, Pos] {
  return cmp(a, b) <= 0 ? [a, b] : [b, a];
}

function normalize(lines: SlideLine[]): SlideLine[] {
  return lines.length ? lines : [emptyLine()];
}

function visibleText(text: string) {
  return text.replaceAll(" ", "\u00A0");
}

export function SlideTextEditor({ lines, writingSize, fontSize, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const restoreCaret = useRef(false);
  const [caret, setCaret] = useState<{ anchor: Pos; focus: Pos }>({
    anchor: { line: 0, offset: 0 },
    focus: { line: 0, offset: 0 },
  });
  const value = normalize(lines);
  const empty = value.every((line) => !lineText(line));

  useLayoutEffect(() => {
    if (!restoreCaret.current) return;
    restoreCaret.current = false;
    const root = rootRef.current;
    if (!root || document.activeElement !== root) return;
    const lineEl = root.querySelectorAll<HTMLElement>("[data-line]")[caret.focus.line];
    if (!lineEl) return;
    const sel = window.getSelection();
    if (!sel) return;

    const range = document.createRange();
    let remaining = caret.focus.offset;
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      const current = walker.currentNode as Text;
      if (remaining <= current.length) {
        node = current;
        break;
      }
      remaining -= current.length;
    }
    if (node) range.setStart(node, remaining);
    else range.setStart(lineEl, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [caret, value]);

  function readPos(node: Node, offset: number): Pos | null {
    const root = rootRef.current;
    if (!root) return null;
    const lineEls = [...root.querySelectorAll<HTMLElement>("[data-line]")];
    const lineEl = lineEls.find((el) => el === node || el.contains(node));
    if (!lineEl) return null;
    const line = lineEls.indexOf(lineEl);
    if (node === lineEl) {
      return { line, offset: offset >= lineEl.childNodes.length ? lineLength(value[line] ?? emptyLine()) : 0 };
    }
    let count = 0;
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const current = walker.currentNode as Text;
      if (current === node) return { line, offset: count + offset };
      count += current.length;
    }
    return { line, offset: lineLength(value[line] ?? emptyLine()) };
  }

  function syncCaret() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const anchor = readPos(range.startContainer, range.startOffset);
    const focus = range.collapsed
      ? anchor
      : readPos(range.endContainer, range.endOffset);
    if (!anchor || !focus) return;
    setCaret({ anchor, focus });
  }

  function apply(next: SlideLine[], nextCaret: Pos) {
    restoreCaret.current = true;
    onChange(next);
    setCaret({ anchor: nextCaret, focus: nextCaret });
  }

  function deleteSelection(base: SlideLine[], from: Pos, to: Pos): { lines: SlideLine[]; caret: Pos } {
    if (from.line === to.line) {
      const next = base.map((line, i) => (i === from.line ? deleteInLine(line, from.offset, to.offset) : line));
      return { lines: next, caret: from };
    }
    const first = deleteInLine(base[from.line], from.offset, lineLength(base[from.line]));
    const last = deleteInLine(base[to.line], 0, to.offset);
    const merged = joinLines(first, last);
    const next = [...base.slice(0, from.line), merged, ...base.slice(to.line + 1)];
    return { lines: next.length ? next : [emptyLine()], caret: from };
  }

  function insert(text: string) {
    if (!text) return;
    const [from, to] = ordered(caret.anchor, caret.focus);
    let base = value;
    let pos = from;
    if (cmp(from, to) !== 0) {
      const removed = deleteSelection(base, from, to);
      base = removed.lines;
      pos = removed.caret;
    }

    const parts = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const current = base[pos.line] ?? emptyLine();
    let next = [...base];
    next[pos.line] = insertInLine(current, pos.offset, parts[0], writingSize);
    let line = pos.line;
    let offset = pos.offset + [...parts[0].toUpperCase()].filter((ch) => ch !== "\n").length;

    for (const part of parts.slice(1)) {
      if (next.length >= MAX_SLIDE_LINES) break;
      const [left, right] = splitLine(next[line], offset);
      next = [...next.slice(0, line), left, insertInLine(right, 0, part, writingSize), ...next.slice(line + 1)];
      line += 1;
      offset = [...part.toUpperCase()].length;
    }

    apply(next, { line, offset });
  }

  function backspace() {
    const [from, to] = ordered(caret.anchor, caret.focus);
    if (cmp(from, to) !== 0) {
      const removed = deleteSelection(value, from, to);
      apply(removed.lines, removed.caret);
      return;
    }
    if (from.offset > 0) {
      const next = value.map((line, i) =>
        i === from.line ? deleteInLine(line, from.offset - 1, from.offset) : line,
      );
      apply(next, { line: from.line, offset: from.offset - 1 });
      return;
    }
    if (from.line === 0) return;
    const prevLen = lineLength(value[from.line - 1]);
    const merged = joinLines(value[from.line - 1], value[from.line]);
    const next = [...value.slice(0, from.line - 1), merged, ...value.slice(from.line + 1)];
    apply(next, { line: from.line - 1, offset: prevLen });
  }

  function removeForward() {
    const [from, to] = ordered(caret.anchor, caret.focus);
    if (cmp(from, to) !== 0) {
      const removed = deleteSelection(value, from, to);
      apply(removed.lines, removed.caret);
      return;
    }
    const len = lineLength(value[from.line] ?? emptyLine());
    if (from.offset < len) {
      const next = value.map((line, i) =>
        i === from.line ? deleteInLine(line, from.offset, from.offset + 1) : line,
      );
      apply(next, from);
      return;
    }
    if (from.line >= value.length - 1) return;
    const merged = joinLines(value[from.line], value[from.line + 1]);
    const next = [...value.slice(0, from.line), merged, ...value.slice(from.line + 2)];
    apply(next, from);
  }

  function enter() {
    if (value.length >= MAX_SLIDE_LINES) return;
    const [from, to] = ordered(caret.anchor, caret.focus);
    let base = value;
    let pos = from;
    if (cmp(from, to) !== 0) {
      const removed = deleteSelection(base, from, to);
      base = removed.lines;
      pos = removed.caret;
    }
    const [left, right] = splitLine(base[pos.line] ?? emptyLine(), pos.offset);
    const next = [...base.slice(0, pos.line), left, right, ...base.slice(pos.line + 1)];
    apply(next, { line: pos.line + 1, offset: 0 });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (composing.current) return;
    if (event.key === "Enter") {
      event.preventDefault();
      enter();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      removeForward();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1) {
      event.preventDefault();
      insert(event.key);
    }
  }

  return (
    <div className="relative w-full">
      {empty ? (
        <div className="pointer-events-none absolute inset-0 text-white/35">Escreva aqui</div>
      ) : null}
      <div
        ref={rootRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline="true"
        aria-label="Texto do slide"
        aria-placeholder="Escreva aqui"
        className="w-full text-center font-lyrics font-bold text-white uppercase outline-none"
        onBeforeInput={(event) => {
          if (composing.current) return;
          event.preventDefault();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={syncCaret}
        onMouseUp={syncCaret}
        onClick={syncCaret}
        onPaste={(event) => {
          event.preventDefault();
          insert(event.clipboardData.getData("text/plain"));
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          insert(event.data);
        }}
      >
        {value.map((line, i) => (
          <div
            key={i}
            data-line
            className="min-h-[1.12em] w-full min-w-0 overflow-hidden leading-[1.12] whitespace-pre"
            style={{ marginTop: i ? "0.14em" : 0 }}
          >
            {line.runs.length ? (
              line.runs.map((run, j) => (
                <span key={`${i}-${j}`} style={{ fontSize: fontSize(run.size) }}>
                  {visibleText(run.text)}
                </span>
              ))
            ) : (
              <br />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
