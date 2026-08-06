import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import type { PlayerState } from "../types/memorial";

export function StatusOverlay({ state, error }: { state: PlayerState; error: string | null }) {
  if (state === "PLAYING" && !error) return null;

  const offline = state === "OFFLINE";
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex items-center gap-2 rounded-md border border-white/10 bg-black/55 px-3 py-2 text-xs text-slate-200 backdrop-blur">
      {error ? (
        <AlertTriangle className="h-4 w-4 text-amber-300" />
      ) : offline ? (
        <WifiOff className="h-4 w-4 text-amber-300" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
      )}
      <span>{error ?? (offline ? "Offline - usando cache" : state)}</span>
    </div>
  );
}
