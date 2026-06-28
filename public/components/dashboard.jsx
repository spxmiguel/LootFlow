/* components/dashboard.jsx — real LootFlow dashboard screenshot */

function DashboardMock() {
  const { lang } = useI18n();
  const src = lang === "en" ? "dashboard-screenshot-en.png" : "dashboard-screenshot-pt.png";
  return (
    <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", lineHeight: 0 }}>
      <img
        src={src}
        alt="LootFlow Dashboard"
        style={{ width: "100%", display: "block", borderRadius: "12px" }}
      />
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

Object.assign(window, { DashboardMock });
