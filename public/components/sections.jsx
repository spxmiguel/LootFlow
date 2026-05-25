/* components/sections.jsx — all landing sections, i18n-driven */

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <line x1="6.9" y1="12" x2="16.7" y2="4.5" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="6.9" y1="12" x2="14.25" y2="17.25" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="14.25" y1="17.25" x2="19.3" y2="17.25" stroke="#4ade80" strokeWidth="2.7" strokeLinecap="round"/>
    </svg>
  );
}

const APP_URL      = 'https://spxmiguel.github.io/LootFlow/app/'
const GITHUB_URL   = 'https://github.com/spxmiguel/LootFlow'
const CHANGELOG_URL = 'https://github.com/spxmiguel/LootFlow/releases'
const SETTINGS_WA_URL = `${APP_URL}#settings`

/* ---------- NAV ---------- */
function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  const { t } = useI18n();
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={"nav" + (scrolled ? " scrolled" : "")}>
      <a href="#top" className="nav-logo">
        <span className="nav-logo-mark">
          <MarkIcon />
        </span>
        LootFlow
      </a>
      <div className="nav-links">
        <a href="#features">{t("nav.features")}</a>
        <a href="#how">{t("nav.how")}</a>
        <a href="#whatsapp">{t("nav.whatsapp")}</a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-link">{t("nav.github")}</a>
        <LangToggle />
        <a href={APP_URL} className="nav-cta">{t("nav.open")}</a>
      </div>
    </nav>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  const containerRef = React.useRef(null);
  const [scrollY, setScrollY] = React.useState(0);
  const [containerTop, setContainerTop] = React.useState(0);
  const magnetRef = useMagnet(0.18);
  const { t, lang } = useI18n();

  React.useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onResize = () => {
      if (containerRef.current) {
        setContainerTop(containerRef.current.offsetTop);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ContainerScroll math: progress 0→1 over first ~600px of scroll inside container
  const scrollInContainer = Math.max(0, scrollY - containerTop + window.innerHeight * 0.1);
  const p = Math.min(1, scrollInContainer / 600);

  const rotate = 20 * (1 - p);          // 20deg → 0
  const scale = 1.05 - 0.05 * p;        // 1.05 → 1.0
  const translateY = -80 * p;           // lifts slightly as unfolds
  const fade = p * 0.5;                 // bottom gradient fade

  return (
    <section id="top" className="hero">
      <div className="wrap" ref={containerRef}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <Reveal as="div" margin="0px">
            <div className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--profit)", display: "inline-block", boxShadow: "0 0 10px var(--accent-glow)" }}></span>
              {t("hero.tag")}
            </div>
          </Reveal>

          <h1 className="h-display" key={lang}>
            <WordReveal>{t("hero.line1")}</WordReveal>
            <br />
            <WordReveal delay={250}>{t("hero.line2.before")}</WordReveal>{" "}
            <span className="accent"><WordReveal delay={520}>{t("hero.line2.accent")}</WordReveal></span>
          </h1>

          <Reveal margin="0px" delay={900}>
            <p className="lede">{t("hero.lede")}</p>
          </Reveal>

          <Reveal margin="0px" delay={1100}>
            <div className="hero-cta-row">
              <a href={APP_URL} className="btn btn-primary" ref={magnetRef}>
                {t("hero.cta.primary")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a href="#how" className="btn btn-ghost">{t("hero.cta.secondary")}</a>
            </div>
            <div className="hero-meta">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="hero-meta-dot"></span>
                {t("hero.meta.1")}
              </span>
              <span>•</span>
              <span>{t("hero.meta.2")}</span>
              <span>•</span>
              <span>{t("hero.meta.3")}</span>
            </div>
          </Reveal>
        </div>

        {/* ContainerScroll: starts tilted 3D, unfolds on scroll */}
        <div className="dash-frame-wrap" style={{ perspective: "1200px" }}>
          <div
            className="dash-frame"
            style={{
              transform: `rotateX(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`,
              transformOrigin: "center top",
              willChange: "transform",
              transition: "transform 0.05s linear",
              "--fade-bottom": fade.toFixed(2),
            }}
          >
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- STATS BAR ---------- */
function Stats() {
  const { t } = useI18n();
  return (
    <section className="stats">
      <div className="wrap">
        <Reveal as="div" stagger className="stats-grid">
          <div className="stat">
            <div className="stat-tag">{t("stats.1.tag")}</div>
            <div className="stat-num accent">
              <CountUp to={2} />
            </div>
            <div className="stat-label">{t("stats.1.label")}</div>
          </div>

          <div className="stat">
            <div className="stat-tag">{t("stats.2.tag")}</div>
            <div className="stat-num">
              {t("stats.2.currency")} {t("stats.2.price")}
              <span className="unit">{t("stats.2.unit")}</span>
            </div>
            <div className="stat-label">{t("stats.2.label")}</div>
          </div>

          <div className="stat">
            <div className="stat-tag">{t("stats.3.tag")}</div>
            <div className="stat-num accent">
              <CountUp to={0} />%
            </div>
            <div className="stat-label">{t("stats.3.label")}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FEATURES ---------- */
function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="features">
      <div className="wrap">
        <Reveal as="div" className="section-head">
          <div className="eyebrow">{t("features.eyebrow")}</div>
          <h2 className="h-section">{t("features.title")}</h2>
          <p className="lede">{t("features.lede")}</p>
        </Reveal>

        <Reveal as="div" stagger className="features-grid">
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5" rx="0.5" fill="currentColor"/><rect x="12" y="9" width="3" height="9" rx="0.5" fill="currentColor"/><rect x="17" y="6" width="3" height="12" rx="0.5" fill="currentColor"/></svg>}
            title={t("features.1.title")}
            body={t("features.1.body")}
            visual={<FeatureVisualChart />}
          />
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>}
            title={t("features.2.title")}
            body={t("features.2.body")}
            visual={<FeatureVisualWA />}
          />
          <FeatureCard
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>}
            title={t("features.3.title")}
            body={t("features.3.body")}
            visual={<FeatureVisualGoal />}
          />
        </Reveal>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, body, visual }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <div>
        <h3 className="h-card">{title}</h3>
        <p style={{ marginTop: 8 }}>{body}</p>
      </div>
      <div className="feature-visual">{visual}</div>
    </article>
  );
}

