import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "memorial-cloud-5da8e";
const databaseId = process.env.FIREBASE_DATABASE_ID || "memorialcloud";
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const playerPassword = process.env.PLAYER_DEFAULT_PASSWORD;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Set ${name}.`);
    process.exit(1);
  }
}

requireEnv("GOOGLE_APPLICATION_CREDENTIALS", credentialPath);
requireEnv("ADMIN_EMAIL", adminEmail);
requireEnv("ADMIN_PASSWORD", adminPassword);
requireEnv("PLAYER_DEFAULT_PASSWORD", playerPassword);

if (adminPassword.length < 8 || playerPassword.length < 8) {
  console.error("ADMIN_PASSWORD and PLAYER_DEFAULT_PASSWORD must have at least 8 characters.");
  process.exit(1);
}

const serviceAccount = JSON.parse(await readFile(credentialPath, "utf8"));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

const auth = getAuth();
const db = getFirestore(databaseId);

async function upsertUser({ uid, email, password, displayName, claims }) {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      displayName,
      disabled: false,
      emailVerified: true,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    await auth.createUser({
      uid,
      email,
      password,
      displayName,
      disabled: false,
      emailVerified: true,
    });
  }

  await auth.setCustomUserClaims(uid, claims);
}

async function provisionAdmin() {
  const existing = await auth.getUserByEmail(adminEmail).catch((error) => {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  });
  const uid = existing?.uid ?? "admin-primary";

  await upsertUser({
    uid,
    email: adminEmail,
    password: adminPassword,
    displayName: "Administrador Memorial Cloud",
    claims: { admin: true },
  });

  await db.collection("users").doc(uid).set(
    {
      name: "Administrador Memorial Cloud",
      email: adminEmail,
      role: "ADMIN",
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: 1,
    },
    { merge: true },
  );

  console.log(`Provisioned admin ${adminEmail} (${uid})`);
}

async function provisionPlayers() {
  for (let number = 1; number <= 6; number += 1) {
    const suffix = String(number).padStart(2, "0");
    const uid = `player-${suffix}`;
    const roomId = `room-${suffix}`;
    const email = `${uid}@memorial.local`;

    await upsertUser({
      uid,
      email,
      password: playerPassword,
      displayName: `Memorial Player ${suffix}`,
      claims: {
        player: true,
        roomId,
        playerId: uid,
      },
    });

    await db.collection("player_status").doc(uid).set(
      {
        roomId,
        online: false,
        currentState: "OFFLINE",
        appVersion: null,
        lastHeartbeat: null,
        lastSync: null,
        schemaVersion: 1,
      },
      { merge: true },
    );

    console.log(`Provisioned ${uid} (${email}) for ${roomId}`);
  }
}

await provisionAdmin();
await provisionPlayers();
console.log("Access provisioning complete.");
