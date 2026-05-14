import { X, ExternalLink } from 'lucide-react'
import { useEffect } from 'react'

export type LegalType = 'privacy' | 'terms'

const GITHUB_URL = 'https://github.com/spxmiguel/LootFlow'
const GITHUB_ISSUES = `${GITHUB_URL}/issues`
const UPDATED_AT = 'Maio 2026'

function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm text-slate-400 leading-7">
      <p className="text-slate-300">
        LootFlow é um projeto open source e gratuito para rastrear drops do CS2.
        Aqui está o que acontece com seus dados — sem enrolação.
      </p>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">O que guardamos</h3>
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-slate-300 font-medium text-xs mb-1">Modo Convidado</p>
            <p>
              Só os dados que você insere (contas, drops, metas) ficam no{' '}
              <code className="text-primary text-xs">localStorage</code> do seu navegador.
              Nada sai do dispositivo.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-slate-300 font-medium text-xs mb-1">Login com Google</p>
            <p>
              O Google envia para o app seu <strong className="text-slate-300">e-mail, nome e foto de perfil</strong> —
              usados para identificar sua conta no Firebase. Seus dados de jogo também ficam sincronizados
              no Firestore (Google Cloud, servidores nos EUA).
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">O que nunca fazemos</h3>
        <p>
          Sem analytics, sem rastreamento, sem publicidade, sem coleta de IP, sem vender dados.
          O código é público —{' '}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1">
            qualquer um pode auditar <ExternalLink size={11} />
          </a>.
        </p>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Sync com Firebase</h3>
        <ul className="space-y-1.5">
          <li>• Modo Convidado: zero upload para a nuvem.</li>
          <li>• Login Google: sync ativado por padrão, mas você pode desligar em <strong className="text-slate-300">Configurações → Privacidade</strong>.</li>
          <li>• Com sync ativo: exclusões locais também apagam do Firestore.</li>
          <li>• Com sync desativado: novas alterações ficam só no dispositivo.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Seus dados, seu controle</h3>
        <ul className="space-y-1.5">
          <li>• <strong className="text-slate-300">Ver:</strong> tudo visível no app.</li>
          <li>• <strong className="text-slate-300">Corrigir:</strong> edite qualquer registro a qualquer momento.</li>
          <li>• <strong className="text-slate-300">Apagar:</strong> Configurações → Privacidade, por categoria ou tudo.</li>
          <li>• <strong className="text-slate-300">Exportar:</strong> Configurações → Exportar (CSV, XLSX ou JSON).</li>
        </ul>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Dúvidas</h3>
        <p>
          Abra uma issue:{' '}
          <a href={GITHUB_ISSUES} target="_blank" rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1">
            github.com/spxmiguel/LootFlow/issues <ExternalLink size={11} />
          </a>
        </p>
      </section>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="space-y-5 text-sm text-slate-400 leading-7">
      <p className="text-slate-300">
        LootFlow é gratuito, open source e sem fins comerciais.
      </p>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Para que serve</h3>
        <p>Organizar e visualizar seus próprios drops de CS2. Só isso.</p>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Sem garantias</h3>
        <p>
          Fornecido "como está". Não nos responsabilizamos por perda de dados,
          erros nos preços do Steam ou mudanças de política da Valve/Google.
          Faça backup regularmente em <strong className="text-slate-300">Configurações → Exportar</strong>.
        </p>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Uso aceitável</h3>
        <ul className="space-y-1.5">
          <li>• Uso pessoal para seus próprios dados.</li>
          <li>• Não use para fins ilegais ou para tentar acessar dados de outros.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Código aberto</h3>
        <p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1">
            github.com/spxmiguel/LootFlow <ExternalLink size={11} />
          </a>
          {' '}— licença e histórico de mudanças no repositório.
        </p>
      </section>

      <section>
        <h3 className="text-slate-200 font-semibold mb-2">Dúvidas</h3>
        <p>
          <a href={GITHUB_ISSUES} target="_blank" rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1">
            github.com/spxmiguel/LootFlow/issues <ExternalLink size={11} />
          </a>
        </p>
      </section>
    </div>
  )
}

export function LegalModal({ type, onClose }: { type: LegalType; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const title = type === 'privacy' ? 'Privacidade' : 'Termos de Uso'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[88vh] sm:max-h-[82vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#0c1018] border border-white/[0.09] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-semibold text-white text-sm">{title}</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">Atualizado: {UPDATED_AT}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {type === 'privacy' ? <PrivacyContent /> : <TermsContent />}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
