export type Theme = 'light' | 'dark' | 'system'
export const getTheme = (): Theme => (localStorage.getItem('olh-theme') as Theme) || 'system'
export function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
export function setTheme(t: Theme) { localStorage.setItem('olh-theme', t); applyTheme(t) }
