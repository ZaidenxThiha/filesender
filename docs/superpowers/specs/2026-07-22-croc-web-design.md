# Croc Web Design

## Summary

Croc Web is a browser-native, peer-to-peer file transfer experience inspired by croc's simple send-and-receive-code workflow. The sender chooses one or more files, receives an automatically generated code such as `8827-dance-gong-place`, and shares it with the receiver. The receiver enters that code, reviews the incoming files, and accepts the transfer.

The web app is intentionally not wire-compatible with the croc CLI. It preserves croc's mental model and four-digit-plus-three-word code format while using WebRTC data channels so it can run as a Vercel-hosted web application.

## Goals

- Make sending files understandable without instructions or an account.
- Generate a memorable receive code automatically from cryptographically secure browser randomness.
- Transfer file bytes directly between browsers over an encrypted WebRTC connection.
- Never upload or persist file contents on an application server.
- Provide useful connection, transfer, completion, cancellation, and recovery states.
- Work as a responsive install-free website on current desktop and mobile browsers.
- Deploy the application frontend on Vercel without requiring paid infrastructure for the first release.

## Non-goals

- Compatibility with the croc CLI protocol, PAKE implementation, relay, or resume format.
- Offline delivery or server-side file storage.
- Accounts, transfer history, contact lists, analytics, or billing.
- Guaranteed connectivity through every corporate firewall or restrictive NAT in the first release.
- Interrupted-transfer resume in the first release.

## Considered Approaches

### 1. Browser WebRTC with hosted PeerJS signaling — selected

Use PeerJS to exchange WebRTC connection metadata through its hosted signaling service. File bytes travel through the WebRTC data channel, not through PeerJS or Vercel. This gives the first release a working zero-account deployment with no database credentials and keeps the code small enough to audit.

Trade-off: the public signaling service is an external operational dependency and should be replaced with a self-hosted PeerServer before the app needs a formal reliability guarantee.

### 2. Browser WebRTC with Vercel Functions and Redis signaling

Store short-lived offers, answers, and ICE candidates in Upstash Redis, accessed through Vercel route handlers. This offers greater control and expiry enforcement but adds credentials, polling complexity, and an external data service before the product has users.

### 3. Croc-compatible Go service plus Vercel frontend

Run the existing croc engine on a long-lived container platform and use Vercel only for the frontend. This is the only path toward CLI interoperability, but it requires a bridge protocol, durable transfer workers, storage/download concerns, and non-Vercel infrastructure. It is outside the first release.

## User Experience

### Landing state

The page presents two equally clear actions: **Send files** and **Receive files**. The receive-code field is visible immediately and carries the example `8827-dance-gong-place`. Supporting copy says that there is no account and that both devices must remain online.

The visual language is calm and practical: warm off-white background, near-black type, restrained mint accent, large rounded file-drop surface, and monospace styling only for codes and transfer measurements. Motion is limited and respects `prefers-reduced-motion`.

### Sender flow

1. The sender drops files or opens the system file picker.
2. The app validates that at least one non-empty selection is present and shows file names, sizes, total size, and a remove action.
3. The app creates a PeerJS session using a cryptographically generated four-digit-plus-three-word code.
4. The app shows the code prominently with copy and share actions and waits for one receiver.
5. When a receiver connects, the app shows the receiving device's generic label and asks the sender to start the transfer.
6. During transfer, the sender sees total progress, current file, speed, bytes sent, and cancel.
7. Completion shows the number of files and total bytes sent, with a **Send more files** action that creates a fresh session code.

### Receiver flow

1. The receiver enters or pastes a code. Input is lowercased, whitespace is trimmed, and spaces are normalized to hyphens.
2. The app validates the exact four-digit-plus-three-word structure before connecting.
3. After connection, the receiver sees file names, sizes, total size, and an explicit accept or decline choice.
4. Accepted files are transferred sequentially. Each completed file is downloaded immediately; the receiver sees the same aggregate progress information as the sender.
5. Completion shows a concise success state and a **Receive another transfer** action.

### Error and recovery states

- Invalid code: explain the expected format next to the input.
- Sender not found: retain the entered code and offer retry.
- Peer disconnected before transfer: return to a reconnectable waiting state if no bytes moved; otherwise explain that the first release cannot resume.
- Receiver declined: notify the sender without exposing receiver details.
- Browser lacks required WebRTC APIs: show a supported-browser message instead of a broken transfer UI.
- Download creation fails: stop the next file, preserve the current state, and explain that the browser blocked the download.

