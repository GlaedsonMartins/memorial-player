import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MonitorUp, RotateCcw } from "lucide-react";
import { saveDeviceConfig } from "../cache/deviceConfigStore";
import type { DeviceConfig } from "../types/memorial";
import { listActiveRooms, registerDevice } from "../services/deviceRegistrationService";
import { getFirebaseAuth } from "../firebase/client";
import type { ActiveRoomOption } from "../types/memorial";

export function SetupPage() {
  const [rooms, setRooms] = useState<ActiveRoomOption[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listActiveRooms()
      .then((items) => {
        if (cancelled) return;
        setRooms(items);
        setRoomId(items[0]?.id ?? "");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Falha ao carregar salas ativas."),
      )
      .finally(() => !cancelled && setLoadingRooms(false));

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const config = await registerDevice(deviceName.trim(), roomId);

      if (import.meta.env.DEV) {
        console.debug("registerDevice returned:", config);
      }

      // Only save local configuration after authentication completed
      const stored: DeviceConfig = {
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        roomId: config.roomId,
        deviceToken: config.deviceToken,
        setupCompleted: true,
        playerUrl: config.playerUrl,
        roomNumber: config.roomNumber,
      } as DeviceConfig;

      await saveDeviceConfig(stored);

      if (import.meta.env.DEV) {
        console.debug("saved device config:", stored);
        console.debug("authenticated uid:", getFirebaseAuth().currentUser?.uid ?? null);
      }

      const redirectUrl = config.playerUrl ?? `/sala/${config.roomId}`;
      window.location.replace(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar dispositivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10">
            <MonitorUp className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Registrar Memorial Player</h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure este mini computador uma unica vez e vincule-o a uma sala.
            </p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-500/15 p-3 text-sm text-red-100">{error}</div>}

        <div className="space-y-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-slate-300">Nome do dispositivo</span>
            <input
              value={deviceName}
              maxLength={60}
              onChange={(event) => setDeviceName(event.target.value)}
              placeholder="TV Sala Tulipa"
              className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 outline-none focus:border-blue-400"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-slate-300">Sala</span>
            <select
              value={roomId}
              disabled={loadingRooms}
              onChange={(event) => setRoomId(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 outline-none focus:border-blue-400"
            >
              {loadingRooms ? (
                <option>Carregando salas...</option>
              ) : (
                rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {String(room.number).padStart(2, "0")} - {room.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <button
            disabled={saving || loadingRooms || !deviceName.trim() || !roomId}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Registrar Dispositivo
          </button>

          <a
            href="/setup/reset"
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
            Reconfigurar este Player
          </a>
        </div>
      </form>
    </main>
  );
}
