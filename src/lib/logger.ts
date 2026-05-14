// Logger que só imprime em desenvolvimento.
// Em produção (GitHub Pages), todos os logs são silenciados.

const isDev = import.meta.env.DEV

export const logger = {
  log:   (...args: unknown[]) => { if (isDev) console.log(...args) },
  warn:  (...args: unknown[]) => { if (isDev) console.warn(...args) },
  error: (...args: unknown[]) => { if (isDev) console.error(...args) },
  info:  (...args: unknown[]) => { if (isDev) console.info(...args) },
}
