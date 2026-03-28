import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BarChart3, Database, FlaskConical, Microscope } from "lucide-react";

const impactSeries = [
  { month: "M1", impact: 12 },
  { month: "M2", impact: 18 },
  { month: "M3", impact: 27 },
  { month: "M4", impact: 36 },
  { month: "M5", impact: 42 },
  { month: "M6", impact: 55 },
];

const tools = ["Tableau", "PowerBI", "R", "Python", "STATA", "KoboToolbox"];
const methods = ["RCTs", "LogFrames", "Theory of Change", "Mixed-Methods", "Outcome Harvesting"];

export default function BentoGrid() {
  const [count, setCount] = useState(0);
  const ref = useState(() => ({ current: null }))[0];
  const inView = useInView(ref, { once: true, amount: 0.35 });

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const maxFrames = 42;
    const timer = setInterval(() => {
      frame += 1;
      const value = Math.min(45, Math.round((frame / maxFrames) * 45));
      setCount(value);
      if (frame >= maxFrames) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <section id="frameworks" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.24em] text-teal-400">Frameworks</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-100 md:text-4xl">Bento Intelligence Grid</h2>

        <div ref={ref} className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <motion.article
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2"
          >
            <div className="flex items-center gap-3 text-teal-400">
              <BarChart3 size={18} />
              <span className="text-sm">Projects Evaluated</span>
            </div>
            <p className="mt-6 text-6xl font-extrabold text-slate-100">{count}+</p>
            <p className="mt-3 text-sm text-slate-400">Comprehensive evaluations across health, protection, and livelihoods.</p>
          </motion.article>

          <motion.article
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-center gap-3 text-teal-400">
              <Database size={18} />
              <span className="text-sm">Tools Stack</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tools.map((tool) => (
                <span key={tool} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {tool}
                </span>
              ))}
            </div>
          </motion.article>

          <motion.article
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.14 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-center gap-3 text-teal-400">
              <FlaskConical size={18} />
              <span className="text-sm">Methodologies</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {methods.map((method) => (
                <li key={method} className="rounded-lg border border-slate-800 px-3 py-2 transition hover:border-teal-400/40">
                  {method}
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:col-span-2 xl:col-span-4"
          >
            <div className="flex items-center gap-3 text-teal-400">
              <Microscope size={18} />
              <span className="text-sm">Impact Over Time (Mock Signal)</span>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={impactSeries}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: "#020617", border: "1px solid #334155", color: "#e2e8f0" }}
                  />
                  <Line
                    dataKey="impact"
                    type="monotone"
                    stroke="#2dd4bf"
                    strokeWidth={3}
                    dot={{ fill: "#2dd4bf", r: 4 }}
                    animationDuration={1100}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
