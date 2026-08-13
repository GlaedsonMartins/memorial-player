import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { hasFirebaseConfig, getFirebaseAuth } from "../firebase/client";
import { clearDeviceConfig, loadDeviceConfig, saveDeviceConfig } from "../cache/deviceConfigStore";
import { refreshDeviceSession, signOutDevice } from "../services/deviceRegistrationService";
import { subscribeDevice } from "../services/playerService";
import type { DeviceConfig } from "../types/memorial";
import { onAuthStateChanged } from "firebase/auth";

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

function isPermanentDeviceError(error: unknown) {
  const code = errorCode(error);
  return code.includes("not-found") || code.includes("invalid-argument");
}

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

    async function waitForAuthRestore() {
      return new Promise<User | null>((resolve) => {
        const auth = getFirebaseAuth();
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          resolve(u);
        });
      });
    }

    async function boot() {
      let stored: DeviceConfig | null = null;
      try {
        // Wait until Firebase has restored the auth state
        const restoredUser = await waitForAuthRestore();
        if (import.meta.env.DEV) console.debug("auth restored user:", restoredUser?.uid ?? null);

        stored = await loadDeviceConfig();

        if (!stored?.setupCompleted) {
          if (import.meta.env.DEV) console.debug("redirecting to /setup: no local configuration");
          if (redirectToSetup) window.location.replace("/setup");
          return;
        }

        const refreshed = await refreshDeviceSession(stored);
        await saveDeviceConfig(refreshed);

        if (cancelled) return;
        setConfig(refreshed);
        setUser(getFirebaseAuth().currentUser);
      } catch (err) {
        if (stored?.setupCompleted && !isPermanentDeviceError(err)) {
          if (cancelled) return;
          setConfig(stored);
          setUser(getFirebaseAuth().currentUser);
          setError(err instanceof Error ? err.message : "Falha temporaria ao atualizar sessao.");
          return;
        }

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
