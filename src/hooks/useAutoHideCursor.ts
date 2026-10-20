import { useEffect } from "react";

export function useAutoHideCursor() {
  useEffect(() => {
    let timeout: number;

    const showCursor = () => {
      document.body.classList.remove("cursor-idle");
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        document.body.classList.add("cursor-idle");
      }, 3000);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") showCursor();
    };

    showCursor();
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("pointermove", handlePointerMove);
      document.body.classList.remove("cursor-idle");
    };
  }, []);
}
