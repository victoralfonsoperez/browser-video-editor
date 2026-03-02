export function getErrorMessage(err: unknown, fallback = 'Export failed'): string {
  return err instanceof Error ? err.message : fallback;
}
