"use client";

import { CheckCircle2, FileUp, LockKeyhole, Radio, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  createReceiverSession,
  createSenderSession,
  type PeerSession,
  type PeerSessionHandlers,
} from "@/lib/peer-session";
import { createFileReceiver, type FileReceiver } from "@/lib/receive-files";
import {
  generateReceiveCode,
  isValidReceiveCode,
  normalizeReceiveCode,
} from "@/lib/receive-code";
import { sendFiles, type TransferProgress as Progress } from "@/lib/send-files";
import {
  PROTOCOL_VERSION,
  fileToTransferFile,
  parseControlMessage,
} from "@/lib/transfer-protocol";
import { FileList } from "./file-list";
import { ReceiveCodeCard } from "./receive-code-card";
import { ReceiveCodeForm } from "./receive-code-form";
import { TransferProgress } from "./transfer-progress";

type SessionFactory = (
  code: string,
  handlers: PeerSessionHandlers,
) => Promise<PeerSession>;

export type SessionFactories = {
  sender: SessionFactory;
  receiver: SessionFactory;
};

const defaultFactories: SessionFactories = {
  sender: createSenderSession,
  receiver: createReceiverSession,
};

type SenderPhase = "idle" | "waiting" | "connected" | "sending" | "complete" | "error";
type ReceiverPhase = "idle" | "connecting" | "receiving" | "complete" | "error";

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function TransferWorkspace({
  sessionFactories = defaultFactories,
}: {
  sessionFactories?: SessionFactories;
}) {
  const [activePanel, setActivePanel] = useState<"send" | "receive">("send");
  const [files, setFiles] = useState<File[]>([]);
  const filesRef = useRef<File[]>([]);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [senderPhase, setSenderPhase] = useState<SenderPhase>("idle");
  const [senderError, setSenderError] = useState("");
  const [senderProgress, setSenderProgress] = useState<Progress | null>(null);
  const senderSession = useRef<PeerSession | null>(null);
  const senderAbort = useRef<AbortController | null>(null);

  const [receiveCode, setReceiveCode] = useState("");
  const [receiveError, setReceiveError] = useState("");
  const [receiverPhase, setReceiverPhase] = useState<ReceiverPhase>("idle");
  const [receiverProgress, setReceiverProgress] = useState<Progress | null>(null);
  const receiverSession = useRef<PeerSession | null>(null);
  const fileReceiver = useRef<FileReceiver | null>(null);

  useEffect(() => {
    return () => {
      senderSession.current?.close();
      receiverSession.current?.close();
      senderAbort.current?.abort();
      fileReceiver.current?.cancel();
    };
  }, []);

  const failSender = useCallback((error: Error) => {
    setSenderError(error.message || "The sender connection could not be opened.");
    setSenderPhase("error");
  }, []);

  const startSending = useCallback(async () => {
    const connection = senderSession.current?.connection;
    if (!connection) {
      failSender(new Error("The receiver is no longer connected."));
      return;
    }

    const controller = new AbortController();
    senderAbort.current = controller;
    setSenderPhase("sending");
    try {
      await sendFiles(connection, filesRef.current, controller.signal, setSenderProgress);
      setSenderPhase("complete");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      failSender(error instanceof Error ? error : new Error("The transfer stopped."));
    }
  }, [failSender]);

  const handleSenderData = useCallback((data: unknown) => {
    const message = parseControlMessage(data);
    if (!message) return;

    if (message.type === "hello") {
      const selected = filesRef.current;
      senderSession.current?.send({
        protocolVersion: PROTOCOL_VERSION,
        type: "manifest",
        transferId: `transfer-${Date.now()}`,
        files: selected.map(fileToTransferFile),
      });
    } else if (message.type === "accept") {
      void startSending();
    } else if (message.type === "decline") {
      setSenderError("The receiver declined this transfer.");
      setSenderPhase("error");
    } else if (message.type === "cancel") {
      senderAbort.current?.abort();
      setSenderError(message.reason || "The receiver cancelled the transfer.");
      setSenderPhase("error");
    }
  }, [startSending]);

  const beginSender = useCallback(
    async () => {
      senderSession.current?.close();
      const freshCode = generateReceiveCode();
      setCode(freshCode);
      setCopied(false);
      setSenderError("");
      setSenderProgress(null);
      setSenderPhase("waiting");

      try {
        senderSession.current = await sessionFactories.sender(freshCode, {
          onConnection: () => setSenderPhase("connected"),
          onData: handleSenderData,
          onClose: () => {
            setSenderPhase((phase) =>
              phase === "complete" || phase === "idle" ? phase : "error",
            );
            setSenderError((error) => error || "The receiver disconnected.");
          },
          onError: failSender,
        });
      } catch (error) {
        failSender(error instanceof Error ? error : new Error("Could not create a receive code."));
      }
    },
    [failSender, handleSenderData, sessionFactories],
  );

  const chooseFiles = useCallback(
    (selected: File[]) => {
      if (selected.length === 0) return;
      filesRef.current = selected;
      setFiles(selected);
      void beginSender();
    },
    [beginSender],
  );

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFiles(Array.from(event.target.files ?? []));
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    chooseFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    const next = filesRef.current.filter((_, fileIndex) => fileIndex !== index);
    filesRef.current = next;
    setFiles(next);
    if (next.length === 0) {
      senderSession.current?.close();
      senderSession.current = null;
      setCode("");
      setSenderPhase("idle");
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  }

  function resetSender() {
    senderSession.current?.close();
    senderAbort.current?.abort();
    senderSession.current = null;
    filesRef.current = [];
    setFiles([]);
    setCode("");
    setSenderProgress(null);
    setSenderError("");
    setSenderPhase("idle");
  }

  const handleReceiverData = useCallback(async (data: unknown) => {
    try {
      if (data instanceof ArrayBuffer) {
        fileReceiver.current?.handleChunk(data);
        return;
      }
      if (ArrayBuffer.isView(data)) {
        const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        fileReceiver.current?.handleChunk(view.slice().buffer);
        return;
      }

      const message = parseControlMessage(data);
      if (!message) throw new Error("The sender used an unsupported transfer format.");
      await fileReceiver.current?.handleControl(message);
      if (message.type === "manifest") {
        receiverSession.current?.send({
          protocolVersion: PROTOCOL_VERSION,
          type: "accept",
        });
        setReceiverPhase("receiving");
      } else if (message.type === "complete") {
        setReceiverPhase("complete");
      } else if (message.type === "cancel") {
        throw new Error(message.reason || "The sender cancelled the transfer.");
      }
    } catch (error) {
      setReceiveError(error instanceof Error ? error.message : "The transfer stopped.");
      setReceiverPhase("error");
    }
  }, []);

  async function connectReceiver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeReceiveCode(receiveCode);
    if (!isValidReceiveCode(normalized)) {
      setReceiveError("Enter four digits and three words, separated by hyphens.");
      return;
    }

    setReceiveCode(normalized);
    setReceiveError("");
    setReceiverPhase("connecting");
    fileReceiver.current = createFileReceiver(
      async (blob, file) => triggerDownload(blob, file.name),
      setReceiverProgress,
    );

    try {
      receiverSession.current = await sessionFactories.receiver(normalized, {
        onConnection: () =>
          receiverSession.current?.send({
            protocolVersion: PROTOCOL_VERSION,
            type: "hello",
          }),
        onData: (data) => void handleReceiverData(data),
        onClose: () =>
          setReceiverPhase((phase) =>
            phase === "complete" || phase === "idle" ? phase : "error",
          ),
        onError: (error) => {
          setReceiveError(error.message || "The sender could not be found.");
          setReceiverPhase("error");
        },
      });
    } catch (error) {
      setReceiveError(error instanceof Error ? error.message : "The sender could not be found.");
      setReceiverPhase("error");
    }
  }

  function resetReceiver() {
    receiverSession.current?.close();
    fileReceiver.current?.cancel();
    receiverSession.current = null;
    fileReceiver.current = null;
    setReceiverProgress(null);
    setReceiveError("");
    setReceiverPhase("idle");
  }

  return (
    <section className="workspace" id="top">
      <div className="intro">
        <div className="intro-heading">
          <p className="eyebrow">sendany</p>
          <h1>Send files, simply.</h1>
          <p className="intro-copy">
            Choose files or enter a receive code. Your transfer starts automatically.
          </p>
        </div>
        <div className="trust-row" aria-label="Transfer details">
          <span><LockKeyhole size={16} aria-hidden="true" /> Encrypted</span>
          <span><Radio size={16} aria-hidden="true" /> Direct browser transfer</span>
        </div>
      </div>

      <div className="workspace-switcher" role="group" aria-label="Transfer action">
        <button
          type="button"
          aria-pressed={activePanel === "send"}
          onClick={() => setActivePanel("send")}
        >
          Send files
        </button>
        <button
          type="button"
          aria-pressed={activePanel === "receive"}
          onClick={() => setActivePanel("receive")}
        >
          Receive files
        </button>
      </div>

      <div className="action-grid">
        <article
          className={`transfer-card send-card${activePanel === "send" ? " is-mobile-active" : ""}`}
          onDrop={onDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <div className="card-number">01</div>
          <div>
            <p className="card-kicker">Send</p>
            <h2>{senderPhase === "complete" ? "Files delivered" : "Choose what to share"}</h2>
            <p>{senderPhase === "complete" ? "The receiver downloaded your files." : "We’ll make a fresh receive code automatically."}</p>
          </div>

          {files.length === 0 ? (
            <label className="file-picker">
              <input type="file" multiple aria-label="Choose files" onChange={onFileInput} />
              <span className="picker-icon"><FileUp aria-hidden="true" /></span>
              <span><strong>Choose files</strong><small>or drop them anywhere on this card</small></span>
            </label>
          ) : (
            <div className="active-transfer">
              {senderPhase !== "complete" ? <FileList files={files} onRemove={removeFile} /> : null}
              {code && senderPhase !== "complete" ? (
                <ReceiveCodeCard
                  code={code}
                  copied={copied}
                  connected={["connected", "sending"].includes(senderPhase)}
                  onCopy={() => void copyCode()}
                />
              ) : null}
              {senderPhase === "sending" && senderProgress ? <TransferProgress progress={senderProgress} /> : null}
              {senderPhase === "complete" ? (
                <div className="success-panel"><CheckCircle2 size={34} /><strong>{files.length} {files.length === 1 ? "file" : "files"} sent</strong><button className="secondary-button" type="button" onClick={resetSender}><RotateCcw size={16} /> Send more files</button></div>
              ) : null}
              {senderPhase === "error" ? <div className="inline-error" role="alert">{senderError}<button type="button" onClick={resetSender}>Start over</button></div> : null}
            </div>
          )}
        </article>

        <article className={`transfer-card receive-card${activePanel === "receive" ? " is-mobile-active" : ""}`}>
          <div className="card-number">02</div>
          <div>
            <p className="card-kicker">Receive</p>
            <h2>{receiverPhase === "complete" ? "Download complete" : "Enter the receive code"}</h2>
            <p>{receiverPhase === "complete" ? "The files have been saved by your browser." : "Paste the fresh code shown on the sender’s screen."}</p>
          </div>

          {receiverPhase === "idle" || receiverPhase === "connecting" || receiverPhase === "error" ? (
            <div>
              <ReceiveCodeForm
                value={receiveCode}
                error={receiveError}
                busy={receiverPhase === "connecting"}
                onChange={(value) => { setReceiveCode(value); setReceiveError(""); }}
                onSubmit={connectReceiver}
              />
              {receiverPhase === "connecting" ? <p className="connection-note" role="status">Looking for the sender…</p> : null}
            </div>
          ) : null}

          {receiverPhase === "receiving" ? (receiverProgress ? <TransferProgress progress={receiverProgress} /> : <p className="connection-note" role="status">Connected. Your download will start automatically.</p>) : null}
          {receiverPhase === "complete" ? <div className="success-panel"><CheckCircle2 size={34} /><strong>Transfer complete</strong><button className="secondary-button" type="button" onClick={resetReceiver}><RotateCcw size={16} /> Receive another</button></div> : null}
        </article>
      </div>

    </section>
  );
}
