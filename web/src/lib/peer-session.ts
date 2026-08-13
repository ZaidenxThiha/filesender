import type { DataConnection, Peer } from "peerjs";
import { toPeerId } from "./receive-code";

export type PeerSessionHandlers = {
  onConnection?: () => void;
  onData?: (data: unknown) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
};

export type PeerSession = {
  send(data: unknown): void;
  close(): void;
  connection: DataConnection | null;
};

function bindConnection(
  connection: DataConnection,
  session: PeerSession,
  handlers: PeerSessionHandlers,
) {
  session.connection = connection;
  connection.on("open", () => handlers.onConnection?.());
  connection.on("data", (data) => handlers.onData?.(data));
  connection.on("close", () => handlers.onClose?.());
  connection.on("error", (error) => handlers.onError?.(error));
}

function makeSession(peer: Peer, handlers: PeerSessionHandlers): PeerSession {
  let closed = false;
  const session: PeerSession = {
    connection: null,
    send(data) {
      if (!session.connection?.open) throw new Error("The other device is not connected yet.");
      session.connection.send(data);
    },
    close() {
      if (closed) return;
      closed = true;
      session.connection?.close();
      peer.destroy();
    },
  };
  peer.on("error", (error) => handlers.onError?.(error));
  return session;
}

export async function createSenderSession(
  code: string,
  handlers: PeerSessionHandlers,
): Promise<PeerSession> {
  const { default: PeerConstructor } = await import("peerjs");
  const peer = new PeerConstructor(toPeerId(code));
  const session = makeSession(peer, handlers);
  let accepted = false;

  peer.on("connection", (connection) => {
    if (accepted) {
      connection.close();
      return;
    }
    accepted = true;
    bindConnection(connection, session, handlers);
  });

  await new Promise<void>((resolve, reject) => {
    peer.once("open", () => resolve());
    peer.once("error", reject);
  });
  return session;
}

export async function createReceiverSession(
  code: string,
  handlers: PeerSessionHandlers,
): Promise<PeerSession> {
  const { default: PeerConstructor } = await import("peerjs");
  const peer = new PeerConstructor();
  const session = makeSession(peer, handlers);

  await new Promise<void>((resolve, reject) => {
    peer.once("open", () => resolve());
    peer.once("error", reject);
  });

  const connection = peer.connect(toPeerId(code), {
    reliable: true,
    serialization: "binary",
  });
  bindConnection(connection, session, handlers);
  return session;
}
