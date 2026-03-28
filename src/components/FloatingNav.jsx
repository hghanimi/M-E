import { motion } from "framer-motion";

const links = [
  { href: "#impact", label: "Impact" },
  { href: "#frameworks", label: "Frameworks" },
  { href: "#case-studies", label: "Case Studies" },
  { href: "#contact", label: "Contact" },
];

export default function FloatingNav() {
  return (
    <motion.nav
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed left-1/2 top-5 z-50 w-[min(1100px,92vw)] -translate-x-1/2"
    >
      <div className="mx-auto flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-900/70 px-4 py-2 shadow-glow backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">M&E Specialist</p>
        <div className="hidden gap-6 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-slate-300 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </div>
        <a
          href="#"
          className="rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
        >
          Download CV
        </a>
      </div>
    </motion.nav>
  );
}
