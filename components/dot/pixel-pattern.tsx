/**
 * SVG <pattern> that gives filled chart areas the micro dot-matrix texture
 * (3px squares on a 4px grid). Render inside <defs>; fill with `url(#id)`.
 */
export function PixelPattern({ id, className }: { id: string; className?: string }) {
  return (
    <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse">
      <rect width={3} height={3} className={className ?? "fill-foreground"} />
    </pattern>
  );
}
