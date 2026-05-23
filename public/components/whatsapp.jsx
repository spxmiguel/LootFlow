/* components/whatsapp.jsx — fake WhatsApp conversation with char-by-char typing */

/* TypeWriter: animates text character by character once visible */
function TypeWriter({ text, active, delay = 0, speed = 28 }) {
  const [displayed, setDisplayed] = React.useState("");
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [active, delay]);

  React.useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  // Reset when text or active changes
  React.useEffect(() => {
    setDisplayed("");
    setStarted(false);
  }, [text]);

  return <span style={{ whiteSpace: "pre-wrap" }}>{displayed}<span style={{ opacity: displayed.length < text.length && started ? 1 : 0, borderRight: "1.5px solid currentColor", marginLeft: 1, animation: "waCaretBlink 0.6s step-end infinite" }}></span></span>;
}

function WhatsAppMock() {
  // margin "0px" → triggers as soon as element enters viewport (fix Windows black screen)
  const [ref, inView] = useInView({ margin: "0px" });
  const [forceStart, setForceStart] = React.useState(false);
  const { t, lang } = useI18n();

  // Timing chain (speed = 8ms/char):
  //   msg1 ~145 chars → done at ~300 + 1160 = 1460ms
  //   typing1 shows 2000ms, lasts 2300ms → hides 4300ms → msg3 at 4300ms
  //   msg3 ~110 chars → done at 4300 + 880 = 5180ms
  //   typing2 shows 5800ms, lasts 2200ms → hides 8000ms → msg5 at 8000ms
  const items = [
    { kind: "msg",    from: "bot", textKey: "wa.mock.1", time: "20:14", typeDelay: 300 },
    { kind: "msg",    from: "me",  textKey: "wa.mock.2", time: "20:15", showDelay: 2100 },
    { kind: "typing", from: "bot", showDelay: 2500, hideAfter: 2300 },
    { kind: "msg",    from: "bot", textKey: "wa.mock.3", time: "20:15", typeDelay: 4800 },
    { kind: "msg",    from: "me",  textKey: "wa.mock.4", time: "20:16", showDelay: 6100 },
    { kind: "typing", from: "bot", showDelay: 6500, hideAfter: 2100 },
    { kind: "msg",    from: "bot", textKey: "wa.mock.5", time: "20:16", typeDelay: 8600 },
  ];

  // Fallback: start even if IntersectionObserver never fires (Windows quirk)
  React.useEffect(() => {
    const t = setTimeout(() => setForceStart(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const active = inView || forceStart;

  // Track which items are visible and which typing bubbles are hidden
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [hiddenTyping, setHiddenTyping] = React.useState(new Set());

  // Restart animation whenever active state or inView changes (or lang changes).
  // Adding inView to deps ensures: when user scrolls to section (inView→true),
  // animation restarts even if forceStart already fired while section was off-screen.
  React.useEffect(() => {
    if (!active) return;
    // Reset first
    setVisibleCount(0);
    setHiddenTyping(new Set());
    let timers = [];
    items.forEach((item, i) => {
      const showAt = item.showDelay ?? item.typeDelay ?? 0;
      timers.push(setTimeout(() => setVisibleCount(c => Math.max(c, i + 1)), showAt));
      if (item.kind === "typing" && item.hideAfter) {
        timers.push(setTimeout(() => {
          setHiddenTyping(s => { const n = new Set(s); n.add(i); return n; });
        }, showAt + item.hideAfter));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [active, lang, inView]);

  return (
    <div ref={ref} className="wa-mock">
      <div className="wa-header">
        <div className="wa-avatar">
          <BoltMark stroke={2.4} />
        </div>
        <div className="wa-meta">
          <div className="wa-name">{t("wa.mock.name")}</div>
          <div className="wa-status"><i></i> {t("wa.mock.status")}</div>
        </div>
        <div className="wa-actions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2.01z"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
      </div>

      <div className="wa-body">
        <div className="wa-day">{t("wa.mock.day")}</div>
        {items.map((item, i) => {
          const visible = visibleCount > i;
          const hidden = hiddenTyping.has(i);
          if (!visible) return null;

          if (item.kind === "typing") {
            if (hidden) return null;
            return (
              <div key={i} className="wa-msg wa-bot wa-typing-row in">
                <div className="wa-bubble wa-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            );
          }

          const text = t(item.textKey);
          const isBot = item.from === "bot";

          return (
            <div key={i} className={`wa-msg wa-${item.from} in`}>
              <div className="wa-bubble">
                <div className="wa-text">
                  {isBot ? (
                    <TypeWriter text={text} active={visible} delay={0} speed={8} />
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
                  )}
                </div>
                <div className="wa-time">
                  {item.time}
                  {item.from === "me" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 12 7 17 14 8"/><polyline points="10 12 14 17 22 6"/></svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wa-composer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
        <div className="wa-input">{t("wa.mock.composer")}</div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <div className="wa-send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: waStyles }} />
    </div>
  );
}

const waStyles = `
.wa-mock {
  background: #0b1014;
  border-radius: 16px;
  border: 1px solid var(--border-strong);
  overflow: hidden;
  width: 100%;
  max-width: 440px;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 70px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02);
  font-family: var(--sans);
  position: relative;
  z-index: 1;
}
.wa-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: #161e23;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.wa-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: #0a0e13;
  border: 1px solid rgba(255,255,255,0.1);
  color: #ffffff;
  display: grid; place-items: center;
}
.wa-avatar svg { width: 20px; height: 20px; }
.wa-name { font-size: 14px; font-weight: 600; color: #e9edef; }
.wa-status { font-size: 11px; color: #25d366; font-family: var(--mono); display: flex; align-items: center; gap: 6px; }
.wa-status i { width: 5px; height: 5px; border-radius: 50%; background: #25d366; animation: pulse 1.6s ease-in-out infinite; }
.wa-meta { flex: 1; }
.wa-actions { display: flex; gap: 16px; color: #aebac1; }

.wa-body {
  padding: 18px 14px;
  background-color: #0b1014;
  background-image:
    radial-gradient(circle at 10% 20%, rgba(16,185,129,0.04), transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(16,185,129,0.03), transparent 40%);
  min-height: 460px;
  display: flex; flex-direction: column; gap: 8px;
}
.wa-day {
  align-self: center;
  background: rgba(255,255,255,0.04);
  color: #aebac1;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: var(--mono);
  margin-bottom: 8px;
}
.wa-msg {
  display: flex;
  opacity: 0;
}
.wa-msg.in {
  animation: waSlideIn 0.38s cubic-bezier(0.2, 0.7, 0.15, 1) forwards;
}
@keyframes waSlideIn {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
.wa-bot { justify-content: flex-start; }
.wa-me { justify-content: flex-end; }
.wa-bubble {
  max-width: 82%;
  padding: 8px 12px 6px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  position: relative;
  word-break: break-word;
}
.wa-bot .wa-bubble {
  background: #1f2c33;
  color: #e9edef;
  border-top-left-radius: 2px;
}
.wa-me .wa-bubble {
  background: #005c4b;
  color: #e9edef;
  border-top-right-radius: 2px;
}
.wa-text { white-space: pre-wrap; min-height: 1em; }
.wa-me .wa-text { font-family: var(--mono); font-size: 12px; letter-spacing: 0.03em; }
.wa-time {
  display: flex; align-items: center; gap: 3px; justify-content: flex-end;
  font-size: 10px; color: #aebac1; margin-top: 4px;
  font-family: var(--mono);
}

/* typing bubble */
.wa-typing { display: flex; gap: 4px; padding: 12px 14px; width: max-content; border-top-left-radius: 2px; }
.wa-typing span {
  width: 6px; height: 6px; border-radius: 50%; background: #aebac1;
  animation: waBlink 1.2s infinite ease-in-out;
}
.wa-typing span:nth-child(2) { animation-delay: 0.2s; }
.wa-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes waBlink {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
@keyframes waCaretBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.wa-composer {
  display: flex; align-items: center; gap: 10px;
  background: #161e23;
  padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,0.04);
  color: #8696a0;
}
.wa-input {
  flex: 1;
  background: #2a3942;
  border-radius: 18px;
  padding: 8px 14px;
  color: #8696a0;
  font-size: 13px;
}
.wa-send {
  width: 34px; height: 34px; border-radius: 50%;
  background: #25d366;
  display: grid; place-items: center;
}
`;

Object.assign(window, { WhatsAppMock });
