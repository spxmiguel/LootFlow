import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Bot, FileSpreadsheet, LineChart, PackageSearch,
  Sparkles, Target, Zap,
} from 'lucide-react'
import { LegalModal, type LegalType } from '../components/LegalModal'

const points = [
  {
    icon: FileSpreadsheet,
    title: 'Sai da planilha',
    text: 'O controle começou no improviso: um pouco no Google Sheets, um pouco no Excel, nada muito confortável de abrir e atualizar toda hora.',
  },
  {
    icon: PackageSearch,
    title: 'Organiza a rotina',
    text: 'Contas Prime, drops da semana, preço Steam, cashout e observações ficam juntos, sem precisar lembrar onde cada coisa foi anotada.',
  },
  {
    icon: LineChart,
    title: 'Mostra se valeu a pena',
    text: 'A graça é bater o olho e entender payback, ROI e progresso. Sem promessa mágica, só número organizado.',
  },
]

function ProductMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, rotateX: 4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-md lg:max-w-none"
    >
      <div className="absolute -left-5 top-12 hidden h-24 w-24 rounded-full border border-primary/20 sm:block" />
      <div className="absolute -right-4 bottom-14 hidden h-20 w-20 rounded-full border border-profit/20 sm:block" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1018]/88 p-3 shadow-modal backdrop-blur sm:rounded-[30px] sm:p-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0f1724] p-3 sm:rounded-2xl sm:p-4">
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary sm:h-10 sm:w-10">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="font-display text-base font-bold text-white sm:text-lg">LootFlow</p>
                <p className="text-xs text-slate-500">painel de drops</p>
              </div>
            </div>
            <div className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] text-slate-400 sm:px-3 sm:text-xs">
              Prime R$ 74,99
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ['Cashout', 'R$ --,--', 'quando registrar'],
              ['ROI', '--%', 'por conta'],
              ['Meta', '0/2', 'drops semanais'],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0b1018] p-2.5 sm:p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
                <p className="mt-2 font-mono text-sm font-semibold text-slate-100 sm:text-base">{value}</p>
                <p className="mt-1 text-[10px] text-slate-600">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {[
              ['Conta principal', 'aguardando drops', 'bg-primary'],
              ['Conta farm 02', 'semana limpa', 'bg-profit'],
              ['Conta teste', 'acompanhar payback', 'bg-gold'],
            ].map(([name, status, color]) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0b1018]/70 p-3">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{name}</p>
                  <p className="text-xs text-slate-600">{status}</p>
                </div>
                <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.06] p-3 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
            A ideia é simples: abrir, registrar, entender o resultado e voltar para o jogo.
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function WelcomePage({ onContinue }: { onContinue: () => void }) {
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)

  return (
    <>
    {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    <main className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_18%_16%,rgba(56,189,248,0.13),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(74,222,128,0.07),transparent_22%),linear-gradient(180deg,#07090f_0%,#0a0f17_48%,#07090f_100%)] text-slate-100">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative z-10 flex min-h-[88vh] items-center px-5 pb-10 pt-8 sm:px-8 lg:min-h-[82vh] lg:px-12">
          <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#0c1018]/70 px-3 py-1.5 text-xs text-slate-400 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Uma ferramenta pequena para uma rotina real
              </div>

              <h1 className="font-display text-4xl font-extrabold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                LootFlow
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Um lugar para acompanhar drops do CS2 sem transformar tudo em uma planilha gigante.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                O projeto nasceu porque eu queria saber, de um jeito rápido, se as contas Prime estavam se pagando. Não tem promessa de dinheiro fácil, curso escondido ou pose de startup. É só uma ferramenta feita porque organizar isso manualmente era chato demais.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onContinue}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-[#041018] transition-transform hover:-translate-y-0.5"
                >
                  Entrar no LootFlow
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#historia"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.1] bg-[#0c1018]/70 px-5 text-sm font-semibold text-slate-200 backdrop-blur hover:border-white/[0.18]"
                >
                  Ler a história
                </a>
              </div>
            </motion.div>

            <ProductMock />
          </div>
        </div>
      </section>

      <section id="historia" className="px-5 pb-20 pt-2 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {points.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-slate-100">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            )
          })}
        </div>

        <div className="mx-auto mt-4 grid max-w-7xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-gold">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold">Como surgiu</h2>
            </div>
            <p className="text-sm leading-7 text-slate-400">
              Primeiro era só jogar nas contas e anotar os drops quando dava. Depois começou a ficar chato conferir retorno, cashout, ROI e histórico em planilha, principalmente alternando entre celular e computador. A planilha até quebrava o galho, mas nunca parecia feita para esse uso.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-profit">
                <Bot className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold">Feito com Claude Code</h2>
            </div>
            <p className="text-sm leading-7 text-slate-400">
              A ideia e a direção vieram da necessidade real de usar isso no dia a dia. O Claude Code ajudou pesado na implementação: telas, bugs, ajustes de layout, Firebase, mobile e todos esses detalhes que transformam uma ideia solta em um app usável.
            </p>
          </div>
        </div>

        {/* Legal footer */}
        <div className="text-center pb-8 pt-2">
          <p className="text-xs text-slate-700">
            Projeto open source · gratuito · sem rastreamento &nbsp;·&nbsp;
            <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
              Privacidade
            </button>
            &nbsp;·&nbsp;
            <button onClick={() => setLegalModal('terms')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
              Termos
            </button>
          </p>
        </div>
      </section>
    </main>
    </>
  )
}
