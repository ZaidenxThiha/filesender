export const PROTOCOL_VERSION = 1 as const;
export const FILE_CHUNK_SIZE = 64 * 1024;

export type TransferFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
};

type Versioned = { protocolVersion: typeof PROTOCOL_VERSION };
export type HelloMessage = Versioned & { type: "hello" };
export type ManifestMessage = Versioned & {
  type: "manifest";
  transferId: string;
  files: TransferFile[];
};
export type AcceptMessage = Versioned & { type: "accept" };
export type DeclineMessage = Versioned & { type: "decline" };
export type FileStartMessage = Versioned & {
  type: "file-start";
  fileId: string;
};
export type FileEndMessage = Versioned & {
  type: "file-end";
  fileId: string;
  byteLength: number;
};
export type CancelMessage = Versioned & { type: "cancel"; reason?: string };
export type CompleteMessage = Versioned & { type: "complete" };

export type ControlMessage =
  | HelloMessage
  | ManifestMessage
  | AcceptMessage
  | DeclineMessage
  | FileStartMessage
  | FileEndMessage
  | CancelMessage
  | CompleteMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isByteLength(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseFile(value: unknown): TransferFile | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.id) ||
    !isString(value.name) ||
    !isByteLength(value.size) ||
    typeof value.type !== "string" ||
    (value.relativePath !== undefined && typeof value.relativePath !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    size: value.size,
    type: value.type,
    ...(value.relativePath ? { relativePath: value.relativePath } : {}),
  };
}

export function parseControlMessage(value: unknown): ControlMessage | null {
  if (!isRecord(value) || value.protocolVersion !== PROTOCOL_VERSION) return null;

  switch (value.type) {
    case "hello":
    case "accept":
    case "decline":
    case "complete":
      return { protocolVersion: PROTOCOL_VERSION, type: value.type };
    case "manifest": {
      if (!isString(value.transferId) || !Array.isArray(value.files)) return null;
      const files = value.files.map(parseFile);
      if (files.length === 0 || files.some((file) => file === null)) return null;
      return {
        protocolVersion: PROTOCOL_VERSION,
        type: "manifest",
        transferId: value.transferId,
        files: files as TransferFile[],
      };
    }
    case "file-start":
      return isString(value.fileId)
        ? { protocolVersion: PROTOCOL_VERSION, type: "file-start", fileId: value.fileId }
        : null;
    case "file-end":
      return isString(value.fileId) && isByteLength(value.byteLength)
        ? {
            protocolVersion: PROTOCOL_VERSION,
            type: "file-end",
            fileId: value.fileId,
            byteLength: value.byteLength,
          }
        : null;
    case "cancel":
      return value.reason === undefined || typeof value.reason === "string"
        ? {
            protocolVersion: PROTOCOL_VERSION,
            type: "cancel",
            ...(value.reason ? { reason: value.reason } : {}),
          }
        : null;
    default:
      return null;
  }
}

export function fileToTransferFile(file: File, index: number): TransferFile {
  const relativePath = "webkitRelativePath" in file ? file.webkitRelativePath : "";
  return {
    id: `file-${index + 1}`,
    name: file.name,
    size: file.size,
    type: file.type,
    ...(relativePath ? { relativePath } : {}),
  };
}