## Architecture

The original Go project stays in the repository unchanged except for additive web-app and documentation files. The web application lives in `web/` as a Next.js App Router project and can be deployed with Vercel's project root set to `web`.

The application is client-heavy by necessity. The Next.js page and static metadata render on the server, while a focused client transfer workspace owns browser file APIs, PeerJS, and the transfer state machine. Pure utilities remain separate from React so code generation, parsing, protocol messages, file-size formatting, progress, and state transitions can be unit tested.

### Major units

- `code.ts`: secure code generation and receive-code normalization/validation.
- `protocol.ts`: versioned, runtime-validated control messages and constants.
- `transfer-machine.ts`: deterministic sender and receiver state transitions.
- `peer-session.ts`: a narrow PeerJS adapter with sender and receiver connection creation.
- `send-files.ts`: sequential chunking, backpressure, cancellation, and progress callbacks.
- `receive-files.ts`: manifest acceptance, chunk assembly, per-file download, cancellation, and progress callbacks.
- React components: landing choice, drop zone/file list, code display, receive-code form, confirmation, progress, completion, and errors.

## Code Generation

The existing Go source creates croc names by combining a four-digit random PIN with three mnemonic words. Croc Web preserves that visible shape. The browser implementation uses `crypto.getRandomValues` for every choice, a bundled curated word list, and rejection sampling to avoid modulo bias. Codes are lower-case ASCII and match:

```text
^[0-9]{4}(?:-[a-z]+){3}$
```

The generated code becomes the PeerJS sender ID with a fixed application namespace prefix so unrelated PeerJS applications cannot collide. The visible code never includes the prefix.

## Transfer Protocol

Every control message carries `protocolVersion: 1`. The receiver begins with a `hello`; the sender replies with a manifest containing a transfer ID and file records (`id`, `name`, `size`, `type`, and relative path when available). The receiver sends `accept` or `decline`.

Accepted files transfer sequentially in fixed-size binary chunks. Control messages mark the start and end of each file. The sender pauses while the data channel's buffered amount exceeds the high-water mark and resumes after it drops below the low-water mark. Both sides calculate aggregate progress from acknowledged or received bytes. A `cancel` message terminates the session cleanly.

File contents are protected in transit by WebRTC's mandatory DTLS encryption. The receive code is a rendezvous secret, not a replacement for croc's PAKE. The UI will describe the product as **encrypted peer-to-peer**, not as croc-compatible or end-to-end verified by the code.

## File Handling Constraints

- Multiple file selection is supported.
- Direct folder selection is enabled where `webkitdirectory` is supported; relative paths are used only for display in the first release.
- Transfers are sequential to bound memory and simplify progress.
- The first release assembles one received file at a time into a Blob before triggering its download. The UI warns before accepting any individual file larger than 1 GB because memory behavior varies by browser.
- File names are treated as display-only values and are never injected as HTML.
- The default chunk size is 64 KiB, adjusted downward only if browser compatibility testing requires it.

## Accessibility and Responsive Behavior

- All flows are usable by keyboard and screen reader.
- Drop zones use a real file input and never depend on drag-and-drop alone.
- Focus moves to the first relevant heading or error after major state changes.
- Status updates use a polite live region; destructive cancellation requires confirmation once transfer starts.
- Text and interactive controls meet WCAG AA contrast and target-size guidance.
- Mobile keeps the sender and receiver actions in a single column; desktop uses a balanced two-column landing layout.

## Testing

- Unit tests cover code generation, normalization, validation, protocol parsing, progress calculations, and all state-machine transitions.
- Component tests cover keyboard file selection, copy behavior, invalid codes, manifest acceptance, cancellation confirmation, and accessible status text.
- Browser tests open two isolated contexts, connect through the signaling service, send a small fixture, verify byte-for-byte equality, and exercise decline and disconnect paths.
- Verification includes `npm test`, `npm run lint`, `npm run build`, and a production-like browser transfer between two contexts.

## Deployment

The Vercel project uses `web/` as its root directory. No runtime secrets are required for the first release. Preview deployment is verified first, then promoted or deployed to production. The deployment handoff records the production URL and the external PeerJS signaling dependency.

## Future Enhancements

- Self-host PeerServer on a long-lived platform and add a TURN service for restrictive networks.
- Stream received bytes to disk through the File System Access API where available.
- Add QR-code sharing, resumable transfers, optional code confirmation, and installable PWA support.
- Explore a separate croc-compatible bridge only if CLI interoperability becomes a validated requirement.
