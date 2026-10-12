import { Fragment } from "react";

export type RichTone = "signal" | "positive" | "ink";

const TONE_CLASS: Record<RichTone, string> = {
  signal: "text-signal font-semibold",
  positive: "text-positive font-semibold",
  ink: "font-semibold",
};

/** Renders `**bold**` segments from i18n copy; the nth segment takes the nth tone. */
export function RichLine({ text, tones = [] }: { text: string; tones?: RichTone[] }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className={TONE_CLASS[tones[(i - 1) / 2] ?? "ink"]}>
            {part}
          </b>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  );
}
