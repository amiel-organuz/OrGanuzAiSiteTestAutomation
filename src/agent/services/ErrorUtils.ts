export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function appendError(current: string | undefined, next: string): string {
  return current ? `${current}\n${next}` : next;
}
