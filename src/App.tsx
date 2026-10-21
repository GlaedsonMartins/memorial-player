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

function AppContent() {
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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function FullscreenControl() {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement || (document as FullscreenDocument).webkitFullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = async () => {
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenElement;
    setMessage("");
    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        setMessage("Este navegador não oferece tela cheia. Tente abrir no Chrome ou instalar o aplicativo na tela inicial.");
      }
    } catch {
      setMessage("Não foi possível ativar a tela cheia. Toque no botão para tentar novamente.");
    }
  };

  return (
    <div className="fullscreen-controls fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={active}
        aria-label={active ? "Sair da tela cheia" : "Entrar em tela cheia"}
        className="rounded-full border border-white/20 bg-black/70 px-4 py-3 text-sm text-white shadow-lg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {active ? "Sair da tela cheia" : "Tela cheia"}
      </button>
      {message && <p role="status" className="max-w-sm rounded-xl bg-black/85 p-3 text-sm text-white">{message}</p>}
    </div>
  );
}

export function App() {
  return <><AppContent /><FullscreenControl /></>;
}
