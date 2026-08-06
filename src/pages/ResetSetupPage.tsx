import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { clearDeviceConfig } from "../cache/deviceConfigStore";
import { signOutDevice } from "../services/deviceRegistrationService";

export function ResetSetupPage() {
  useEffect(() => {
    void clearDeviceConfig()
      .then(() => signOutDevice())
      .finally(() => window.location.replace("/setup"));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Limpando configuracao local...
      </div>
    </main>
  );
}
