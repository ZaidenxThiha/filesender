# Automatic Transfer Start Design

## Decision

Entering a valid receive code is the receiver's explicit consent to receive the files. After the browsers connect, the receiver automatically acknowledges the sender's manifest and the sender immediately begins transferring. The UI removes both **Accept files** and **Start sending**.

## Considered Approaches

1. **Automatic receiver acknowledgement and automatic sender start — selected.** This exactly matches the requested one-action flow while preserving the versioned manifest handshake before any file bytes move.
2. Automatic receiver acknowledgement with a sender-side start button. This removes one prompt but still requires the sender to act again, so it does not meet the request.
3. Begin sending as soon as the WebRTC connection opens. This is faster by one control message but can send bytes before the receiver has parsed the manifest, making errors and protocol-version mismatches harder to handle safely.

## Data Flow

1. The receiver enters a valid generated code.
2. The browsers establish the PeerJS/WebRTC connection.
3. The receiver sends `hello`; the sender returns the version-one manifest.
4. The receiver validates and registers the manifest, sends `accept` automatically, and enters the receiving state.
5. The sender receives `accept`, enters the sending state, and streams files immediately.
6. Existing progress, completion, cancellation, download, and connection-error behavior remains unchanged.

## UI Changes

- Remove the manifest review panel and accept/decline controls.
- While waiting for bytes after automatic acceptance, show **Connected. Your download will start automatically.**
- Do not render a sender-side **Start sending** control.
- Keep file names and progress visible once transfer data begins.
- A file larger than 1 GB no longer blocks on a warning prompt; the existing one-file-at-a-time memory behavior remains documented.

## Testing

- An integration test invokes a receiver manifest event and verifies that `accept` is sent without a click.
- The browser test verifies that neither manual action is present and that the download starts automatically after the code is submitted.
- Existing byte-for-byte download verification continues to prove transfer integrity.
