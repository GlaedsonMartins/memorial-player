import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || "memorial-cloud-5da8e";
const password = process.env.PLAYER_DEFAULT_PASSWORD;
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!password || password.length < 8) {
  console.error("Set PLAYER_DEFAULT_PASSWORD with at least 8 characters.");
  process.exit(1);
}

if (!credentialPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON file.");
  process.exit(1);
}

const serviceAccount = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(credentialPath, "utf8")));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

const auth = getAuth();

for (let number = 1; number <= 6; number += 1) {
  const suffix = String(number).padStart(2, "0");
  const uid = `player-${suffix}`;
  const roomId = `room-${suffix}`;
  const email = `${uid}@memorial.local`;

  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { email, password, disabled: false });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    await auth.createUser({
      uid,
      email,
      password,
      disabled: false,
      emailVerified: true,
    });
  }

    await auth.setCustomUserClaims(uid, {
      player: true,
      roomId,
      playerId: uid,
    });

  console.log(`Provisioned ${uid} (${email}) for ${roomId}`);
}
