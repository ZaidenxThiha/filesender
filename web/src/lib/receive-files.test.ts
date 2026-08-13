import { describe, expect, it, vi } from "vitest";
import { createFileReceiver } from "./receive-files";
import type { ManifestMessage } from "./transfer-protocol";

const manifest: ManifestMessage = {
  protocolVersion: 1,
  type: "manifest",
  transferId: "transfer-1",
  files: [
    { id: "file-1", name: "hello.txt", size: 5, type: "text/plain" },
  ],
};

describe("createFileReceiver", () => {
  it("reassembles and downloads exact file bytes", async () => {
    const download = vi.fn();
    const progress = vi.fn();
    const receiver = createFileReceiver(download, progress);

    await receiver.handleControl(manifest);
    await receiver.handleControl({
      protocolVersion: 1,
      type: "file-start",
      fileId: "file-1",
    });
    receiver.handleChunk(new TextEncoder().encode("hel").buffer);
    receiver.handleChunk(new TextEncoder().encode("lo").buffer);
    await receiver.handleControl({
      protocolVersion: 1,
      type: "file-end",
      fileId: "file-1",
      byteLength: 5,
    });

    expect(download).toHaveBeenCalledOnce();
    const [blob, file] = download.mock.calls[0] as [Blob, { name: string }];
    expect(file.name).toBe("hello.txt");
    expect(await blob.text()).toBe("hello");
    expect(progress).toHaveBeenLastCalledWith({
      bytesTransferred: 5,
      totalBytes: 5,
      currentFile: "hello.txt",
    });
  });

  it("rejects inconsistent byte counts", async () => {
    const receiver = createFileReceiver(vi.fn(), vi.fn());
    await receiver.handleControl(manifest);
    await receiver.handleControl({
      protocolVersion: 1,
      type: "file-start",
      fileId: "file-1",
    });
    receiver.handleChunk(new TextEncoder().encode("no").buffer);

    await expect(
      receiver.handleControl({
        protocolVersion: 1,
        type: "file-end",
        fileId: "file-1",
        byteLength: 5,
      }),
    ).rejects.toThrow(/expected 5 bytes/i);
  });
});
