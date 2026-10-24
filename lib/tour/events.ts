type Listener = (name: string) => void;

const listeners = new Set<Listener>();

/** Tell a running tutorial that the user did something. No-op when nothing listens. */
export function tourEvent(name: string): void {
  for (const listener of listeners) listener(name);
}

export function subscribeTourEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
