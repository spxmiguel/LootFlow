/* lib/animations.jsx — shared hooks and helpers (assigned to window) */

const { useEffect, useRef, useState, useCallback } = React;

// useInView: animate once, with margin
function useInView(opts = {}) {
  const { margin = "-100px", once = true, threshold = 0 } = opts;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            if (once) obs.unobserve(e.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { rootMargin: margin, threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin, once, threshold]);
  return [ref, inView];
}

// useCountUp: number tween triggered on inView
function useCountUp(to, { duration = 1600, decimals = 0, start = 0 } = {}, active = false) {
  const [val, setVal] = useState(start);
  const raf = useRef(null);
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(start + (to - start) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, to, duration, decimals, start]);
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// useScrollProgress for hero dash frame tilt
function useScrollProgress(targetRef) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.2;
      // 0 when top is below start, 1 when top is at end
      const raw = (start - rect.top) / (start - end);
      setP(Math.max(0, Math.min(1, raw)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetRef]);
  return p;
}

// useMagnet: magnetic hover effect on button
function useMagnet(strength = 0.25) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = null;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "translate(0px, 0px)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);
  return ref;
}

// Walk React children and pull out plain text — needed because the editor
// instruments inline string literals as objects for direct-edit, so
// String(children) on a JSX-passed string yields "[object Object]".
function extractText(node) {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) return extractText(node.props && node.props.children);
  if (typeof node === "object" && node.props) return extractText(node.props.children);
  return "";
}

// Word-clip reveal headline component
function WordReveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView({ margin: "-80px" });
  const text = extractText(children);
  const words = text.split(" ").filter(Boolean);
  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span
            className={"word-reveal" + (inView ? " in" : "")}
            style={{ transitionDelay: `${delay + i * 70}ms` }}
          >
            <span style={{ transitionDelay: `${delay + i * 70}ms` }}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
}

// Reveal wrapper
function Reveal({ children, as = "div", className = "", stagger = false, delay = 0, margin = "-80px" }) {
  const [ref, inView] = useInView({ margin });
  const Tag = as;
  const cls = (stagger ? "reveal-stagger " : "reveal ") + className + (inView ? " in" : "");
  return (
    <Tag ref={ref} className={cls} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

// CountUp display
function CountUp({ to, prefix = "", suffix = "", decimals = 0, duration = 1800, format = (n) => n }) {
  const [ref, inView] = useInView({ margin: "-50px" });
  const v = useCountUp(to, { duration, decimals }, inView);
  return (
    <span ref={ref}>
      {prefix}
      {format(v.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }))}
      {suffix}
    </span>
  );
}

Object.assign(window, {
  useInView, useCountUp, useScrollProgress, useMagnet,
  WordReveal, Reveal, CountUp,
});
