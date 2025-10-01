import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Play, Pause, Star, Telescope, CheckCircle2, XCircle, Info, Github } from "lucide-react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// --- Minimal shadcn-like components (in case shadcn isn't pre-wired) ---
// If shadcn/ui is available in your stack, you can swap these with the official imports.
const Card = ({ className = "", children }) => (
  <div className={`bg-white/90 dark:bg-zinc-900/80 backdrop-blur rounded-2xl shadow-xl ${className}`}>{children}</div>
);
const CardHeader = ({ className = "", children }) => (
  <div className={`px-6 pt-6 pb-2 ${className}`}>{children}</div>
);
const CardContent = ({ className = "", children }) => (
  <div className={`px-6 pb-6 ${className}`}>{children}</div>
);
const Button = ({ className = "", children, ...props }) => (
  <button
    className={`px-4 py-2 rounded-2xl shadow hover:shadow-md transition border border-black/5 dark:border-white/10 disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Utility: generate synthetic light-curve data
function generateLightCurve({ n = 300, noise = 0.004, transit = false }) {
  // baseline ~1.0 with mild trends
  const data = [];
  const trend = (i) => 0.002 * Math.sin((i / n) * Math.PI * 2);
  const t0 = Math.floor(n * 0.45);
  const t1 = Math.floor(n * 0.55);
  for (let i = 0; i < n; i++) {
    let flux = 1 + trend(i) + (Math.random() - 0.5) * noise * 2;
    if (transit && i >= t0 && i <= t1) {
      const depth = 0.02; // 2% dip
      // smooth ingress/egress
      const edge = Math.min(i - t0, t1 - i) / (t1 - t0);
      const shape = 1 - Math.pow(1 - Math.max(0, edge * 2), 2);
      flux -= depth * (0.75 + 0.25 * shape);
    }
    data.push({
      x: i,
      flux: Number(flux.toFixed(5)),
    });
  }
  return data;
}

function makeTask() {
  // Create 3 panels; exactly 1 has a transit-like dip
  const correctIndex = Math.floor(Math.random() * 3);
  const panels = [0, 1, 2].map((idx) =>
    generateLightCurve({ transit: idx === correctIndex, noise: 0.004 + Math.random() * 0.004 })
  );
  return { id: crypto.randomUUID(), panels, correctIndex };
}

function MiniLightCurve({ data, height = 140 }) {
  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="x" tick={{ fontSize: 10 }} hide />
          <YAxis domain={[0.94, 1.06]} tick={{ fontSize: 10 }} hide />
          <Tooltip formatter={(v) => Number(v).toFixed(4)} labelFormatter={(l) => `t = ${l}`} />
          <Line type="monotone" dataKey="flux" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Classifier() {
  const [task, setTask] = useState(makeTask());
  const [selection, setSelection] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);

  const onPick = (idx) => {
    if (revealed) return;
    setSelection(idx);
    setRevealed(true);
    setCount((c) => c + 1);
    if (idx === task.correctIndex) setCorrect((k) => k + 1);
  };

  const next = () => {
    setTask(makeTask());
    setSelection(null);
    setRevealed(false);
  };

  const accuracy = count ? Math.round((100 * correct) / count) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Telescope className="w-5 h-5" />
          <h3 className="text-xl font-semibold">Classify: Which panel shows a planet-like transit dip?</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {task.panels.map((panel, idx) => {
            const isChoice = selection === idx;
            const isCorrect = revealed && idx === task.correctIndex;
            const isWrongPick = revealed && isChoice && !isCorrect;
            return (
              <button
                key={idx}
                onClick={() => onPick(idx)}
                className={`group rounded-2xl border transition overflow-hidden text-left ${
                  isCorrect
                    ? "border-green-500 ring-2 ring-green-500/30"
                    : isWrongPick
                    ? "border-red-500 ring-2 ring-red-500/30"
                    : isChoice
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : "border-black/10 dark:border-white/10 hover:border-blue-300"
                }`}
              >
                <div className="p-3 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                  <div className="text-sm opacity-70 mb-2">Panel {idx + 1}</div>
                  <MiniLightCurve data={panel} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-5">
          <div className="text-sm opacity-80">
            <span className="mr-3">Total: <strong>{count}</strong></span>
            <span>Accuracy: <strong>{accuracy}%</strong></span>
          </div>
          <div className="flex gap-2">
            <Button onClick={next} className="bg-zinc-100 dark:bg-zinc-800">Next sample</Button>
          </div>
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div
              className="mt-4 p-4 rounded-2xl border border-black/10 dark:border-white/10"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {selection === task.correctIndex ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Correct! You found the transit-like dip.</div>
                    <div className="text-sm opacity-80 mt-1">Planetary transits produce a small, periodic drop in flux. In real datasets, we also check shape, depth, duration, and repeatability.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Not quite. Panel {task.correctIndex + 1} had the transit-like dip.</div>
                    <div className="text-sm opacity-80 mt-1">Common impostors include starspots and eclipsing binaries. Keep going—your classifications improve the AI.</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function UploadAndPlot() {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState("");

  const onFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: false,
      dynamicTyping: true,
      complete: (res) => {
        // Expect two columns: time, flux
        const rows = res.data
          .filter((r) => Array.isArray(r) && r.length >= 2 && !isNaN(r[0]) && !isNaN(r[1]))
          .map((r) => ({ x: Number(r[0]), flux: Number(r[1]) }));
        if (rows.length) setData(rows);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5" />
          <h3 className="text-xl font-semibold">Try your own light curve (CSV)</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-sm"
          />
        </div>
        {data ? (
          <div className="mt-4">
            <div className="text-sm opacity-70 mb-2">{fileName}</div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => Number(v).toFixed(6)} labelFormatter={(l) => `t = ${l}`} />
                  <Line type="monotone" dataKey="flux" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm opacity-70 mt-3">CSV format: two columns <code>time, flux</code> (no header required).</p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, children, icon: Icon }) {
  return (
    <section className="max-w-5xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {Icon ? <Icon className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-zinc max-w-none dark:prose-invert">
            {children}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function PlanetHunterCitizenScience() {
  const [running, setRunning] = useState(true);
  const [stats, setStats] = useState({ users: 1_240, classifications: 12_845, candidates: 327 });

  // fun animated counters
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setStats((s) => ({
        users: s.users + Math.floor(Math.random() * 3),
        classifications: s.classifications + Math.floor(Math.random() * 7),
        candidates: s.candidates + (Math.random() < 0.3 ? 1 : 0),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-black text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 grid place-items-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm tracking-widest uppercase opacity-70">Team Planet Hunter — Bangladesh</div>
              <div className="font-semibold">Citizen Science Portal (NSAC 2025)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => {
              const el = document.getElementById("classify");
              el?.scrollIntoView({ behavior: "smooth" });
            }} className="bg-indigo-500/20 hover:bg-indigo-500/30">Start Classifying</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            >
              Planet Hunter — Find worlds in starlight
            </motion.h1>
            <p className="mt-4 text-zinc-300 max-w-prose">
              Help identify planet-like transits in real and simulated light curves. Your clicks train our AI and accelerate discovery.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => {
                const el = document.getElementById("classify");
                el?.scrollIntoView({ behavior: "smooth" });
              }} className="bg-white text-black hover:bg-zinc-200">Start now</Button>
              <Button onClick={() => {
                const el = document.getElementById("about");
                el?.scrollIntoView({ behavior: "smooth" });
              }} className="bg-zinc-800">Learn more</Button>
              <Button onClick={() => setRunning((r) => !r)} className="bg-zinc-800">
                {running ? <><Pause className="w-4 h-4 inline -mt-1 mr-1"/>Pause stats</> : <><Play className="w-4 h-4 inline -mt-1 mr-1"/>Resume stats</>}
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: "Volunteers", value: stats.users.toLocaleString() },
                { label: "Classifications", value: stats.classifications.toLocaleString() },
                { label: "Candidates", value: stats.candidates.toLocaleString() },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs opacity-70 mt-1 tracking-wide uppercase">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Decorative chart */}
          <div className="relative">
            <Card className="p-6">
              <div className="text-sm opacity-70 mb-2">Sample light curve</div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateLightCurve({ transit: true })} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => Number(v).toFixed(6)} labelFormatter={(l) => `t = ${l}`} />
                    <Line type="monotone" dataKey="flux" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Classifier */}
      <section id="classify" className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Classifier />
          </div>
          <div>
            <UploadAndPlot />
          </div>
        </div>
      </section>

      {/* About Sections from your script */}
      <div id="about" className="space-y-6">
        <Section title="Part 1 — Attention & Authenticity (0:00–0:45)">
          <p><strong>Powsi:</strong> “Look at the night sky. Every star is a possibility, a mystery waiting to be solved. For centuries we asked: Are we alone? Today, the data may hold answers—hidden in petabytes of light curves and noise, patterns invisible to the human eye. We are Team Planet Hunter from Bangladesh. Our mission is simple but bold: to turn overwhelming streams of cosmic data into clear discoveries, building a bridge between human imagination and the universe’s hidden worlds.”</p>
        </Section>

        <Section title="Part 2 — The Problem (0:45–1:30)">
          <p><strong>Powsi:</strong> “NASA’s Kepler and TESS missions are treasure hunters in space, sending us terabytes of signals—tiny dips in starlight that might mean a planet. But here’s the problem: for every real planet, there are hundreds of impostors—starspots, eclipsing binaries, even glitches in the instruments. To separate truth from noise, scientists still check signals by hand. The result? Countless planets remain undiscovered—not because the data is missing, but because our tools are too slow. We are drowning in an ocean of information, yet still searching with teaspoons.”</p>
        </Section>

        <Section title="Part 3 — Our Solution: Planet Hunter AI (1:30–2:40)">
          <ul>
            <li>Deep neural net trained on NASA datasets detects subtle signals hidden in noise.</li>
            <li>Dual analysis: numerical precision + image-based recognition akin to visual inspection.</li>
            <li>SHAP explainability highlights why a candidate looks planetary.</li>
            <li>Feature engineering: stellar params, orbital harmonics, noise filtering to reduce false positives.</li>
            <li>Ensembles (GBM, RF, XGBoost) stabilize predictions; CNNs capture temporal patterns.</li>
            <li>Reliability via cross-validation, Bayesian optimization, and active learning.</li>
          </ul>
          <p>This turns AI from a black box into a scientific partner—one that adapts continuously and uncovers planets faster.</p>
        </Section>

        <Section title="Part 4 — Impact & Outcome (2:40–4:00)">
          <p><strong>Powsi:</strong> “Planet Hunter is more than an algorithm—it is a platform. Through our citizen science portal, anyone—students in small towns, hobbyists with a passion for space, dreamers from every corner of the globe—can join the hunt. Every classification strengthens the AI, creating a living feedback loop between human curiosity and machine learning.”</p>
          <p>Researchers can upload telescope data and receive rapid candidate scoring. With open access, we lower barriers and empower the next generation of explorers.</p>
          <p>Every planet found is a story—of possibility, perspective, and unity. Together, with NASA’s data and the power of AI, we explore worlds beyond our own.</p>
        </Section>
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-zinc-400 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Team Planet Hunter (Bangladesh) · Built for NSAC 2025</div>
          <div className="flex items-center gap-2">
            <span className="opacity-70">Made with</span>
            <span>React · Tailwind · Recharts · PapaParse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