function FeatureVisualChart() {
  const { t } = useI18n();
  const bars = [10, 14, 22, 30, 28, 64, 88];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "12px 16px 0" }}>
      {/* header row — fora da área de barras */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{t("features.viz.chart.range")}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--profit)", fontWeight: 600, letterSpacing: "0.02em" }}>{t("features.viz.chart.delta")}</div>
      </div>
      {/* barras */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${h}%`,
            background: `linear-gradient(180deg, rgba(16,185,129,${0.25 + i*0.08}), rgba(16,185,129,0.05))`,
            border: "1px solid rgba(16,185,129,0.3)",
            borderBottom: "none",
            borderRadius: "4px 4px 0 0",
          }} />
        ))}
      </div>
    </div>
  );
}

function FeatureVisualWA() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ alignSelf: "flex-start", background: "#1f2c33", color: "#e9edef", padding: "6px 10px", borderRadius: "8px 8px 8px 2px", fontSize: 11, maxWidth: "85%", lineHeight: 1.4 }}>
        {t("features.viz.wa.bot")}
      </div>
      <div style={{ alignSelf: "flex-end", background: "#005c4b", color: "#e9edef", padding: "6px 10px", borderRadius: "8px 8px 2px 8px", fontSize: 11, fontFamily: "var(--mono)" }}>
        {t("features.viz.wa.me")}
      </div>
      <div style={{ alignSelf: "flex-start", background: "#1f2c33", color: "var(--profit)", padding: "6px 10px", borderRadius: "8px 8px 8px 2px", fontSize: 11, fontFamily: "var(--mono)" }}>
        {t("features.viz.wa.bot2")}
      </div>
    </div>
  );
}

function FeatureVisualGoal() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
        <span>{t("features.viz.goal.label")}</span>
        <span style={{ color: "var(--profit)" }}>{t("features.viz.goal.target")}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: "68%", background: "linear-gradient(90deg, #047857, #10b981, #34d399)", borderRadius: 999, boxShadow: "0 0 12px rgba(16,185,129,0.5)" }}></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11 }}>
        <span style={{ color: "var(--text)" }}>R$ 218 <span style={{ color: "var(--text-muted)" }}>/ R$ 320</span></span>
        <span style={{ color: "var(--profit)" }}>68%</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        {[true, true, true, false].map((on, i) => (
          <div key={i} style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: on ? "var(--profit)" : "rgba(255,255,255,0.05)",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{t("features.viz.goal.week")}</div>
    </div>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  const [ref, inView] = useInView({ margin: "-120px" });
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("how.1.title"), body: t("how.1.body") },
    { n: "02", title: t("how.2.title"), body: t("how.2.body") },
    { n: "03", title: t("how.3.title"), body: t("how.3.body") },
  ];
  return (
    <section id="how" className="howto" ref={ref}>
      <div className="wrap">
        <Reveal as="div" className="section-head">
          <div className="eyebrow">{t("how.eyebrow")}</div>
          <h2 className="h-section">{t("how.title")}</h2>
        </Reveal>

        <div className="howto-steps">
          <svg className="howto-line" viewBox="0 0 1000 2" preserveAspectRatio="none">
            <defs>
              <linearGradient id="howg" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(16,185,129,0)"/>
                <stop offset="20%" stopColor="rgba(16,185,129,0.8)"/>
                <stop offset="80%" stopColor="rgba(16,185,129,0.8)"/>
                <stop offset="100%" stopColor="rgba(16,185,129,0)"/>
              </linearGradient>
            </defs>
            <line
              x1="60" y1="1" x2="940" y2="1"
              stroke="url(#howg)" strokeWidth="2"
              strokeDasharray="1000"
              strokeDashoffset={inView ? "0" : "1000"}
              style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.2,0.7,0.15,1) 0.2s" }}
            />
          </svg>

          {steps.map((s, i) => (
            <div
              key={s.n}
              className="step reveal"
              style={{ transitionDelay: `${i * 180}ms` }}
              ref={(el) => { if (el && inView) el.classList.add("in"); }}
            >
              <div className="step-num">
                <span>{s.n}</span>{t("how.passo")}
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- WHATSAPP CALLOUT ---------- */
function WhatsAppSection() {
  const { t } = useI18n();
  return (
    <section id="whatsapp" className="wa-section">
      <div className="wrap">
        <Reveal as="div" className="wa-card">
          <div className="wa-copy">
            <span className="wa-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
              {t("wa.tag")}
            </span>
            <h2 className="h-section">{t("wa.title")}</h2>
            <p style={{ marginTop: 18 }}>{t("wa.body")}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <a href={APP_URL} className="btn btn-primary">
                {t("wa.cta.primary")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a href={SETTINGS_WA_URL} className="btn btn-ghost">{t("wa.cta.secondary")}</a>
            </div>
          </div>
          <WhatsAppMock />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- PRIVACY ---------- */
function Privacy() {
  const { t } = useI18n();
  return (
    <section className="privacy">
      <div className="wrap">
        <Reveal as="div" className="privacy-card">
          <div className="privacy-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <h3>{t("privacy.title")}</h3>
            <p>{t("privacy.body")}</p>
          </div>
          <span className="privacy-chip">{t("privacy.chip")}</span>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCTA() {
  const magnetRef = useMagnet(0.2);
  const { t } = useI18n();
  return (
    <section className="final-cta">
      <div className="wrap">
        <Reveal as="div">
          <h2 className="h-section">{t("final.title.1")}<br/>{t("final.title.2")}</h2>
          <p className="lede" style={{ margin: "24px auto 0", textAlign: "center" }}>
            {t("final.subtitle")}
          </p>
          <div className="final-cta-row">
            <a href={APP_URL} className="btn btn-primary btn-gradient-border" ref={magnetRef} style={{ height: 56, padding: "0 32px", fontSize: 16 }}>
              {t("final.cta")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}>
          <span className="nav-logo-mark" style={{ width: 22, height: 22 }}>
            <MarkIcon />
          </span>
          LootFlow
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">{t("footer.github")}</a>
          <a href={CHANGELOG_URL} target="_blank" rel="noreferrer">{t("footer.changelog")}</a>
          <a href={APP_URL}>{t("footer.privacy")}</a>
          <span className="made">{t("footer.made")}</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  Nav, Hero, Stats, Features, HowItWorks, WhatsAppSection, Privacy, FinalCTA, Footer,
});
