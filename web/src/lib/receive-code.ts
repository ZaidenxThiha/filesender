import { CROC_WORDS } from "./croc-words";

const CODE_PATTERN = /^[0-9]{4}(?:-[a-z]+){3}$/;
const PEER_NAMESPACE = "croc-web-v1-";
const wordSet = new Set<string>(CROC_WORDS);

export type RandomIndex = (upperBound: number) => number;

function secureRandomIndex(upperBound: number): number {
  if (!Number.isSafeInteger(upperBound) || upperBound <= 0) {
    throw new RangeError("upperBound must be a positive safe integer");
  }

  const range = 0x1_0000_0000;
  const limit = range - (range % upperBound);
  const sample = new Uint32Array(1);

  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= limit);

  return sample[0] % upperBound;
}

export function generateReceiveCode(
  randomIndex: RandomIndex = secureRandomIndex,
): string {
  const digits = Array.from({ length: 4 }, () => randomIndex(10)).join("");
  const words = Array.from(
    { length: 3 },
    () => CROC_WORDS[randomIndex(CROC_WORDS.length)],
  );

  return `${digits}-${words.join("-")}`;
}

export function normalizeReceiveCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidReceiveCode(value: string): boolean {
  const normalized = normalizeReceiveCode(value);
  if (!CODE_PATTERN.test(normalized)) return false;

  const [, ...words] = normalized.split("-");
  return words.every((word) => wordSet.has(word));
}

export function toPeerId(code: string): string {
  return `${PEER_NAMESPACE}${normalizeReceiveCode(code)}`;
}
