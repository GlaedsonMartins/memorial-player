import { useMemo, useState } from "react";
import { AudioPlaylist } from "../components/AudioPlaylist";
import { IdleScreen } from "../components/IdleScreen";
import { PlaybackStage } from "../components/PlaybackStage";
import { StatusOverlay } from "../components/StatusOverlay";
import { useKioskHardening } from "../hooks/useKioskHardening";
import { useDeviceSession } from "../hooks/useDeviceSession";
import { usePlayerSnapshot } from "../hooks/usePlayerSnapshot";

export function RoomPlayerPage({ routeRoomId }: { routeRoomId: string | null }) {
  useKioskHardening();
  const device = useDeviceSession();
  const [videoActive, setVideoActive] = useState(false);
  const configuredRoomId = device.config?.roomId ?? routeRoomId ?? "";
  const routeAllowed = !routeRoomId || !device.config?.roomId || device.config.roomId === routeRoomId;
  const player = usePlayerSnapshot(
    configuredRoomId,
    device.config?.deviceId ?? "",
    Boolean(device.config && routeAllowed),
  );

  const roomName = player.snapshot.room?.name ?? configuredRoomId;
  const slideDuration = player.snapshot.tribute?.slideDuration ?? player.snapshot.session?.slideDuration ?? 5;
  const playing =
    player.snapshot.session?.status === "PLAYING" &&
    player.snapshot.tribute?.status === "ACTIVE" &&
    player.queue.length > 0;
  const tracks = useMemo(() => player.snapshot.playlist?.tracks ?? [], [player.snapshot.playlist?.tracks]);

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
            onVideoModeChange={setVideoActive}
          />
          <AudioPlaylist tracks={tracks} cachedTracks={player.cachedTracks} paused={videoActive} />
        </>
      ) : (
        <IdleScreen settings={player.snapshot.settings} roomName={roomName} />
      )}
      <StatusOverlay state={device.loading ? "CONNECTING" : player.state} error={device.error ?? player.error} />
    </>
  );
}
