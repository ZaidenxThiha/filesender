export type TransferRole = "sender" | "receiver";
export type TransferStatus =
  | "idle"
  | "selecting"
  | "waiting"
  | "connecting"
  | "connected"
  | "reviewing"
  | "transferring"
  | "receiving"
  | "complete"
  | "cancelled"
  | "error";

export type TransferState = {
  status: TransferStatus;
  role: TransferRole | null;
  message?: string;
};

export type TransferEvent =
  | { type: "select"; role: "sender" }
  | { type: "wait" }
  | { type: "connect-code" }
  | { type: "connect" }
  | { type: "manifest" }
  | { type: "accept" }
  | { type: "start" }
  | { type: "finish" }
  | { type: "cancel" }
  | { type: "reset" }
  | { type: "fail"; message: string };

export const initialTransferState: TransferState = { status: "idle", role: null };

function invalid(role: TransferRole | null): TransferState {
  return {
    status: "error",
    role,
    message: "That transfer action is not available right now.",
  };
}

export function transition(
  state: TransferState,
  event: TransferEvent,
): TransferState {
  if (event.type === "reset") return initialTransferState;
  if (event.type === "fail") {
    return { status: "error", role: state.role, message: event.message };
  }
  if (event.type === "cancel") {
    return { status: "cancelled", role: state.role };
  }

  if (state.status === "idle" && event.type === "select") {
    return { status: "selecting", role: "sender" };
  }
  if (state.status === "selecting" && event.type === "wait") {
    return { status: "waiting", role: "sender" };
  }
  if (state.status === "waiting" && event.type === "connect") {
    return { status: "connected", role: "sender" };
  }
  if (state.status === "connected" && event.type === "start") {
    return { status: "transferring", role: "sender" };
  }
  if (state.status === "idle" && event.type === "connect-code") {
    return { status: "connecting", role: "receiver" };
  }
  if (state.status === "connecting" && event.type === "manifest") {
    return { status: "reviewing", role: "receiver" };
  }
  if (state.status === "reviewing" && event.type === "accept") {
    return { status: "receiving", role: "receiver" };
  }
  if (
    (state.status === "transferring" || state.status === "receiving") &&
    event.type === "finish"
  ) {
    return { status: "complete", role: state.role };
  }

  return invalid(state.role);
}
