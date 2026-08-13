import { describe, expect, it, vi } from "vitest";
import { sendFiles, type DataConnectionLike } from "./send-files";

class MemoryConnection implements DataConnectionLike {
  sent: unknown[] = [];
  bufferedAmount = 0;

  send(value: unknown) {
    this.sent.push(value);
  }
}

describe("sendFiles", () => {
  it("sends files sequentially in bounded binary chunks", async () => {
    const connection = new MemoryConnection();
    const bytes = new Uint8Array(150 * 1024).map((_, index) => index % 251);
    const file = new File([bytes], "fixture.bin", {
      type: "application/octet-stream",
    });
    const progress = vi.fn();

    await sendFiles(connection, [file], new AbortController().signal, progress);

    const chunks = connection.sent.filter(
      (value): value is ArrayBuffer => value instanceof ArrayBuffer,
    );
    expect(chunks).toHaveLength(3);
    expect(Math.max(...chunks.map((chunk) => chunk.byteLength))).toBe(64 * 1024);
    expect(connection.sent.at(0)).toMatchObject({ type: "file-start" });
    expect(connection.sent.at(-1)).toMatchObject({ type: "complete" });
    expect(progress).toHaveBeenLastCalledWith({
      bytesTransferred: file.size,
      totalBytes: file.size,
      currentFile: "fixture.bin",
    });
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      sendFiles(
        new MemoryConnection(),
        [new File(["hello"], "hello.txt")],
        controller.signal,
        vi.fn(),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
