import { FileText, X } from "lucide-react";
import { formatBytes } from "@/lib/format";

export function FileList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <ul className="file-list" aria-label="Selected files">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`}>
          <FileText size={18} aria-hidden="true" />
          <span>
            <strong>{file.name}</strong>
            <small>{formatBytes(file.size)}</small>
          </span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${file.name}`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
