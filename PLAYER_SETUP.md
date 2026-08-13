# Memorial Player

## URLs Fixas

- `/sala/1`
- `/sala/2`
- `/sala/3`
- `/sala/4`
- `/sala/5`
- `/sala/6`

## Configuracao Inicial

1. Gere uma service account JSON no Firebase Console.
2. Rode o provisionamento completo do Admin e dos Players:

```sh
set GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\service-account.json
set ADMIN_EMAIL=admin@seudominio.com
set ADMIN_PASSWORD=uma-senha-forte-admin
set PLAYER_DEFAULT_PASSWORD=uma-senha-forte
npm.cmd run provision:access
```

3. Entre no Memorial Cloud Admin com o email/senha definidos em `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
4. Abra `/setup` no mini PC e faca login com o usuario tecnico da sala, por exemplo `player-01@memorial.local`.
5. Configure o sistema operacional para abrir a URL `/sala/{numero}` em modo kiosk.

Para iniciar o Player com musica automatica, use o script incluido no projeto:

```bat
scripts\start-player-kiosk.bat 1 https://seu-player.exemplo.com
```

O primeiro argumento e o numero da sala. O segundo e opcional; sem ele, o script usa `http://localhost:8091`.
O script abre uma instancia dedicada do Chrome com `--autoplay-policy=no-user-gesture-required`, permitindo que a homenagem inicie o audio sem clique.

## Firebase

- Project ID: `memorial-cloud-5da8e`
- Firestore database: `memorialcloud`
- Web App ID: `1:803737147409:web:88f8d61e609f75b58f79b0`
- Storage rules ficam no workspace `C:\Users\Zeus\Documents\Memorial Cloud`, junto do Admin, porque o bucket e as regras sao compartilhados.

## Implementado

- Snapshot Listeners sem polling.
- Restauracao local da ultima sessao ativa.
- Cache de fotos, videos e musicas via Cache Storage.
- Service Worker e manifest PWA.
- Loop continuo de midias.
- Playlist em loop, pausando durante videos.
- Heartbeat enriquecido em `player_status/{playerId}`.
- Estado offline usando cache.
- Tela institucional com `settings/general`.
- Hardening kiosk basico: cursor oculto, sem selecao, sem menu de contexto e tentativa de fullscreen em interacao.

## Contrato

O Player le:

- `rooms/{roomId}`
- `active_sessions/{roomId}`
- `tributes/{tributeId}`
- `playlists/{playlistId}`
- `settings/general`

O Player escreve apenas:

- `player_status/{playerId}`

O Player nunca cria, edita ou exclui homenagens, playlists, salas, configuracoes ou arquivos.

## Regras De Storage

Depois que o bucket inicial for criado no Console Firebase, publique as regras pelo workspace do Admin:

```sh
cd "C:\Users\Zeus\Documents\Memorial Cloud"
firebase.cmd deploy --only storage --project memorial-cloud-5da8e
```
