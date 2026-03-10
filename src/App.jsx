import { useState, useEffect, useRef } from "react";
import "./index.css";
import Games from "./games.jsx";

// ── Data ──────────────────────────────────────────────────────
const DEFAULT_PROJECTS = [
  {
    id: 1,
    title: "MAPuWhere?",
    description:
      "A campus navigation web app for Mapúa University — uses HTML, CSS, and JavaScript with cookies to help students find their way around campus.",
    tags: ["HTML", "CSS", "JavaScript", "Cookies"],
    link: "https://github.com/Jeunchi/MAPua.git",
    accent: "#d4b8e0",
  },
  {
    id: 2,
    title: "GCF Webpage",
    description:
      "A web platform for Greenhills Christian Fellowship where church-goers can sign up or log in to plan and create events for the church community.",
    tags: ["HTML", "CSS", "JavaScript"],
    link: "https://github.com/Yaakov-v1/its122l-final-project-d.git",
    accent: "#e0d4f5",
  },
];

const SKILLS = ["Python","React.JS","C++","C#","Node.JS","Java","JavaScript","HTML5","CSS","ASP.NET"];
const TAG_ROTATIONS  = [-2.5, 1.8, -1.2, 2.2, -1.8, 1.2, -2, 1.5, -0.8, 2.5];
const CARD_ROTATIONS = [-1.6, 1.2, -0.9, 2, -1.3, 1.6];
const ACCENTS        = ["#c9a8e8","#e8d8f8","#d4b8e0","#e0d4f5","#f0e8ff","#d8c8f0"];

