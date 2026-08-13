# Croc Web

A browser-native, peer-to-peer file transfer experience inspired by [croc](https://github.com/schollz/croc).

## How it works

The sender selects files and gets a fresh four-digit-plus-three-word receive code generated with browser cryptographic randomness and croc's bundled mnemonic word list. The receiver enters that code. PeerJS introduces the browsers, then file bytes move directly over an encrypted WebRTC data channel.

Files are never uploaded to this Next.js app or stored by Vercel. Both browsers must stay online for the transfer. The web protocol is intentionally not compatible with the croc CLI.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

## Deploy to Vercel

Set the Vercel project root to `web/`, or run from this directory:

```bash
vercel deploy
vercel deploy --prod
```

No environment variables are required for this first release. It currently relies on PeerJS's hosted signaling service; production reliability work should move PeerServer to controlled long-lived infrastructure and add TURN coverage.
