import { formatBytes } from "@/lib/format";
import type { TransferProgress as Progress } from "@/lib/send-files";

export function TransferProgress({ progress }: { progress: Progress }) {
  const percentage = progress.totalBytes
    ? Math.min(100, Math.round((progress.bytesTransferred / progress.totalBytes) * 100))
    : 0;
  return (
    <div className="progress-card" aria-live="polite">
      <div className="progress-meta">
        <strong>{progress.currentFile}</strong>
        <span>{percentage}%</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <small>
        {formatBytes(progress.bytesTransferred)} of {formatBytes(progress.totalBytes)}
      </small>
    </div>
  );
}
