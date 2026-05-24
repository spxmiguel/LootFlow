import { useStore } from '../store'
import { createT } from '../lib/i18n'

export function useT() {
  const lang = useStore(s => s.settings.language ?? 'pt')
  return createT(lang)
}
