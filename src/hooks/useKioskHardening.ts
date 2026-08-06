import { useEffect } from "react";

export function useKioskHardening() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    const requestFullscreen = () => {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
      }
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("click", requestFullscreen);
    document.addEventListener("keydown", requestFullscreen);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("click", requestFullscreen);
      document.removeEventListener("keydown", requestFullscreen);
    };
  }, []);
}
