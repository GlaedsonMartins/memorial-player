import { SetupPage } from "./pages/SetupPage";
import { useEffect, useState } from "react";
import { loadDeviceConfig } from "./cache/deviceConfigStore";
import { RoomPlayerPage } from "./pages/RoomPlayerPage";
import { useAutoHideCursor } from "./hooks/useAutoHideCursor";

function legacyRoomId(number: string) {
  return `room-${number.padStart(2, "0")}`;
}

function parseRoomId(pathname: string) {
  const match = pathname.match(/^\/sala\/([^/]+)\/?$/);
  if (!match) return null;
  const segment = decodeURIComponent(match[1]);
  if (/^\d+$/.test(segment)) return legacyRoomId(segment);
  if (/^room-[a-zA-Z0-9-]+$/.test(segment)) return segment;
  return null;
}

export function App() {
  useAutoHideCursor();
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadDeviceConfig().then((config) => {
      if (cancelled) return;
      if (config) {
        const destination = `/sala/${encodeURIComponent(config.roomId)}`;
        if (window.location.pathname !== destination) {
          window.location.replace(destination);
          return;
        }
      }
      setChecked(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);
  if (!checked) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      {failed ? "Nao foi possivel verificar o dispositivo. Recarregue a pagina." : "Verificando dispositivo..."}
    </main>
  );
  const pathname = window.location.pathname;
  if (/^\/setup(?:\/reset)?\/?$/.test(pathname)) return <SetupPage />;

  const roomId = parseRoomId(pathname);
  if (roomId) return <RoomPlayerPage routeRoomId={roomId} />;

  return <RoomPlayerPage routeRoomId={null} />;
}
