/* components/dashboard.jsx — fake LootFlow dashboard with auto-scale + sidebar */

function DashboardMock() {
  const scaleWrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

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

  // 8-week cashout series (R$) — realistic CS2 drop values
  const weeks = [
    { d: "31/03", v: 18 },
    { d: "07/04", v: 12 },
    { d: "14/04", v: 44 },
    { d: "21/04", v: 22 },
    { d: "28/04", v: 38 },
    { d: "05/05", v: 15 },
    { d: "12/05", v: 62 },
    { d: "19/05", v: 31 },
  ];
  const maxV = 80;

  const accounts = [
    { dot: "#60a5fa", name: "AKM",                  drops: 38, bruto: "R$ 162,40",  cashout: "R$ 138,00", roi: "+84%",  roiPos: true },
    { dot: "#10b981", name: "servente de pedreiro",  drops: 42, bruto: "R$ 198,70",  cashout: "R$ 168,90", roi: "+125%", roiPos: true },
    { dot: "#a78bfa", name: "leno brega",            drops: 34, bruto: "R$ 94,20",   cashout: "R$ 80,10",  roi: "+7%",   roiPos: true },
    { dot: "#fbbf24", name: "patrão",                drops: 28, bruto: "R$ 76,40",   cashout: "R$ 64,90",  roi: "-13%",  roiPos: false },
    { dot: "#f472b6", name: "cria",                  drops: 22, bruto: "R$ 54,60",   cashout: "R$ 46,40",  roi: "-38%",  roiPos: false },
  ];

  // chart
  const chartW = 760, chartH = 220, padL = 44, padR = 24, padT = 18, padB = 36;
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
    <div className="dash-scaler" ref={scaleWrapRef} style={{ height: 820 * scale }}>
      <div className="dash" style={{ width: 1280, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div className="dash-body">
          {/* ----- SIDEBAR ----- */}
          <aside className="dash-side">
            <div className="dash-brand">
              <span className="dash-brand-mark">
                <BoltMark />
              </span>
              <div>
                <div className="dash-brand-name">LootFlow</div>
                <div className="dash-brand-sub">CS2 Analytics</div>
              </div>
            </div>

            <div className="dash-week-card">
              <div className="dash-week-head">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
                Esta semana
              </div>
              <div className="dash-week-stats">
                <div>
                  <div className="dash-week-num">8</div>
                  <div className="dash-week-lbl">contas</div>
                </div>
                <div>
                  <div className="dash-week-num">16</div>
                  <div className="dash-week-lbl">drops alvo</div>
                </div>
              </div>
            </div>

            <nav className="dash-nav">
              <a className="active">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                Dashboard
                <svg className="dash-nav-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Contas
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Drops
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Analytics
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
                Metas
              </a>
              <a>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Configurações
              </a>
            </nav>

            <div className="dash-side-foot">
              <span className="dash-user-avatar">
                <svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#1a2330"/><circle cx="16" cy="13" r="5" fill="#4b5563"/><path d="M5 30c2-6 6-9 11-9s9 3 11 9" fill="#4b5563"/></svg>
              </span>
              <div className="dash-user-info">
                <div className="dash-user-name">user</div>
                <div className="dash-user-email">u•••@l•••.app</div>
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
                <h3 className="dash-title">Dashboard</h3>
                <div className="dash-subtitle">Visão geral dos seus drops CS2</div>
              </div>
              <button className="dash-cta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Registrar Drops
              </button>
            </div>

            {/* KPI cards */}
            <div className="dash-kpis">
              <div className="dash-kpi">
                <div className="dash-kpi-row">
                  <div className="dash-kpi-label">CASHOUT TOTAL</div>
                  <span className="dash-kpi-icon green">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </span>
                </div>
                <div className="dash-kpi-num">R$ <span>498,30</span></div>
                <div className="dash-kpi-sub green">R$ 586,30 bruto</div>
              </div>

              <div className="dash-kpi">
                <div className="dash-kpi-row">
                  <div className="dash-kpi-label">ROI GERAL</div>
                  <span className="dash-kpi-icon green">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </span>
                </div>
                <div className="dash-kpi-num green-num">+33<em>%</em></div>
                <div className="dash-kpi-sub">Investido: R$ 374,95</div>
              </div>

              <div className="dash-kpi dash-kpi-alert">
                <div className="dash-kpi-row">
                  <span className="dash-kpi-icon red strong">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </span>
                  <div className="dash-kpi-alert-title">FALTA PEGAR<br/>DROP SEMANAL</div>
                </div>
                <div className="dash-kpi-sub red">· servente de pedreiro — 1/2 drops</div>
              </div>

              <div className="dash-kpi">
                <div className="dash-kpi-row">
                  <div className="dash-kpi-label">CONTAS</div>
                  <span className="dash-kpi-icon violet">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                </div>
                <div className="dash-kpi-num"><span>8</span><em>/8</em></div>
                <div className="dash-kpi-sub">8 ativas de 8</div>
              </div>
            </div>

            {/* chart + week panel */}
            <div className="dash-row-2">
              <div className="dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <div className="dash-panel-eyebrow">CASHOUT SEMANAL</div>
                    <div className="dash-panel-title">Últimas 8 semanas</div>
                  </div>
                  <button className="dash-pill-btn">Histórico</button>
                </div>
                <svg className="dash-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cashg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.42"/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {yTicks.map((t, i) => {
                    const y = padT + innerH - (t / maxV) * innerH;
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                        <text x={padL - 8} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="10" fontFamily="JetBrains Mono">R${"$"}{t}</text>
                      </g>
                    );
                  })}
                  {weeks.map((w, i) => (
                    <text key={i} x={xs[i]} y={chartH - 10} textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="JetBrains Mono">{w.d}</text>
                  ))}
                  <path d={areaPath} fill="url(#cashg)"/>
                  <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                  {xs.map((x, i) => (
                    <circle key={i} cx={x} cy={ys[i]} r="2.4" fill="#10b981" />
                  ))}
                </svg>
              </div>

              <div className="dash-panel dash-panel-week">
                <div className="dash-week-title">
                  <span className="dash-flame">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73S7.3 7.53 7.3 5.47l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 0 0 16 0c0-4.08-2-7.74-6.5-13.33zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                  </span>
                  <span>Semana Atual</span>
                </div>
                <div className="dash-week-row">
                  <span className="dash-week-row-lbl">Drops</span>
                  <span className="dash-week-row-val">15 / 16</span>
                </div>
                <div className="dash-week-bar"><i style={{ width: "94%" }}></i></div>
                <div className="dash-mini-stats">
                  <div className="dash-mini-stat">
                    <div className="dash-mini-lbl">BRUTO</div>
                    <div className="dash-mini-val">R$ <span>36,40</span></div>
                  </div>
                  <div className="dash-mini-stat">
                    <div className="dash-mini-lbl">CASHOUT</div>
                    <div className="dash-mini-val green">R$ <span>30,90</span></div>
                  </div>
                </div>
                <div className="dash-best">
                  <div className="dash-best-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    Melhor semana
                  </div>
                  <div className="dash-best-val">R$ <span>62,40</span></div>
                  <div className="dash-best-date">12/05 — 18/05/26</div>
                </div>
                <a className="dash-week-link">Ver todos os drops <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
              </div>
            </div>

            {/* accounts table */}
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div className="dash-panel-title plain">Performance por Conta</div>
                <a className="dash-week-link sm">Ver todas <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
              </div>
              <div className="dash-table">
                <div className="dash-tr dash-th">
                  <div>CONTA</div>
                  <div className="num">DROPS</div>
                  <div className="num">BRUTO</div>
                  <div className="num">CASHOUT</div>
                  <div className="num">ROI</div>
                </div>
                {accounts.map((a) => (
                  <div className="dash-tr" key={a.name}>
                    <div className="dash-cell-acc">
                      <span className="dash-dot" style={{ background: a.dot, boxShadow: `0 0 8px ${a.dot}` }}></span>
                      {a.name}
                    </div>
                    <div className="num">{a.drops}</div>
                    <div className="num">{a.bruto}</div>
                    <div className="num green">{a.cashout}</div>
                    <div className="num"><span className={"dash-roi-chip " + (a.roiPos ? "pos" : "")}>{a.roi}</span></div>
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

// Bolt icon — matches the LootFlow app logo (outlined lightning, rounded)
function BoltMark({ stroke = 2.2 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M14 2.5 L5.5 13.5 L11 13.5 L10 21.5 L18.5 10.5 L13 10.5 Z"/>
    </svg>
  );
}

window.BoltMark = BoltMark;

const dashboardStyles = `
.dash-scaler { width: 100%; overflow: hidden; }
.dash {
  font-family: var(--sans);
  color: #e6edf3;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  background: #06080c;
}
.dash-body { display: grid; grid-template-columns: 240px 1fr; min-height: 820px; }

/* ----- sidebar ----- */
.dash-side {
  background: #06080c;
  border-right: 1px solid rgba(255,255,255,0.05);
  padding: 22px 16px 18px;
  display: flex; flex-direction: column;
  gap: 18px;
}
.dash-brand { display: flex; align-items: center; gap: 12px; padding: 0 4px; }
.dash-brand-mark {
  width: 38px; height: 38px; border-radius: 10px;
  background: #0a0e15;
  border: 1px solid rgba(255,255,255,0.08);
  color: #ffffff;
  display: grid; place-items: center;
}
.dash-brand-mark svg { width: 18px; height: 18px; }
.dash-brand-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.dash-brand-sub { font-size: 10px; color: #6b7280; font-family: var(--mono); letter-spacing: 0.06em; text-transform: uppercase; }

.dash-week-card {
  background: rgba(56,189,248,0.04);
  border: 1px solid rgba(56,189,248,0.14);
  border-radius: 10px;
  padding: 12px 14px;
}
.dash-week-head { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
.dash-week-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dash-week-num { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; color: #e6edf3; font-variant-numeric: tabular-nums; }
.dash-week-lbl { font-size: 10px; color: #6b7280; margin-top: 4px; font-family: var(--mono); letter-spacing: 0.04em; }

.dash-nav { display: flex; flex-direction: column; gap: 2px; }
.dash-nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;
  cursor: default;
  position: relative;
}
.dash-nav a:hover { color: #94a3b8; }
.dash-nav a.active {
  color: #38bdf8;
  background: rgba(56,189,248,0.06);
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
.dash-user-name { font-size: 12.5px; font-weight: 500; }
.dash-user-email { font-size: 10.5px; color: #6b7280; font-family: var(--mono); letter-spacing: 0.02em; }
.dash-logout {
  width: 28px; height: 28px;
  border-radius: 6px; border: none;
  background: transparent;
  color: #6b7280;
  display: grid; place-items: center;
  cursor: default;
}

/* ----- main ----- */
.dash-main { padding: 24px 32px 28px; display: flex; flex-direction: column; gap: 18px; min-width: 0; background: #06080c; }

.dash-topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.dash-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em; }
.dash-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
.dash-cta {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  font-family: inherit;
  border: 1px solid rgba(56,189,248,0.35);
  background: rgba(56,189,248,0.06);
  color: #38bdf8;
  cursor: default;
}

.dash-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.dash-kpi {
  background: linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 18px 18px 16px;
  min-height: 116px;
  display: flex; flex-direction: column; gap: 10px;
}
.dash-kpi-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.dash-kpi-label { font-size: 11px; color: #6b7280; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--mono); }
.dash-kpi-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.dash-kpi-icon.green { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.18); }
.dash-kpi-icon.red { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.dash-kpi-icon.red.strong { background: rgba(239,68,68,0.18); color: #fca5a5; }
.dash-kpi-icon.violet { background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }

.dash-kpi-num { font-size: 30px; font-weight: 600; letter-spacing: -0.025em; line-height: 1; font-variant-numeric: tabular-nums; color: #e6edf3; }
.dash-kpi-num.green-num { color: #10b981; }
.dash-kpi-num em { font-style: normal; color: #6b7280; font-size: 18px; font-weight: 500; margin-left: 2px; }
.dash-kpi-num.green-num em { color: rgba(16,185,129,0.6); }
.dash-kpi-num span { color: inherit; }
.dash-kpi-sub { font-size: 12px; color: #6b7280; font-family: var(--mono); letter-spacing: 0.02em; }
.dash-kpi-sub.red { color: #f87171; }
.dash-kpi-sub.green { color: #10b981; }

.dash-kpi-alert {
  border-color: rgba(239,68,68,0.45);
  background: linear-gradient(180deg, rgba(239,68,68,0.05), rgba(239,68,68,0.01));
  box-shadow: 0 0 28px -8px rgba(239,68,68,0.4), inset 0 0 0 1px rgba(239,68,68,0.15);
}
.dash-kpi-alert-title {
  font-size: 17px;
  line-height: 1.1;
  font-weight: 700;
  color: #f87171;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.dash-row-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.dash-panel {
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}
.dash-panel-head { display: flex; justify-content: space-between; align-items: flex-start; }
.dash-panel-eyebrow { font-size: 11px; color: #6b7280; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--mono); margin-bottom: 4px; }
.dash-panel-title { font-size: 17px; font-weight: 600; letter-spacing: -0.015em; }
.dash-panel-title.plain { font-size: 15px; }
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

.dash-panel-week { background: rgba(255,255,255,0.015); }
.dash-week-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
.dash-flame { color: #fb923c; display: inline-flex; }
.dash-week-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.dash-week-row-lbl { color: #94a3b8; }
.dash-week-row-val { color: #e6edf3; font-variant-numeric: tabular-nums; }
.dash-week-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
.dash-week-bar i { display: block; height: 100%; background: #38bdf8; border-radius: 999px; box-shadow: 0 0 8px rgba(56,189,248,0.6); }
.dash-mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dash-mini-stat {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 10px 12px;
}
.dash-mini-lbl { font-size: 10px; color: #6b7280; font-family: var(--mono); letter-spacing: 0.08em; }
.dash-mini-val { font-size: 17px; font-weight: 600; margin-top: 4px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dash-mini-val.green { color: #10b981; }
.dash-best {
  background: rgba(251,191,36,0.04);
  border: 1px solid rgba(251,191,36,0.18);
  border-radius: 8px;
  padding: 10px 12px;
}
.dash-best-row { display: flex; align-items: center; gap: 6px; color: #fbbf24; font-size: 11px; font-weight: 500; }
.dash-best-val { font-size: 18px; font-weight: 600; margin-top: 4px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dash-best-date { font-size: 10.5px; color: #6b7280; font-family: var(--mono); margin-top: 2px; }
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
.dash-th { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: #6b7280; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.dash-tr .num { font-variant-numeric: tabular-nums; text-align: right; font-feature-settings: "tnum"; }
.dash-tr .green { color: #10b981; font-weight: 500; }
.dash-cell-acc { display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 12.5px; }
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
.dash-roi-chip.pos {
  background: rgba(16,185,129,0.1);
  color: #10b981;
  border-color: rgba(16,185,129,0.25);
}
`;

Object.assign(window, { DashboardMock });
