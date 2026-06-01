/**
 * Remounts on navigation — light fade-in when route content replaces the wireframe.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      {children}
    </div>
  );
}
