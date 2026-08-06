import type { Settings } from "../types/memorial";

export function IdleScreen({ settings, roomName }: { settings: Settings | null; roomName: string }) {
  const background = settings?.defaultScreenUrl;

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-950">
      {background && (
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          draggable={false}
        />
      )}
      <div className="relative flex flex-col items-center gap-6 text-center">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt={settings.companyName} className="max-h-40 max-w-[420px]" />
        ) : (
          <div className="h-28 w-28 rounded-xl border border-white/15 bg-white/5" />
        )}
        <div>
          <h1 className="text-5xl font-semibold tracking-wide text-white">
            {settings?.companyName ?? "Memorial Cloud"}
          </h1>
          <p className="mt-4 text-lg text-slate-300">{roomName}</p>
        </div>
      </div>
    </main>
  );
}
