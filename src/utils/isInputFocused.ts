export function isInputFocused(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}
