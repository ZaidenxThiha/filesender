import type { TransferProgress } from "./send-files";
import type {
  ControlMessage,
  ManifestMessage,
  TransferFile,
} from "./transfer-protocol";

export type DownloadFile = (
  blob: Blob,
  file: TransferFile,
) => void | Promise<void>;

export type FileReceiver = {
  handleControl(message: ControlMessage): Promise<void>;
  handleChunk(chunk: ArrayBuffer): void;
  cancel(): void;
};

export function createFileReceiver(
  download: DownloadFile,
  onProgress: (progress: TransferProgress) => void,
): FileReceiver {
  let manifest: ManifestMessage | null = null;
  let currentFile: TransferFile | null = null;
  let chunks: ArrayBuffer[] = [];
  let currentBytes = 0;
  let completedBytes = 0;
  let cancelled = false;

  return {
    async handleControl(message) {
      if (cancelled) throw new DOMException("Transfer cancelled", "AbortError");

      if (message.type === "manifest") {
        manifest = message;
        return;
      }

      if (message.type === "file-start") {
        if (!manifest || currentFile) throw new Error("Unexpected file start.");
        currentFile = manifest.files.find((file) => file.id === message.fileId) ?? null;
        if (!currentFile) throw new Error("The sender referenced an unknown file.");
        chunks = [];
        currentBytes = 0;
        return;
      }

      if (message.type === "file-end") {
        if (!manifest || !currentFile || currentFile.id !== message.fileId) {
          throw new Error("Unexpected file end.");
        }
        if (currentBytes !== message.byteLength || currentBytes !== currentFile.size) {
          throw new Error(
            `Expected ${currentFile.size} bytes for ${currentFile.name}, received ${currentBytes}.`,
          );
        }

        const completedFile = currentFile;
        await download(new Blob(chunks, { type: completedFile.type }), completedFile);
        completedBytes += currentBytes;
        onProgress({
          bytesTransferred: completedBytes,
          totalBytes: manifest.files.reduce((sum, file) => sum + file.size, 0),
          currentFile: completedFile.name,
        });
        currentFile = null;
        chunks = [];
        currentBytes = 0;
      }
    },

    handleChunk(chunk) {
      if (cancelled) throw new DOMException("Transfer cancelled", "AbortError");
      if (!manifest || !currentFile) throw new Error("Received file data too early.");
      chunks.push(chunk);
      currentBytes += chunk.byteLength;
      onProgress({
        bytesTransferred: completedBytes + currentBytes,
        totalBytes: manifest.files.reduce((sum, file) => sum + file.size, 0),
        currentFile: currentFile.name,
      });
    },

    cancel() {
      cancelled = true;
      currentFile = null;
      chunks = [];
      currentBytes = 0;
    },
  };
}
