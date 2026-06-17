import { logger } from '../lib/logger'
import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode; page?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logger.error(`[LootFlow crash in ${this.props.page}]:`, error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-loss/10 border border-loss/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-loss" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Erro nessa página</h2>
          <p className="text-slate-500 text-sm mb-1 max-w-md">
            {this.state.error.message}
          </p>
          <p className="text-slate-600 text-xs max-w-md mb-6 font-mono">
            {this.state.error.stack?.split('\n')[1]?.trim()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 active:scale-[0.97] transition-all"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 hover:bg-white/[0.08] active:scale-[0.97] transition-all"
            >
              Recarregar app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
