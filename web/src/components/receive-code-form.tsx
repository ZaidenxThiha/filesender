import { ArrowRight } from "lucide-react";
import type { FormEvent } from "react";

export function ReceiveCodeForm({
  value,
  error,
  busy,
  onChange,
  onSubmit,
}: {
  value: string;
  error: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="receive-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="receive-code">Receive code</label>
      <div className="input-row">
        <input
          id="receive-code"
          autoComplete="off"
          inputMode="text"
          placeholder="8827-dance-gong-place"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "receive-code-error" : undefined}
        />
        <button
          type="submit"
          aria-label="Connect with receive code"
          disabled={busy}
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p className="form-error" id="receive-code-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
