import { motion } from "framer-motion";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const heroData = [
  { phase: "Baseline", score: 28 },
  { phase: "Midline", score: 53 },
  { phase: "Endline", score: 81 },
  { phase: "Scale", score: 92 },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-4 text-sm uppercase tracking-[0.24em] text-teal-400">Strategic Analytics</p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight text-slate-100 md:text-6xl">
            Turning Complex Data into Measurable Impact.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-400">
            Monitoring &amp; Evaluation Specialist bridging the gap between field operations and strategic
            decision-making through rigorous data analysis.
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.65 }}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-glow"
        >
          <p className="mb-2 text-sm text-slate-400">Live Outcome Trajectory</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heroData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="phase" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="score" fill="#2dd4bf" radius={[10, 10, 0, 0]} animationDuration={1300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
