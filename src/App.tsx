import { SetupPage } from "./pages/SetupPage";
import { ResetSetupPage } from "./pages/ResetSetupPage";
import { RoomPlayerPage } from "./pages/RoomPlayerPage";

function legacyRoomId(number: string) {
  return `room-${number.padStart(2, "0")}`;
}

function parseRoomId(pathname: string) {
  const match = pathname.match(/^\/sala\/([^/]+)\/?$/);
  if (!match) return null;
  const segment = decodeURIComponent(match[1]);
  if (/^\d+$/.test(segment)) return legacyRoomId(segment);
  if (/^room-[a-zA-Z0-9-]+$/.test(segment)) return segment;
  return null;
}

export function App() {
  const pathname = window.location.pathname;
  if (pathname === "/setup/reset") return <ResetSetupPage />;
  if (pathname === "/setup") return <SetupPage />;

  const roomId = parseRoomId(pathname);
  if (roomId) return <RoomPlayerPage routeRoomId={roomId} />;

  return <RoomPlayerPage routeRoomId={null} />;
}
