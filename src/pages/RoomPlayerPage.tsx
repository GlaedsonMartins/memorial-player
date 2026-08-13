import { useMemo, useState } from "react";
import { AudioPlaylist, type AudioPlaybackStatus } from "../components/AudioPlaylist";
import { IdleScreen } from "../components/IdleScreen";
import { PlaybackStage } from "../components/PlaybackStage";
import { StatusOverlay } from "../components/StatusOverlay";
import { useKioskHardening } from "../hooks/useKioskHardening";
import { useDeviceSession } from "../hooks/useDeviceSession";
import { usePlayerSnapshot } from "../hooks/usePlayerSnapshot";
import { isPlayable } from "../services/playerService";
import type { PlaybackItem } from "../types/memorial";

export function RoomPlayerPage({ routeRoomId }: { routeRoomId: string | null }) {
  useKioskHardening();
  const device = useDeviceSession();
  const [activeMedia, setActiveMedia] = useState<PlaybackItem | null>(null);
  const [audioStatus, setAudioStatus] = useState<{
    status: AudioPlaybackStatus;
    message?: string;
  }>({ status: "empty" });
  const configuredRoomId = device.config?.roomId ?? routeRoomId ?? "";
  const routeAllowed = !routeRoomId || !device.config?.roomId || device.config.roomId === routeRoomId;
  const player = usePlayerSnapshot(
    configuredRoomId,
    device.config?.deviceId ?? "",
    Boolean(device.config && routeAllowed),
  );

  const roomName = player.snapshot.room?.name ?? configuredRoomId;
  const slideDuration = player.snapshot.tribute?.slideDuration ?? player.snapshot.session?.slideDuration ?? 5;
  const playing = isPlayable(player.snapshot) && player.queue.length > 0;
  const tracks = useMemo(() => player.snapshot.playlist?.tracks ?? [], [player.snapshot.playlist?.tracks]);
  const mutePlaylist = activeMedia?.type === "video" && activeMedia.videoMuted === false;

  if (!device.configured) {
    return <IdleScreen settings={null} roomName="Firebase nao configurado" />;
  }

  if (device.loading) {
    return <IdleScreen settings={null} roomName="Inicializando dispositivo..." />;
  }

  if (!device.config) {
    return <IdleScreen settings={null} roomName="Dispositivo nao registrado. Abra /setup." />;
  }

  if (!routeAllowed) {
    return <IdleScreen settings={null} roomName="Dispositivo vinculado a outra sala." />;
  }

  return (
    <>
      {playing ? (
        <>
          <PlaybackStage
            queue={player.queue}
            slideDuration={slideDuration}
            onCurrentItemChange={setActiveMedia}
          />
          <AudioPlaylist
            tracks={tracks}
            cachedTracks={player.cachedTracks}
            muted={mutePlaylist}
            onStatus={(status, message) => setAudioStatus({ status, message })}
          />
          {audioStatus.status === "blocked" && (
            <button
              type="button"
              className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/75 px-5 py-3 text-sm text-white shadow-lg backdrop-blur"
              onClick={() => window.dispatchEvent(new PointerEvent("pointerdown"))}
            >
              Clique para ativar a musica
            </button>
          )}
          {audioStatus.status === "empty" && tracks.length === 0 && (
            <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-xs text-white/85 backdrop-blur">
              Esta homenagem nao possui musica configurada.
            </div>
          )}
          {audioStatus.status === "error" && (
            <div className="fixed bottom-6 left-1/2 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-red-950/85 px-4 py-2 text-center text-xs text-red-100 backdrop-blur">
              {audioStatus.message ?? "Nao foi possivel reproduzir a musica."}
            </div>
          )}
        </>
      ) : (
        <IdleScreen settings={player.snapshot.settings} roomName={roomName} />
      )}
      <StatusOverlay state={device.loading ? "CONNECTING" : player.state} error={device.error ?? player.error} />
    </>
  );
}
