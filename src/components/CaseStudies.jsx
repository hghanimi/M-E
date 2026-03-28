import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

const studies = [
  {
    title: "Maternal Health Access Recovery",
    context: "A regional maternal health program in post-crisis districts struggled with clinic retention and service quality.",
    framework: "Designed a mixed-method M&E framework with baseline-midline-endline surveys, facility scorecards, and sentinel qualitative interviews.",
    data: [
      { arm: "Control", positive: 22, moderate: 35, low: 43 },
      { arm: "Intervention", positive: 58, moderate: 29, low: 13 },
    ],
    outcome: [
      "Increased early ANC attendance by 31 percentage points.",
      "Reduced no-show rates through community referral tracking.",
      "Informed donor scale-up to 3 additional districts.",
    ],
  },
  {
    title: "Cross-Border Livelihood Stabilization",
    context: "A livelihoods response spanning three countries required harmonized indicators and near-real-time performance monitoring.",
    framework: "Built a unified indicator dictionary and dashboard architecture linking Kobo submissions to central analytics.",
    data: [
      { arm: "Control", positive: 26, moderate: 39, low: 35 },
      { arm: "Intervention", positive: 64, moderate: 24, low: 12 },
    ],
    outcome: [
      "Raised household income resilience index by 19 points.",
      "Identified weak-value-chain nodes for targeted intervention.",
      "Produced stakeholder-ready insight packs every 2 weeks.",
    ],
  },
];

export default function CaseStudies() {
  return (
    <section id="case-studies" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.24em] text-teal-400">Evidence</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-100 md:text-4xl">Featured Case Studies</h2>

        <div className="mt-8 space-y-8">
          {studies.map((study, idx) => (
            <motion.article
              key={study.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: idx * 0.08 }}
              className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:grid-cols-2"
            >
              <div>
                <h3 className="text-2xl font-semibold text-slate-100">{study.title}</h3>

                <section className="mt-5">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400">Context</h4>
                  <p className="mt-2 text-slate-300">{study.context}</p>
                </section>

                <section className="mt-5">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400">The Framework</h4>
                  <p className="mt-2 text-slate-300">{study.framework}</p>
                </section>

                <section className="mt-5">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400">The Outcome</h4>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-300">
                    {study.outcome.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h4 className="text-sm font-medium text-slate-300">Intervention Efficacy</h4>
                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={study.data} stackOffset="expand">
                      <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                      <XAxis dataKey="arm" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                      <Tooltip
                        formatter={(value) => `${value}%`}
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
                      />
                      <Legend />
                      <Bar stackId="a" dataKey="positive" fill="#2dd4bf" name="High efficacy" />
                      <Bar stackId="a" dataKey="moderate" fill="#fb923c" name="Moderate" />
                      <Bar stackId="a" dataKey="low" fill="#f43f5e" name="Low" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
