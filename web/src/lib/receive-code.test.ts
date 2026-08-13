import { describe, expect, it } from "vitest";
import {
  generateReceiveCode,
  isValidReceiveCode,
  normalizeReceiveCode,
  toPeerId,
} from "./receive-code";

describe("receive codes", () => {
  it("generates a four-digit and three-word code", () => {
    const values = [8, 8, 2, 7, 0, 1, 2];

    expect(generateReceiveCode(() => values.shift()!)).toBe(
      "8827-academy-acrobat-active",
    );
  });

  it("normalizes pasted codes", () => {
    expect(normalizeReceiveCode(" 8827 Dance  Gong--Place ")).toBe(
      "8827-dance-gong-place",
    );
  });

  it("validates the shape and known mnemonic words", () => {
    expect(isValidReceiveCode("8827-dance-gong-place")).toBe(true);
    expect(isValidReceiveCode("8827-dance-gong-madeupword")).toBe(false);
    expect(isValidReceiveCode("82-dance-gong-place")).toBe(false);
  });

  it("namespaces codes for PeerJS", () => {
    expect(toPeerId("8827-dance-gong-place")).toBe(
      "croc-web-v1-8827-dance-gong-place",
    );
  });
});
