import { describe, expect, it } from "vitest";
import { initialTransferState, transition } from "./transfer-state";

describe("transfer state", () => {
  it("moves a sender through a complete transfer", () => {
    let state = transition(initialTransferState, { type: "select", role: "sender" });
    state = transition(state, { type: "wait" });
    state = transition(state, { type: "connect" });
    state = transition(state, { type: "start" });
    state = transition(state, { type: "finish" });

    expect(state).toEqual({ status: "complete", role: "sender" });
  });

  it("moves a receiver through review and completion", () => {
    let state = transition(initialTransferState, { type: "connect-code" });
    state = transition(state, { type: "manifest" });
    state = transition(state, { type: "accept" });
    state = transition(state, { type: "finish" });

    expect(state).toEqual({ status: "complete", role: "receiver" });
  });

  it("turns invalid sequences and failures into user-facing errors", () => {
    expect(transition(initialTransferState, { type: "start" })).toEqual({
      status: "error",
      role: null,
      message: "That transfer action is not available right now.",
    });
    expect(
      transition(
        { status: "transferring", role: "sender" },
        { type: "fail", message: "The connection closed." },
      ),
    ).toEqual({
      status: "error",
      role: "sender",
      message: "The connection closed.",
    });
  });
});
