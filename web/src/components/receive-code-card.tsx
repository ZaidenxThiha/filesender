import { Check, Copy, LoaderCircle, Radio } from "lucide-react";

export function ReceiveCodeCard({
  code,
  copied,
  connected,
  onCopy,
}: {
  code: string;
  copied: boolean;
  connected: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="code-card">
      <span className="code-label">Your fresh receive code</span>
      <strong className="generated-code">{code}</strong>
      <button type="button" className="secondary-button" onClick={onCopy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy code"}
      </button>
      <p className="connection-note" role="status">
        {connected ? (
          <><Radio size={15} /> Receiver connected</>
        ) : (
          <><LoaderCircle className="spin" size={15} /> Waiting for the receiver</>
        )}
      </p>
    </div>
  );
}
