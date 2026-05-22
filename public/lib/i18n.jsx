/* lib/i18n.jsx — translations + language toggle context */

const I18N_KEY = "lootflow-lang";

const dict = {
  pt: {
    "nav.features": "Features",
    "nav.how": "Como funciona",
    "nav.whatsapp": "Bot WhatsApp",
    "nav.github": "GitHub",
    "nav.open": "Abrir LootFlow",

    "hero.tag": "CS2 · farm semanal · 100% grátis",
    "hero.line1": "Farm inteligente.",
    "hero.line2.before": "Nunca mais perca um",
    "hero.line2.accent": "drop.",
    "hero.lede": "LootFlow registra os drops semanais de todas as suas contas Prime do CS2, calcula o cashout real e te avisa no WhatsApp quando você esquecer. 100% grátis, open source. Seus dados ficam com você.",
    "hero.cta.primary": "Abrir LootFlow",
    "hero.cta.secondary": "Ver como funciona",
    "hero.meta.1": "local-first · sem cadastro",
    "hero.meta.2": "open source · MIT",
    "hero.meta.3": "pt-BR / en",

    "stats.1.tag": "por conta",
    "stats.1.label": "drops semanais garantidos por conta Prime ativa.",
    "stats.2.tag": "2 contas · r$10 / semana",
    "stats.2.unit": "/ mês",
    "stats.2.label": "potencial farmando 2 contas Prime — calculado em tempo real.",
    "stats.3.tag": "seus dados",
    "stats.3.label": "de comissão. zero analytics. local-first por padrão.",

    "features.eyebrow": "/ features",
    "features.title": "Tudo que uma planilha não te dá.",
    "features.lede": "Três coisas que importam quando você farma sério: visibilidade, lembrete e meta.",
    "features.1.title": "Dashboard completo",
    "features.1.body": "Cashout total, ROI por conta, histórico semana a semana. Todas as suas contas Prime numa tela só.",
    "features.2.title": "Lembretes via WhatsApp",
    "features.2.body": "O bot te cutuca toda semana, nos dias que você configurar. Você registra no app — o bot só lembra, sem complicação. Quer modo xingamentos? Funciona melhor.",
    "features.3.title": "Metas de cashout",
    "features.3.body": "Define quanto quer fazer no mês. Acompanha o progresso semana a semana — sabe exatamente quanto falta.",
    "features.viz.chart.range": "S16 → S22",
    "features.viz.chart.delta": "+R$ 80",
    "features.viz.wa.bot": "Ei 👀 AKM e servente de pedreiro ainda sem drop essa semana!",
    "features.viz.wa.me": "STATUS",
    "features.viz.wa.bot2": "❌ AKM: 0/2 · 🟡 servente: 1/2",
    "features.viz.goal.label": "META · MAIO",
    "features.viz.goal.target": "R$ 320",
    "features.viz.goal.week": "semana 4 · faltam R$ 102",

    "how.eyebrow": "/ como funciona",
    "how.title": "Três passos. Simples assim.",
    "how.passo": "passo",
    "how.1.title": "Cadastra suas contas Prime",
    "how.1.body": "Adiciona quantas contas quiser. Só o nome — nenhuma credencial, nenhum login Steam.",
    "how.2.title": "Registra os drops toda semana",
    "how.2.body": "Marca os drops na dashboard. O bot avisa se você esquecer. Leva 10 segundos por conta.",
    "how.3.title": "Acompanha cashout e lucro real",
    "how.3.body": "Vê cashout por conta, ROI, evolução semanal e quanto falta pra bater a meta do mês.",

    "wa.tag": "Bot WhatsApp · opcional",
    "wa.title": "Um bot que te enche o saco — do jeito certo.",
    "wa.body": "Toda semana, nos dias que você definir, o bot manda lembrete pelas contas que faltam. Sem app pra abrir, sem login. Você registra no LootFlow — o bot só garante que você não esquece. Quer mais agressivo? Tem modo xingamentos.",
    "wa.cta.primary": "Ativar bot",
    "wa.cta.secondary": "Configurar mensagens",
    "wa.mock.name": "LootFlow Bot",
    "wa.mock.status": "digitando…",
    "wa.mock.day": "hoje · ter, 27 mai",
    "wa.mock.composer": "Mensagem",
    "wa.mock.1": "🎮 *LootFlow* — Oi! 👋\n\nFaltam drops essa semana:\n• AKM — 0/2 drops\n• servente de pedreiro — 1/2 drops\n\nRegistra em: spxmiguel.github.io/LootFlow",
    "wa.mock.2": "STATUS",
    "wa.mock.3": "🎮 *LootFlow* — Drops desta semana\n\n❌ AKM: 0/2 drops · R$ 0,00\n🟡 servente de pedreiro: 1/2 · R$ 9,10\n\n_Responda AJUDA para ver comandos._",
    "wa.mock.4": "AJUDA",
    "wa.mock.5": "🎮 *LootFlow Bot* — Comandos\n\n*STATUS* — drops desta semana\n*AJUDA* — esta lista\n*PARAR* — desativar lembretes\n\n👉 spxmiguel.github.io/LootFlow",
    "wa.mock.6": "",

    "privacy.title": "Seus dados ficam no seu dispositivo.",
    "privacy.body": "Local-first por padrão. Firebase opcional para sincronizar entre celular e desktop — você decide.",
    "privacy.chip": "local-first · zero telemetry",

    "final.title.1": "Pronto pra parar",
    "final.title.2": "de perder drop?",
    "final.subtitle": "100% grátis · open source · funciona offline.",
    "final.cta": "Abrir LootFlow",

    "footer.github": "GitHub",
    "footer.changelog": "Changelog",
    "footer.privacy": "Privacy",
    "footer.made": "feito por @spxmiguel",
  },
  en: {
    "nav.features": "Features",
    "nav.how": "How it works",
    "nav.whatsapp": "WhatsApp Bot",
    "nav.github": "GitHub",
    "nav.open": "Open LootFlow",

    "hero.tag": "CS2 · weekly farm · 100% free",
    "hero.line1": "Farm smarter.",
    "hero.line2.before": "Track every",
    "hero.line2.accent": "drop.",
    "hero.lede": "LootFlow logs weekly drops across all your CS2 Prime accounts, calculates real cashout, and pings you on WhatsApp when you forget. 100% free, open source. Your data stays yours.",
    "hero.cta.primary": "Open LootFlow",
    "hero.cta.secondary": "See how it works",
    "hero.meta.1": "local-first · no signup",
    "hero.meta.2": "open source · MIT",
    "hero.meta.3": "en / pt-BR",

    "stats.1.tag": "per account",
    "stats.1.label": "weekly drops guaranteed per active Prime account.",
    "stats.2.tag": "2 accounts · r$10 / week",
    "stats.2.unit": "/ month",
    "stats.2.label": "realistic potential farming 2 Prime accounts — computed in real time.",
    "stats.3.tag": "your data",
    "stats.3.label": "commission. zero analytics. local-first by default.",

    "features.eyebrow": "/ features",
    "features.title": "Everything a spreadsheet won't give you.",
    "features.lede": "Three things that matter when you farm seriously: visibility, reminders, goals.",
    "features.1.title": "Full dashboard",
    "features.1.body": "Total cashout, ROI per account, week-by-week history. All your Prime accounts on one screen.",
    "features.2.title": "WhatsApp reminders",
    "features.2.body": "The bot nudges you every week, on the days you configure. You log drops in the app — the bot just makes sure you don't forget. Want roast mode? It works better.",
    "features.3.title": "Cashout goals",
    "features.3.body": "Set how much you want to make this month. Track progress week by week — know exactly how much is left.",
    "features.viz.chart.range": "W16 → W22",
    "features.viz.chart.delta": "+R$ 80",
    "features.viz.wa.bot": "Hey 👀 AKM and servente still need drops this week!",
    "features.viz.wa.me": "STATUS",
    "features.viz.wa.bot2": "❌ AKM: 0/2 · 🟡 servente: 1/2",
    "features.viz.goal.label": "GOAL · MAY",
    "features.viz.goal.target": "R$ 320",
    "features.viz.goal.week": "week 4 · R$ 102 to go",

    "how.eyebrow": "/ how it works",
    "how.title": "Three steps. Simple as that.",
    "how.passo": "step",
    "how.1.title": "Add your Prime accounts",
    "how.1.body": "Add as many as you want. Just a name — no credentials, no Steam login.",
    "how.2.title": "Log drops every week",
    "how.2.body": "Mark drops on the dashboard. The bot reminds you if you forget. Takes 10 seconds per account.",
    "how.3.title": "Track cashout and real profit",
    "how.3.body": "See cashout per account, ROI, weekly evolution, and how much is left to hit this month's goal.",

    "wa.tag": "WhatsApp Bot · optional",
    "wa.title": "A bot that bugs you — the right way.",
    "wa.body": "Every week, on the days you pick, the bot pings you about pending accounts. No app to open, no login. You log drops in LootFlow — the bot just makes sure you don't forget. Want it more aggressive? Roast mode is built in.",
    "wa.cta.primary": "Enable bot",
    "wa.cta.secondary": "Configure messages",
    "wa.mock.name": "LootFlow Bot",
    "wa.mock.status": "typing…",
    "wa.mock.day": "today · tue, may 27",
    "wa.mock.composer": "Message",
    "wa.mock.1": "🎮 *LootFlow* — Hey! 👋\n\nDrops pending this week:\n• AKM — 0/2 drops\n• servente de pedreiro — 1/2 drops\n\nLog at: spxmiguel.github.io/LootFlow",
    "wa.mock.2": "STATUS",
    "wa.mock.3": "🎮 *LootFlow* — This week's drops\n\n❌ AKM: 0/2 drops · R$ 0.00\n🟡 servente de pedreiro: 1/2 · R$ 9.10\n\n_Reply HELP to see commands._",
    "wa.mock.4": "HELP",
    "wa.mock.5": "🎮 *LootFlow Bot* — Commands\n\n*STATUS* — this week's drops\n*HELP* — this list\n*STOP* — disable reminders\n\n👉 spxmiguel.github.io/LootFlow",
    "wa.mock.6": "",

    "privacy.title": "Your data stays on your device.",
    "privacy.body": "Local-first by default. Optional Firebase to sync between phone and desktop — your call.",
    "privacy.chip": "local-first · zero telemetry",

    "final.title.1": "Ready to stop",
    "final.title.2": "missing drops?",
    "final.subtitle": "100% free · open source · works offline.",
    "final.cta": "Open LootFlow",

    "footer.github": "GitHub",
    "footer.changelog": "Changelog",
    "footer.privacy": "Privacy",
    "footer.made": "made by @spxmiguel",
  },
};

const I18nContext = React.createContext({ lang: "pt", t: (k) => k, setLang: () => {} });

function I18nProvider({ children }) {
  const [lang, setLangState] = React.useState(() => {
    try { return localStorage.getItem(I18N_KEY) || "pt"; } catch { return "pt"; }
  });
  React.useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);
  const setLang = React.useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(I18N_KEY, l); } catch {}
  }, []);
  const t = React.useCallback(
    (key) => (dict[lang] && dict[lang][key]) ?? dict.pt[key] ?? key,
    [lang]
  );
  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n() {
  return React.useContext(I18nContext);
}

function LangToggle({ className = "" }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={"lang-toggle " + className} role="group" aria-label="Language">
      <button
        className={"lang-opt" + (lang === "pt" ? " active" : "")}
        onClick={() => setLang("pt")}
        aria-pressed={lang === "pt"}
      >PT</button>
      <button
        className={"lang-opt" + (lang === "en" ? " active" : "")}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >EN</button>
    </div>
  );
}

Object.assign(window, { I18nProvider, useI18n, LangToggle });
