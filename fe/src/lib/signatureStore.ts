// Simple module-level store for default signature persistence.

let _defaultSignature: string | null = null;
const _listeners: Set<() => void> = new Set();

export function getDefaultSignature(): string | null {
  return _defaultSignature;
}

export function setDefaultSignature(url: string | null): void {
  _defaultSignature = url;
  _listeners.forEach((fn) => fn());
}

export function subscribeSignature(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
