import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { hasFirebaseConfig } from "../firebase/client";
import { clearDeviceConfig, loadDeviceConfig, saveDeviceConfig } from "../cache/deviceConfigStore";
import { refreshDeviceSession, signOutDevice } from "../services/deviceRegistrationService";
import { subscribeDevice } from "../services/playerService";
import type { DeviceConfig } from "../types/memorial";

export function useDeviceSession({ redirectToSetup = true } = {}) {
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasFirebaseConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function boot() {
      try {
        const stored = await loadDeviceConfig();
        if (!stored?.setupCompleted) {
          if (redirectToSetup) window.location.replace("/setup");
          return;
        }

        const refreshed = await refreshDeviceSession(stored);
        await saveDeviceConfig(refreshed);

        if (cancelled) return;
        setConfig(refreshed);
        setUser({ uid: refreshed.deviceId } as User);
      } catch (err) {
        await clearDeviceConfig();
        await signOutDevice().catch(() => undefined);
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Dispositivo removido ou invalido.");
        if (redirectToSetup) window.location.replace("/setup");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [redirectToSetup]);

  useEffect(() => {
    if (!config) return;
    return subscribeDevice(
      config.deviceId,
      (device) => {
        if (device) return;
        void clearDeviceConfig()
          .then(() => signOutDevice())
          .finally(() => window.location.replace("/setup"));
      },
      (err) => setError(err.message),
    );
  }, [config]);

  return { config, user, loading, error, configured: hasFirebaseConfig };
}
