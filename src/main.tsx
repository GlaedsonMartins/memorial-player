import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

class PlayerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha no Memorial Player", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
          <h1 className="text-xl font-semibold">Não foi possível iniciar o player</h1>
          <p>Ocorreu um erro ao carregar a reprodução. Recarregue para tentar novamente.</p>
          <button type="button" className="rounded-lg bg-white px-5 py-3 text-slate-950" onClick={() => window.location.reload()}>
            Recarregar aplicativo
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlayerErrorBoundary><App /></PlayerErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
