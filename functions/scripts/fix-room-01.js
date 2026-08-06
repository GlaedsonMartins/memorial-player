const { applicationDefault, initializeApp } = require("firebase-admin/app");
const {
  FieldValue,
  getFirestore,
  Timestamp,
} = require("firebase-admin/firestore");

const PROJECT_ID = "memorial-cloud-5da8e";
const DATABASE_ID = "memorialcloud";

async function main() {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });

  const db = getFirestore(app, DATABASE_ID);
  const roomRef = db.collection("rooms").doc("room-01");

  const snapshot = await roomRef.get();

  console.log("Documento atual:");
  console.log(snapshot.exists ? snapshot.data() : "room-01 não existe");

  await roomRef.set(
    {
      active: true,
      activeTributeId: null,
      createdAt:
        snapshot.exists && snapshot.get("createdAt") instanceof Timestamp
          ? snapshot.get("createdAt")
          : FieldValue.serverTimestamp(),
      createdBy: null,
      name: "Sala Tulipa",
      number: 1,
      playerId: "player-01",
      playerUrl: "/sala/1",
      schemaVersion: 1,
      status: "FREE",
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      merge: false,
    }
  );

  const updatedSnapshot = await roomRef.get();

  console.log("\nSala 01 corrigida com sucesso:");
  console.log(updatedSnapshot.data());
}

main()
  .then(() => {
    console.log("\nProcesso finalizado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nErro ao corrigir room-01:");
    console.error(error);
    process.exit(1);
  });