// ── Squiggly Lines Hook ───────────────────────────────────────
function useSquiggles(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();

    const lines = [];
    let animId, timer = 0;

    const COLORS_RGB = [
      [0,0,0],[0,0,0],[0,0,0],
      [180,140,220],[160,110,210],[200,160,240],
    ];
    const EXIT_MODES = ["fade","erase","squiggle-erase"];

    function spawn() {
      const rgb      = COLORS_RGB[Math.floor(Math.random() * COLORS_RGB.length)];
      const maxLife  = 100 + Math.random() * 200;
      lines.push({
        pts:          [{ x: Math.random() * canvas.width, y: Math.random() * canvas.height }],
        rgb,
        baseWidth:    0.6 + Math.random() * 4.2,   // very random 0.6–4.8
        alpha:        0,
        angle:        Math.random() * Math.PI * 2,
        life:         0,
        maxLife,
        fadeInEnd:    20,
        wobble:       Math.random() * 10,
        done:         false,
        exitMode:     EXIT_MODES[Math.floor(Math.random() * EXIT_MODES.length)],
        exitFrame:    0,
        curWidth:     1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      timer++;
      if (timer > 22 && lines.filter(l => !l.done).length < 10) { spawn(); timer = 0; }

      for (let idx = lines.length - 1; idx >= 0; idx--) {
        const l = lines[idx];

        // Grow phase
        if (!l.done) {
          l.wobble += 0.12;
          l.curWidth = Math.max(0.3, l.baseWidth + Math.sin(l.wobble * 0.7) * 0.7);
          l.angle   += (Math.random() - 0.5) * 0.3 + Math.sin(l.wobble) * 0.08;
          const last = l.pts[l.pts.length - 1];
          l.pts.push({ x: last.x + Math.cos(l.angle) * 3.6, y: last.y + Math.sin(l.angle) * 3.6 });
          l.life++;
          l.alpha = l.life <= l.fadeInEnd ? l.life / l.fadeInEnd : 1;
          if (l.life >= l.maxLife) l.done = true;
        }

        if (l.pts.length < 2) continue;

        const [r, g, b] = l.rgb;
        const isBlack   = r === 0;
        const baseAlpha = isBlack ? 0.2 : 0.4;

        if (!l.done) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r},${g},${b},${(l.alpha * baseAlpha).toFixed(3)})`;
          ctx.lineWidth   = l.curWidth;
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.moveTo(l.pts[0].x, l.pts[0].y);
          for (let i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
          ctx.stroke();
        } else {
          // Exit animations
          l.exitFrame++;

          if (l.exitMode === "fade") {
            const a = Math.max(0, baseAlpha * (1 - l.exitFrame / 45));
            if (l.exitFrame > 45) { lines.splice(idx, 1); continue; }
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
            ctx.lineWidth = l.curWidth;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.moveTo(l.pts[0].x, l.pts[0].y);
            for (let i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
            ctx.stroke();

          } else if (l.exitMode === "erase") {
            // shrink from head
            const keep = Math.floor(l.pts.length * Math.max(0, 1 - l.exitFrame / 55));
            if (keep < 2) { lines.splice(idx, 1); continue; }
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${g},${b},${baseAlpha.toFixed(3)})`;
            ctx.lineWidth = l.curWidth;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.moveTo(l.pts[0].x, l.pts[0].y);
            for (let i = 1; i < keep; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
            ctx.stroke();

          } else {
            // squiggle-erase: reveal shrinks from tail
            const start = Math.floor(l.pts.length * (l.exitFrame / 60));
            if (start >= l.pts.length - 1) { lines.splice(idx, 1); continue; }
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${g},${b},${baseAlpha.toFixed(3)})`;
            ctx.lineWidth = l.curWidth;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.moveTo(l.pts[start].x, l.pts[start].y);
            for (let i = start + 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
}

// ── useScrollReveal ───────────────────────────────────────────
function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ── useHeroParallax ───────────────────────────────────────────
function useHeroParallax() {
  const [scale,   setScale]   = useState(1);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    function onScroll() {
      const p = Math.min(window.scrollY / (window.innerHeight * 0.55), 1);
      setScale(1 - p * 0.32);
      setOpacity(1 - p * 0.75);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { scale, opacity };
}

// ── RevealBlock ───────────────────────────────────────────────
function RevealBlock({ children, delay = 0, direction = "up", style = {} }) {
  const [ref, visible] = useScrollReveal();
  const T = {
    up:    visible ? "translateY(0)"  : "translateY(52px)",
    down:  visible ? "translateY(0)"  : "translateY(-52px)",
    left:  visible ? "translateX(0)"  : "translateX(-52px)",
    right: visible ? "translateX(0)"  : "translateX(52px)",
    scale: visible ? "scale(1)"       : "scale(0.86)",
  };
  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  T[direction],
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Tape({ rotate = -1.5 }) {
  return <div className="tape" style={{ transform: `translateX(-50%) rotate(${rotate}deg)` }} />;
}

function Tag({ children, rotate = 0, variant = "white" }) {
  return (
    <span className={`tag tag-${variant}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </span>
  );
}

function TornCard({ children, rotate = 0, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="torn-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        transform:  hov ? `rotate(${rotate * 0.2}deg) translateY(-4px)` : `rotate(${rotate}deg)`,
        boxShadow:  hov
          ? "5px 9px 0 rgba(0,0,0,0.14), 10px 16px 28px rgba(0,0,0,0.07)"
          : "3px 5px 0 rgba(0,0,0,0.08), 6px 10px 18px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AddProjectModal({ onAdd, onClose }) {
  const [title, setTitle] = useState("");
  const [desc,  setDesc]  = useState("");
  const [link,  setLink]  = useState("");
  const [tags,  setTags]  = useState("");

  function submit() {
    if (!title.trim()) return;
    onAdd({
      id: Date.now(), title, description: desc, link,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <Tape rotate={1.2} />
        <h3 className="modal-title">📌 Pin a Project</h3>
        {[
          ["Project Title *", title, setTitle, "text"],
          ["Short Description", desc, setDesc, "text"],
          ["Project URL", link, setLink, "url"],
          ["Tags (comma separated)", tags, setTags, "text"],
        ].map(([label, val, set, type]) => (
          <div className="modal-field" key={label}>
            <label className="modal-label">{label}</label>
            <input type={type} value={val} onChange={e => set(e.target.value)} className="modal-input" />
          </div>
        ))}
        <div className="modal-actions">
          <button className="modal-submit" onClick={submit}>PASTE IT ✦</button>
          <button className="modal-cancel" onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef(null);
  useSquiggles(canvasRef);

  const { scale: heroScale, opacity: heroOpacity } = useHeroParallax();

  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [modal,    setModal]    = useState(false);
  const [active,   setActive]   = useState("home");

  const sections = ["home","about","skills","projects","games"];

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActive(id);
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.2 }
    );
    sections.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { document.title = "Charles Junjie Mempin"; }, []);

  // Always start at the top on load/refresh
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <>
      <canvas id="sq-canvas" ref={canvasRef} />

      <div className="wrap">
        {/* ── Nav ── */}
        <nav>
          {sections.map(s => (
            <button key={s} className={`nav-btn${active === s ? " active" : ""}`} onClick={() => scrollTo(s)}>
              {s}
            </button>
          ))}
        </nav>

        {/* ══ HERO ══ */}
        <section id="home">
          <div className="hero-wrap">
            <div
              style={{
                transform:       `scale(${heroScale})`,
                opacity:         heroOpacity,
                transition:      "transform 0.04s linear, opacity 0.04s linear",
                transformOrigin: "center center",
                willChange:      "transform, opacity",
              }}
            >
              <div className="hero-name-row">
                <div className="hero-name-a hero-anim-left">CHARLES<br />JUNJIE</div>
                <div className="hero-name-b hero-anim-right">MEMPIN</div>
              </div>
            </div>

            <div className="hero-sub hero-anim-up" style={{ animationDelay: "0.32s" }}>
              ✦&nbsp;&nbsp;Computer Science Student &amp; Web Developer&nbsp;&nbsp;✦
            </div>

            <div className="hero-btns hero-anim-up" style={{ animationDelay: "0.5s" }}>
              <a href="mailto:cjmempin18@gmail.com" className="btn-primary">✉ EMAIL ME</a>
              <button className="btn-secondary" onClick={() => scrollTo("projects")}>📁 MY PROJECTS</button>
            </div>
          </div>
        </section>

        {/* ══ ABOUT ══ */}
        <section id="about">
          <RevealBlock direction="left"><div className="sec-label">about me</div></RevealBlock>
          <div className="about-grid">
            <RevealBlock direction="left" delay={80}>
              <TornCard rotate={-1.5} style={{ padding: "28px 24px 22px", marginTop: "12px" }}>
                <Tape />
                <h2 className="sec-heading">Hey there! 👋</h2>
                <p className="card-body" style={{ marginBottom: "14px" }}>
                  I'm Charles — a CS student at <span className="hl-lavender">Mapúa University</span> who loves
                  building things for the web. I enjoy crafting interfaces that actually feel good to use, not just look good.
                </p>
                <p className="card-body">
                  When I'm not coding, you'll find me nose-deep in a book or at the gym.
                  I believe good software, like a good novel, tells a story.
                </p>
                <div style={{ marginTop: "18px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <Tag rotate={-1.5} variant="lavender">📖 Reader</Tag>
                  <Tag rotate={1}    variant="white">🏋️ Gym Rat</Tag>
                  <Tag rotate={-0.8} variant="cream">☕ Coffee Lover</Tag>
                </div>
              </TornCard>
            </RevealBlock>

            <div className="about-stack">
              {[
                { rot: 1.2,  tr: 1,   delay: 120, head: "📚 Education", body: (
                  <div className="card-body">
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Mapúa University</strong><br />BS Computer Science<br />
                      <span className="card-muted">Aug 2022 – Present</span>
                    </div>
                    <div>
                      <strong>San Ildefonso College</strong><br />STEM Strand<br />
                      <span className="card-muted">Aug 2020 – June 2022</span>
                    </div>
                  </div>
                )},
                { rot: -0.9, tr: -1,  delay: 210, head: "💼 Currently", body: (
                  <div className="card-body">
                    <strong>Software Engineer Intern</strong><br />
                    Elinnov Technologies, Inc.<br />
                    <span className="card-muted">June 2025 – September 2025</span>
                    <p className="card-sub">Full-stack dev with ASP.NET Core &amp; C#, Agile/SDLC, Swagger.</p>
                  </div>
                )},
                { rot: 1.4,  tr: 1.5, delay: 300, head: "📻 Past", body: (
                  <div className="card-body">
                    <strong>Web Developer</strong><br />
                    Mapúa Radio Cardinal<br />
                    <span className="card-muted">May 2024 – August 2025</span>
                    <p className="card-sub">Dynamic features, custom admin tools, responsive design.</p>
                  </div>
                )},
              ].map(({ rot, tr, delay, head, body }) => (
                <RevealBlock key={head} direction="right" delay={delay}>
                  <TornCard rotate={rot} style={{ padding: "20px 18px 16px", marginTop: "12px" }}>
                    <Tape rotate={tr} />
                    <h3 className="card-head">{head}</h3>
                    {body}
                  </TornCard>
                </RevealBlock>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SKILLS ══ */}
        <section id="skills">
          <RevealBlock direction="up"><div className="sec-label">skills</div></RevealBlock>
          <RevealBlock direction="scale" delay={80}>
            <TornCard rotate={0.4} style={{ padding: "28px 26px 22px", marginTop: "12px" }}>
              <Tape rotate={0.5} />
              <h2 className="sec-heading">Tech Stack 🛠️</h2>
              <div className="skills-tags">
                {SKILLS.map((s, i) => (
                  <Tag key={s} rotate={TAG_ROTATIONS[i % TAG_ROTATIONS.length]}
                    variant={i % 3 === 0 ? "lavender" : i % 3 === 1 ? "white" : "cream"}>
                    {s}
                  </Tag>
                ))}
              </div>
              <div className="skills-divider">
                <div className="stamp stamp-lavender" style={{ marginBottom: "12px", fontSize: "0.65rem" }}>Also</div>
                <div className="skills-tags">
                  {[["Conversational English","cream",1.2],["Fluent Filipino","lavender",-1],["Reading 📖","white",1.8]]
                    .map(([label, variant, rot]) => (
                      <Tag key={label} rotate={rot} variant={variant}>{label}</Tag>
                    ))}
                </div>
              </div>
            </TornCard>
          </RevealBlock>
        </section>

        {/* ══ PROJECTS ══ */}
        <section id="projects">
          <RevealBlock direction="up">
            <div className="sec-label">projects</div>
            <div className="projects-header">
              <h2 className="sec-heading">My Work 📌</h2>
              <button className="add-btn" onClick={() => setModal(true)}>+ ADD PROJECT</button>
            </div>
          </RevealBlock>

          <div className="projects-grid">
            {projects.map((p, i) => (
              <RevealBlock key={p.id} direction="up" delay={i * 110}>
                <TornCard rotate={CARD_ROTATIONS[i % CARD_ROTATIONS.length]} style={{ marginTop: "12px" }}>
                  <Tape rotate={CARD_ROTATIONS[(i + 2) % CARD_ROTATIONS.length] * 0.6} />
                  <div style={{
                    height: "8px",
                    background: `repeating-linear-gradient(90deg,${p.accent} 0px,${p.accent} 12px,transparent 12px,transparent 20px)`,
                    marginTop: "4px",
                  }} />
                  <div className="project-card-inner">
                    <h3 className="project-title">{p.title}</h3>
                    <p className="project-desc">{p.description}</p>
                    {p.tags.length > 0 && (
                      <div className="project-tags">
                        {p.tags.map((t, ti) => (
                          <Tag key={t} rotate={TAG_ROTATIONS[ti % TAG_ROTATIONS.length]}
                            variant={ti % 2 === 0 ? "lavender" : "white"}>{t}</Tag>
                        ))}
                      </div>
                    )}
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="project-link">
                        VIEW PROJECT →
                      </a>
                    )}
                  </div>
                </TornCard>
              </RevealBlock>
            ))}
          </div>
        </section>

        {/* ══ GAMES ══ */}
        <section id="games">
          <RevealBlock direction="up">
            <div className="sec-label">games</div>
            <h2 className="sec-heading" style={{ marginBottom: "24px" }}>Play a Game 🎮</h2>
          </RevealBlock>
          <RevealBlock direction="scale" delay={100}>
            <Games />
          </RevealBlock>
        </section>

        {/* ── Footer ── */}
        <footer>
          <div className="footer-inner">
            ✦ made with lots of ☕ &nbsp;·&nbsp; charles junjie mempin &nbsp;·&nbsp; ✦
          </div>
        </footer>
      </div>

      {modal && (
        <AddProjectModal
          onAdd={p => setProjects(prev => [...prev, p])}
          onClose={() => setModal(false)}
        />
      )}
    </>
  );
}