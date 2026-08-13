import {
  FILE_CHUNK_SIZE,
  PROTOCOL_VERSION,
  fileToTransferFile,
} from "./transfer-protocol";

const HIGH_WATER_MARK = 4 * 1024 * 1024;

export type TransferProgress = {
  bytesTransferred: number;
  totalBytes: number;
  currentFile: string;
};

export type DataConnectionLike = {
  send(value: unknown): void;
  bufferedAmount?: number;
  dataChannel?: { bufferedAmount: number };
};

function abortError(): DOMException {
  return new DOMException("The transfer was cancelled.", "AbortError");
}

function getBufferedAmount(connection: DataConnectionLike): number {
  return connection.dataChannel?.bufferedAmount ?? connection.bufferedAmount ?? 0;
}

async function waitForBuffer(
  connection: DataConnectionLike,
  signal: AbortSignal,
): Promise<void> {
  while (getBufferedAmount(connection) > HIGH_WATER_MARK) {
    if (signal.aborted) throw abortError();
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

export async function sendFiles(
  connection: DataConnectionLike,
  files: File[],
  signal: AbortSignal,
  onProgress: (progress: TransferProgress) => void,
): Promise<void> {
  if (signal.aborted) throw abortError();

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  let bytesTransferred = 0;

  for (const [index, file] of files.entries()) {
    const metadata = fileToTransferFile(file, index);
    connection.send({
      protocolVersion: PROTOCOL_VERSION,
      type: "file-start",
      fileId: metadata.id,
    });

    for (let offset = 0; offset < file.size; offset += FILE_CHUNK_SIZE) {
      if (signal.aborted) throw abortError();
      await waitForBuffer(connection, signal);
      const chunk = await file
        .slice(offset, Math.min(offset + FILE_CHUNK_SIZE, file.size))
        .arrayBuffer();
      connection.send(chunk);
      bytesTransferred += chunk.byteLength;
      onProgress({ bytesTransferred, totalBytes, currentFile: file.name });
    }

    connection.send({
      protocolVersion: PROTOCOL_VERSION,
      type: "file-end",
      fileId: metadata.id,
      byteLength: file.size,
    });
  }

  connection.send({ protocolVersion: PROTOCOL_VERSION, type: "complete" });
}
