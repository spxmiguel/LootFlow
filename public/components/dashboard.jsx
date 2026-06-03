/* components/dashboard.jsx — fake LootFlow dashboard with auto-scale + sidebar */

function DashboardMock() {
  const scaleWrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const { t, lang } = useI18n();

  React.useEffect(() => {
    const el = scaleWrapRef.current;
    if (!el) return;
    const update = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      setScale(Math.min(1, w / 1280));
    };
    update();
    let ro = null;
    if (window.ResizeObserver && el.parentElement) {
      ro = new ResizeObserver(update);
      ro.observe(el.parentElement);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  // 8-week cashout series (realistic CS2 drop values)
  const weeks = [
    { d: "14/04", v: 18 },
    { d: "21/04", v: 12 },
    { d: "28/04", v: 12 },
    { d: "05/05", v: 62 },
    { d: "12/05", v: 34 },
    { d: "19/05", v: 38 },
    { d: "26/05", v: 18 },
    { d: "02/06", v: 10 },
  ];
  const maxV = 80;

  const accounts = [
    { dot: "#10b981", name: "AKM",                  drops: 10, bruto: lang === 'en' ? "$ 5.14" : "R$ 25,72",  cashout: lang === 'en' ? "$ 4.37" : "R$ 21,87", roi: "-71%",  roiPos: false },
    { dot: "#10b981", name: "servente de pedreiro",  drops: 8,  bruto: lang === 'en' ? "$ 6.96" : "R$ 34,82",  cashout: lang === 'en' ? "$ 5.92" : "R$ 29,61", roi: "-61%",  roiPos: false },
  ];

  // chart coordinates
  const chartW = 490, chartH = 200, padL = 44, padR = 24, padT = 18, padB = 36;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const xs = weeks.map((_, i) => padL + (i / (weeks.length - 1)) * innerW);
  const ys = weeks.map((w) => padT + innerH - (w.v / maxV) * innerH);

  function smoothPath(xs, ys) {
    let d = `M${xs[0]},${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i - 1] ?? xs[i];
      const y0 = ys[i - 1] ?? ys[i];
      const x1 = xs[i];
      const y1 = ys[i];
      const x2 = xs[i + 1];
      const y2 = ys[i + 1];
      const x3 = xs[i + 2] ?? xs[i + 1];
      const y3 = ys[i + 2] ?? ys[i + 1];
      const cp1x = x1 + (x2 - x0) / 6;
      const cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6;
      const cp2y = y2 - (y3 - y1) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    }
    return d;
  }
  const linePath = smoothPath(xs, ys);
  const areaPath = `${linePath} L${xs[xs.length - 1]},${padT + innerH} L${xs[0]},${padT + innerH} Z`;
  const yTicks = [0, 20, 40, 60, 80];

  return (
    <div className="dash-scaler" ref={scaleWrapRef} style={{ height: 860 * scale }}>
      <div className="dash" style={{ width: 1280, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div className="dash-body">
          {/* ----- SIDEBAR ----- */}
          <aside className="dash-side">
            <div className="dash-brand">
              <span className="dash-brand-mark">
                <MarkIcon />
              </span>
              <div>
                <div className="dash-brand-name">LootFlow</div>
                <div className="dash-brand-sub">CS2 Analytics</div>
              </div>
            </div>

            <div className="dash-week-card">
              <div className="dash-week-head">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
                {t("dash.week.label")}
              </div>
              <div className="dash-week-stats">
                <div>
                  <div className="dash-week-num">2</div>
                  <div className="dash-week-lbl">{t("dash.week.contas")}</div>
                </div>
                <div>
                  <div className="dash-week-num">4</div>
                  <div className="dash-week-lbl">{t("dash.week.target")}</div>
                </div>
              </div>
            </div>

            <nav className="dash-nav">
              <a className="active">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                {t("dash.nav.dashboard")}
                <svg className="dash-nav-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {t("dash.nav.contas")}
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                {t("dash.nav.drops")}
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                {t("dash.nav.analytics")}
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
                {t("dash.nav.metas")}
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                {t("dash.nav.config")}
              </a>
            </nav>

            <div className="dash-side-foot">
              <span className="dash-user-avatar">
                <svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#1a2330"/><circle cx="16" cy="13" r="5" fill="#4b5563"/><path d="M5 30c2-6 6-9 11-9s9 3 11 9" fill="#4b5563"/></svg>
              </span>
              <div className="dash-user-info">
                <div className="dash-user-name">miguel</div>
                <div className="dash-user-email">m•••@g•••.com</div>
              </div>
              <button className="dash-logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </aside>

          {/* ----- MAIN ----- */}
          <main className="dash-main">
            {/* topbar */}
            <div className="dash-topbar">
              <div>
                <h3 className="dash-title">{t("dash.nav.dashboard")}</h3>
                <div className="dash-subtitle">{t("dash.subtitle")}</div>
              </div>
              <button className="dash-cta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t("dash.register")}
              </button>
            </div>

            {/* Warning banner */}
            <div className="dash-warning-banner">
              <div className="dash-warning-left">
                <svg className="dash-warning-icon text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                  <div className="dash-warning-title">
                    {lang === 'en' ? 'Pending weekly drops (02/06 – 09/06/26)' : 'Drops semanais pendentes (02/06 – 09/06/26)'}
                  </div>
                  <div className="dash-warning-subtitle">
                    {lang === 'en' ? '2 accounts need attention: AKM, servente de pedreiro.' : '2 contas precisam de atenção: AKM, servente de pedreiro.'}
                  </div>
                </div>
              </div>
              <button className="dash-warning-btn">
                {lang === 'en' ? 'Register Drops' : 'Registrar Drops'}
              </button>
            </div>

            {/* Redesigned Context Cards Grid */}
            <div className="dash-context-grid">
              {/* Card 1: Saldo Líquido */}
              <div className="dash-context-card lg-span-2 relative overflow-hidden">
                <div className="dash-context-glow red-glow" />
                <div className="dash-card-top flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className="dash-card-dot red" />
                    <span className="dash-card-eyebrow">{lang === 'en' ? 'Net Balance' : 'Saldo Líquido'}</span>
                  </div>
                  <span className="dash-badge red-badge">{lang === 'en' ? 'Payback in Progress' : 'Payback em Andamento'}</span>
                </div>
                
                <div className="dash-card-middle mt-4">
                  <div className="dash-card-val red-val font-mono font-bold">
                    {lang === 'en' ? '-$ 19.70' : '-R$ 98,50'}
                  </div>
                  <div className="dash-card-desc text-slate-400 text-xs mt-1">
                    {lang === 'en' ? 'Total recovered: ' : 'Total recuperado: '}
                    <span className="text-green-400 font-semibold">{lang === 'en' ? '$ 10.30' : 'R$ 51,48'}</span>
                    {lang === 'en' ? ' of ' : ' de '}
                    <span className="text-slate-300 font-medium">{lang === 'en' ? '$ 30.00' : 'R$ 149,98'}</span>
                    {lang === 'en' ? ' invested.' : ' investidos.'}
                  </div>
                </div>

                <div className="dash-card-bottom mt-auto w-full">
                  <div className="dash-progress-text flex justify-between text-xs text-slate-400">
                    <span>{lang === 'en' ? 'Return on Investment (Payback)' : 'Retorno do Investimento (Payback)'}</span>
                    <span className="text-primary font-mono font-bold">34%</span>
                  </div>
                  <div className="dash-progress-track mt-1.5 h-2 rounded-full bg-white/[0.06] overflow-hidden p-[1px] border border-white/[0.04]">
                    <div className="dash-progress-fill bg-gradient-to-r from-primary to-primary/60 h-full rounded-full" style={{ width: '34%' }} />
                  </div>
                </div>
              </div>

              {/* Card 2: Semana Atual */}
              <div className="dash-context-card relative overflow-hidden">
                <div className="dash-context-glow blue-glow" />
                <div className="dash-card-top flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <svg className="text-primary animate-pulse shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span className="dash-card-eyebrow">{lang === 'en' ? 'Current Week' : 'Semana Atual'}</span>
                  </div>
                  <span className="dash-badge green-badge">{lang === 'en' ? 'Active Cycle' : 'Ciclo Ativo'}</span>
                </div>

                <div className="dash-card-middle mt-4">
                  <div className="dash-card-val-sm text-slate-100 font-bold">
                    {lang === 'en' ? '$ 0.00' : 'R$ 0,00'} <span className="text-slate-500 text-xs font-normal">{lang === 'en' ? 'recovered' : 'recuperado'}</span>
                  </div>
                  <div className="dash-card-desc text-slate-400 text-xs mt-1">
                    {lang === 'en' ? 'Est. gross: ' : 'Bruto est.: '}
                    {lang === 'en' ? '$ 0.00' : 'R$ 0,00'}
                  </div>
                </div>

                <div className="dash-card-bottom mt-auto w-full">
                  <div className="dash-progress-text flex justify-between text-xs text-slate-500">
                    <span>{lang === 'en' ? 'Drops Progress' : 'Progresso Drops'}</span>
                    <span>0 / 4</span>
                  </div>
                  <div className="dash-progress-track mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="dash-progress-fill bg-gradient-to-r from-primary to-green-400 h-full rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>

              {/* Card 3: Meta Próxima */}
              <div className="dash-context-card relative overflow-hidden">
                <div className="dash-context-glow gold-glow" />
                <div className="dash-card-top flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <svg className="text-yellow-400 animate-bounce shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    <span className="dash-badge gold-badge">2%</span>
                  </div>
                </div>

                <div className="dash-card-middle mt-4">
                  <div className="dash-card-val-sm text-slate-100 font-bold truncate">
                    Bayonet Doppler
                  </div>
                  <div className="dash-card-desc text-slate-400 text-xs mt-1">
                    {lang === 'en' ? 'Target: ' : 'Alvo: '}
                    {lang === 'en' ? '$ 500.00' : 'R$ 2.500,00'}
                  </div>
                </div>

                <div className="dash-card-bottom mt-auto w-full">
                  <div className="dash-progress-text flex justify-between text-xs text-slate-500">
                    <span>{lang === 'en' ? 'Progress' : 'Progresso'}</span>
                    <span>{lang === 'en' ? '$ 10.30' : 'R$ 51,48'}</span>
                  </div>
                  <div className="dash-progress-track mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="dash-progress-fill bg-yellow-400 h-full rounded-full" style={{ width: '2%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="dash-metrics-strip">
              <div className="dash-metric-card">
                <span className="dash-metric-label">{lang === 'en' ? 'Total Cashout' : 'Cashout Recuperado'}</span>
                <span className="dash-metric-val green-text">{lang === 'en' ? '$ 10.30' : 'R$ 51,48'}</span>
              </div>
              <div className="dash-metric-card">
                <span className="dash-metric-label">{lang === 'en' ? 'Overall ROI' : 'ROI Geral'}</span>
                <span className="dash-metric-val red-text">-66%</span>
              </div>
              <div className="dash-metric-card">
                <span className="dash-metric-label">{lang === 'en' ? 'Gross Total' : 'Bruto Acumulado'}</span>
                <span className="dash-metric-val text-slate-200">{lang === 'en' ? '$ 12.10' : 'R$ 60,54'}</span>
              </div>
              <div className="dash-metric-card">
                <span className="dash-metric-label">{lang === 'en' ? 'Total Invested' : 'Investimento Total'}</span>
                <span className="dash-metric-val text-slate-400">{lang === 'en' ? '$ 30.00' : 'R$ 149,98'}</span>
              </div>
            </div>

            {/* Two-column layout: Chart + current week on left, Feed on right */}
            <div className="dash-two-col">
              <div className="dash-col-left flex flex-col gap-4">
                {/* Chart Panel */}
                <div className="dash-panel">
                  <div className="dash-panel-head">
                    <div>
                      <div className="dash-panel-eyebrow">{t("dash.chart.eyebrow")}</div>
                      <div className="dash-panel-title">{t("dash.chart.title")}</div>
                    </div>
                    <button className="dash-pill-btn">{t("dash.chart.btn")}</button>
                  </div>
                  <svg className="dash-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="cashg" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#4ade80" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {yTicks.map((tick, i) => {
                      const y = padT + innerH - (tick / maxV) * innerH;
                      const formattedTick = lang === 'en' ? `$${(tick / 5).toFixed(0)}` : `R$${tick}`;
                      return (
                        <g key={i}>
                          <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                          <text x={padL - 8} y={y + 3} textAnchor="end" fill="#475569" fontSize="10" fontFamily="JetBrains Mono">{formattedTick}</text>
                        </g>
                      );
                    })}
                    {weeks.map((w, i) => (
                      <text key={i} x={xs[i]} y={chartH - 10} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="Figtree">{w.d}</text>
                    ))}
                    <path d={areaPath} fill="url(#cashg)"/>
                    <path d={linePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                    {xs.map((x, i) => (
                      <circle key={i} cx={x} cy={ys[i]} r="3" fill="#4ade80" stroke="none" />
                    ))}
                  </svg>
                </div>
              </div>

              {/* Right column: Current Week stats + Recent Feed */}
              <div className="dash-col-right flex flex-col gap-4">
                {/* Current week card */}
                <div className="dash-panel">
                  <div className="dash-week-title flex items-center gap-2">
                    <span className="dash-flame text-amber-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73S7.3 7.53 7.3 5.47l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 0 0 16 0c0-4.08-2-7.74-6.5-13.33zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                    </span>
                    <span>{t("dash.week2.title")}</span>
                  </div>

                  <div className="dash-week-row flex justify-between text-xs text-slate-400 mt-1">
                    <span>{t("dash.week2.drops")}</span>
                    <span className="font-bold text-slate-300">0 / 4</span>
                  </div>
                  <div className="dash-week-bar h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full" style={{ width: "0%" }} />
                  </div>

                  <div className="dash-mini-stats grid grid-cols-2 gap-3 mt-1">
                    <div className="dash-mini-stat bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl">
                      <div className="dash-mini-lbl text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t("dash.week2.bruto")}</div>
                      <div className="dash-mini-val text-sm font-bold text-slate-200 mt-1">{lang === 'en' ? '$ 0.00' : 'R$ 0,00'}</div>
                    </div>
                    <div className="dash-mini-stat bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl">
                      <div className="dash-mini-lbl text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t("dash.week2.cashout")}</div>
                      <div className="dash-mini-val text-sm font-bold text-green-400 mt-1">{lang === 'en' ? '$ 0.00' : 'R$ 0,00'}</div>
                    </div>
                  </div>

                  <div className="dash-best border border-yellow-500/20 bg-yellow-500/5 p-3 rounded-xl mt-1">
                    <div className="dash-best-row flex items-center gap-1.5 text-[10px] text-yellow-400 font-bold uppercase tracking-wider font-body">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                      {t("dash.week2.best")}
                    </div>
                    <div className="dash-best-val text-base font-mono font-bold text-slate-200 mt-1">{lang === 'en' ? '$ 4.18' : 'R$ 20,91'}</div>
                    <div className="dash-best-date text-[10px] text-slate-500 font-mono mt-0.5">05/05 — 12/05/26</div>
                  </div>
                </div>

                {/* Recent Feed Panel */}
                <div className="dash-panel">
                  <div className="dash-feed-header">
                    <div className="dash-panel-title font-bold text-sm text-slate-200">
                      {lang === 'en' ? 'Recent Feed' : 'Feed recente'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-body">
                      {lang === 'en' ? 'Drops, payback & goals' : 'Drops, payback e metas'}
                    </div>
                  </div>

                  <div className="dash-feed-list flex flex-col gap-3 mt-2">
                    {/* Item 1 */}
                    <div className="dash-feed-item flex items-center gap-3">
                      <div className="dash-avatar-wrapper relative shrink-0">
                        <span className="dash-avatar-emoji">👷‍♂️</span>
                        <span className="dash-avatar-dot border border-white/20 bg-green-500 absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-semibold truncate leading-none">
                          servente de pedreiro
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-1">
                          {lang === 'en' ? '$ 0.24 cashout · Drop #2' : 'R$ 1,20 cashout · Drop #2'}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded font-body">
                        {lang === 'en' ? 'Today' : 'Hoje'}
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="dash-feed-item flex items-center gap-3">
                      <div className="dash-avatar-wrapper relative shrink-0">
                        <span className="dash-avatar-emoji">👷‍♂️</span>
                        <span className="dash-avatar-dot border border-white/20 bg-green-500 absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-semibold truncate leading-none">
                          servente de pedreiro
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-1">
                          {lang === 'en' ? '$ 0.03 cashout · Drop #1' : 'R$ 0,13 cashout · Drop #1'}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded font-body">
                        {lang === 'en' ? 'Today' : 'Hoje'}
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="dash-feed-item flex items-center gap-3">
                      <div className="dash-avatar-wrapper relative shrink-0">
                        <span className="dash-avatar-text text-blue-400 bg-blue-500/10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold">AK</span>
                        <span className="dash-avatar-dot border border-white/20 bg-green-500 absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-semibold truncate leading-none">
                          AKM
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-1">
                          {lang === 'en' ? '$ 0.27 cashout · Drop #2' : 'R$ 1,33 cashout · Drop #2'}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded font-body">
                        {lang === 'en' ? 'Today' : 'Hoje'}
                      </span>
                    </div>

                    {/* Item 4 */}
                    <div className="dash-feed-item flex items-center gap-3">
                      <div className="dash-avatar-wrapper relative shrink-0">
                        <span className="dash-avatar-text text-blue-400 bg-blue-500/10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold">AK</span>
                        <span className="dash-avatar-dot border border-white/20 bg-green-500 absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-semibold truncate leading-none">
                          AKM
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-1">
                          {lang === 'en' ? '$ 0.27 cashout · Drop #1' : 'R$ 1,33 cashout · Drop #1'}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded font-body">
                        {lang === 'en' ? 'Today' : 'Hoje'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* accounts table */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title plain">{t("dash.table.title")}</div>
                <a className="dash-week-link sm">{t("dash.table.link")} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
              </div>
              <div className="dash-table">
                <div className="dash-tr dash-th">
                  <div>{t("dash.table.conta")}</div>
                  <div className="num">{t("dash.table.drops")}</div>
                  <div className="num">{t("dash.table.bruto")}</div>
                  <div className="num">{t("dash.table.cashout")}</div>
                  <div className="num">{t("dash.table.roi")}</div>
                </div>
                {accounts.map((a) => (
                  <div className="dash-tr" key={a.name}>
                    <div className="dash-cell-acc font-semibold">
                      <span className="dash-dot" style={{ background: a.dot, boxShadow: `0 0 8px ${a.dot}` }}></span>
                      {a.name}
                    </div>
                    <div className="num text-slate-300 font-mono">{a.drops}</div>
                    <div className="num text-slate-400 font-mono">{a.bruto}</div>
                    <div className="num green font-mono">{a.cashout}</div>
                    <div className="num"><span className={"dash-roi-chip font-bold text-red-400 font-mono"}>{a.roi}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        <style dangerouslySetInnerHTML={{ __html: dashboardStyles }} />
      </div>
    </div>
  );
}

// LootFlow mark — asymmetric chevron + green foot
function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <line x1="6.9" y1="12" x2="16.7" y2="4.5" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="6.9" y1="12" x2="14.25" y2="17.25" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="14.25" y1="17.25" x2="19.3" y2="17.25" stroke="#4ade80" strokeWidth="2.7" strokeLinecap="round"/>
    </svg>
  );
}

window.MarkIcon = MarkIcon;

const dashboardStyles = `
.dash-scaler { width: 100%; overflow: hidden; }
.dash {
  font-family: var(--sans);
  color: #e2e8f0;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  background: #07090f;
}
.dash-body { display: grid; grid-template-columns: 240px 1fr; min-height: 860px; }

/* ----- sidebar ----- */
.dash-side {
  background: #07090f;
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 22px 16px 18px;
  display: flex; flex-direction: column;
  gap: 18px;
}
.dash-brand { display: flex; align-items: center; gap: 12px; padding: 0 4px; }
.dash-brand-mark {
  width: 38px; height: 38px; border-radius: 10px;
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.08);
  color: #ffffff;
  display: grid; place-items: center;
}
.dash-brand-mark svg { width: 18px; height: 18px; }
.dash-brand-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: #ffffff; }
.dash-brand-sub { font-size: 10px; color: #64748b; font-family: var(--mono); letter-spacing: 0.06em; text-transform: uppercase; }

.dash-week-card {
  background: rgba(16,185,129,0.04);
  border: 1px solid rgba(16,185,129,0.14);
  border-radius: 10px;
  padding: 12px 14px;
}
.dash-week-head { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b; margin-bottom: 8px; font-weight: 500; }
.dash-week-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dash-week-num { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; color: #e2e8f0; font-variant-numeric: tabular-nums; }
.dash-week-lbl { font-size: 10px; color: #64748b; margin-top: 4px; font-family: var(--mono); letter-spacing: 0.04em; }

.dash-nav { display: flex; flex-direction: column; gap: 2px; }
.dash-nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  cursor: default;
  position: relative;
  font-weight: 500;
}
.dash-nav a:hover { color: #94a3b8; }
.dash-nav a.active {
  color: #10b981;
  background: rgba(16,185,129,0.06);
  border: 1px solid rgba(16,185,129,0.12);
}
.dash-nav a svg { opacity: 0.7; flex-shrink: 0; }
.dash-nav-chev { margin-left: auto; }

.dash-side-foot {
  margin-top: auto;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 6px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.dash-user-avatar { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.dash-user-info { flex: 1; min-width: 0; }
.dash-user-name { font-size: 12.5px; font-weight: 500; color: #e2e8f0; }
.dash-user-email { font-size: 10.5px; color: #64748b; font-family: var(--mono); letter-spacing: 0.02em; }
.dash-logout {
  width: 28px; height: 28px;
  border-radius: 6px; border: none;
  background: transparent;
  color: #64748b;
  display: grid; place-items: center;
  cursor: default;
}

/* ----- main ----- */
.dash-main { padding: 24px 32px 28px; display: flex; flex-direction: column; gap: 18px; min-width: 0; background: #07090f; }

.dash-topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.dash-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em; color: #ffffff; }
.dash-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.dash-cta {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  font-family: inherit;
  border: 1px solid rgba(16,185,129,0.35);
  background: rgba(16,185,129,0.06);
  color: #10b981;
  cursor: default;
}

/* ----- warning banner ----- */
.dash-warning-banner {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.18);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.dash-warning-left { display: flex; align-items: center; gap: 12px; }
.dash-warning-icon { color: #f87171; flex-shrink: 0; }
.dash-warning-title { font-size: 13.5px; font-weight: 600; color: #e2e8f0; }
.dash-warning-subtitle { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
.dash-warning-btn {
  height: 30px; padding: 0 12px; border-radius: 8px; border: none;
  background: rgba(239,68,68,0.15); color: #f87171; font-size: 12px; font-weight: 600;
  cursor: default;
}

/* ----- context grid ----- */
.dash-context-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.dash-context-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)), #11161d;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 18px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
}
.lg-span-2 { grid-column: span 2; }
.dash-context-glow { position: absolute; right: -40px; top: -40px; width: 100px; height: 100px; border-radius: 50%; pointer-events: none; opacity: 0.15; }
.red-glow { background: #ef4444; filter: blur(40px); }
.blue-glow { background: #38bdf8; filter: blur(40px); }
.gold-glow { background: #fbbf24; filter: blur(40px); }

.dash-card-top { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.dash-card-dot { width: 9px; height: 9px; border-radius: 50%; }
.dash-card-dot.red { background: #ef4444; }
.dash-card-eyebrow { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; tracking-wider; font-family: var(--mono); }
.dash-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.dash-badge.red-badge { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.18); }
.dash-badge.green-badge { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.18); }
.dash-badge.gold-badge { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.18); }

.dash-card-val { font-size: 24px; font-weight: 700; font-family: var(--mono); line-height: 1; }
.dash-card-val-sm { font-size: 15px; font-weight: 700; line-height: 1.2; color: #ffffff; }
.dash-card-val-sm .small-lbl { font-size: 11px; font-weight: 400; color: #64748b; }
.dash-card-desc { font-size: 11.5px; color: #94a3b8; font-family: var(--sans); }
.green-text { color: #10b981; }

.dash-progress-text { font-size: 11px; color: #64748b; display: flex; justify-content: space-between; font-weight: 500; }
.dash-progress-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; margin-top: 6px; }
.dash-progress-fill { height: 100%; border-radius: 99px; }

/* ----- metrics strip ----- */
.dash-metrics-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.dash-metric-card {
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 64px;
}
.dash-metric-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; tracking-wider; }
.dash-metric-val { font-size: 15px; font-weight: 700; font-family: var(--mono); margin-top: 4px; }
.green-text { color: #10b981; }
.blue-text { color: #0ea5e9; }
.red-text { color: #f87171; }

/* ----- two column ----- */
.dash-two-col { display: grid; grid-template-columns: 2fr 1.2fr; gap: 14px; }
.dash-col-left { min-width: 0; }
.dash-col-right { min-width: 0; }
.dash-panel {
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}
.dash-panel-head { display: flex; justify-content: space-between; align-items: flex-start; }
.dash-panel-eyebrow { font-size: 10px; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--mono); margin-bottom: 4px; font-weight: 700; }
.dash-panel-title { font-size: 15px; font-weight: 600; letter-spacing: -0.015em; color: #e2e8f0; }
.dash-panel-title.plain { font-size: 14px; }
.dash-pill-btn {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 999px;
  font-family: inherit;
  cursor: default;
}
.dash-chart { width: 100%; height: 200px; }

.dash-week-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: #ffffff; }
.dash-flame { color: #fb923c; display: inline-flex; }
.dash-week-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.dash-week-bar { height: 5px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
.dash-week-bar i { display: block; height: 100%; background: #10b981; border-radius: 999px; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
.dash-mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dash-mini-stat {
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 10px 12px;
}
.dash-mini-lbl { font-size: 10px; color: #64748b; font-family: var(--mono); letter-spacing: 0.08em; }
.dash-mini-val { font-size: 14px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dash-mini-val.green { color: #10b981; }

.dash-best {
  background: rgba(251,191,36,0.04);
  border: 1px solid rgba(251,191,36,0.18);
  border-radius: 8px;
  padding: 10px 12px;
}
.dash-best-row { display: flex; align-items: center; gap: 6px; color: #fbbf24; font-size: 10px; font-weight: 700; }
.dash-best-val { font-size: 16px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dash-best-date { font-size: 10px; color: #64748b; font-family: var(--mono); margin-top: 2px; }

.dash-week-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: #94a3b8;
  font-size: 12px;
  margin-top: auto;
  justify-content: center;
  padding-top: 4px;
  cursor: default;
}
.dash-week-link.sm { padding: 0; font-size: 11px; }

/* ----- recent feed ----- */
.dash-feed-header { border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px; }
.dash-feed-list { display: flex; flex-direction: column; gap: 12px; }
.dash-feed-item { display: flex; align-items: center; gap: 12px; }
.dash-avatar-wrapper { position: relative; width: 28px; height: 28px; flex-shrink: 0; }
.dash-avatar-emoji { font-size: 18px; line-height: 1; display: block; }
.dash-avatar-text { font-family: var(--sans); }
.dash-avatar-dot { border: 1.5px solid #07090f; }

/* ----- table ----- */
.dash-table { display: flex; flex-direction: column; }
.dash-tr {
  display: grid;
  grid-template-columns: 2fr 0.7fr 1fr 1fr 0.7fr;
  gap: 14px;
  padding: 14px 4px;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 13px;
}
.dash-tr:last-child { border-bottom: 0; }
.dash-th { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: #64748b; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: 700; }
.dash-tr .num { font-variant-numeric: tabular-nums; text-align: right; font-feature-settings: "tnum"; }
.dash-tr .green { color: #10b981; font-weight: 600; }
.dash-cell-acc { display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 12.5px; color: #ffffff; }
.dash-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dash-roi-chip {
  display: inline-block;
  background: rgba(239,68,68,0.1);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.2);
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-family: var(--mono);
}
`;

Object.assign(window, { DashboardMock });
