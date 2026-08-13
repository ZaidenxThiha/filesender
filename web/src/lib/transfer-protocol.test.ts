import { describe, expect, it } from "vitest";
import { parseControlMessage } from "./transfer-protocol";

describe("parseControlMessage", () => {
  it("accepts supported control messages", () => {
    const manifest = {
      protocolVersion: 1,
      type: "manifest",
      transferId: "transfer-1",
      files: [
        { id: "file-1", name: "hello.txt", size: 5, type: "text/plain" },
      ],
    };

    expect(parseControlMessage({ protocolVersion: 1, type: "hello" })).toEqual({
      protocolVersion: 1,
      type: "hello",
    });
    expect(parseControlMessage(manifest)).toEqual(manifest);
    expect(
      parseControlMessage({
        protocolVersion: 1,
        type: "file-start",
        fileId: "file-1",
      }),
    ).not.toBeNull();
    expect(
      parseControlMessage({
        protocolVersion: 1,
        type: "file-end",
        fileId: "file-1",
        byteLength: 5,
      }),
    ).not.toBeNull();
  });

  it("rejects unknown versions and malformed payloads", () => {
    expect(parseControlMessage({ protocolVersion: 2, type: "hello" })).toBeNull();
    expect(
      parseControlMessage({ protocolVersion: 1, type: "manifest", files: [] }),
    ).toBeNull();
    expect(
      parseControlMessage({ protocolVersion: 1, type: "file-end", byteLength: -1 }),
    ).toBeNull();
    expect(parseControlMessage("hello")).toBeNull();
  });
});
