import { motion } from "framer-motion";
import FloatingNav from "./components/FloatingNav";
import HeroSection from "./components/HeroSection";
import ControlCenter from "./components/ControlCenter";
import BentoGrid from "./components/BentoGrid";
import CaseStudies from "./components/CaseStudies";
import ContactSection from "./components/ContactSection";
import { hasSupabaseConfig } from "./lib/supabase";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-radial-grid" />

      <FloatingNav />

      {!hasSupabaseConfig && (
        <div className="mx-auto mt-24 w-[min(1100px,92vw)] rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          Supabase environment variables are missing in this deployment. The page is running in view-only mode.
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare settings, then redeploy.
        </div>
      )}

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <HeroSection />
        <ControlCenter />
        <BentoGrid />
        <CaseStudies />
        <ContactSection />
      </motion.main>
    </div>
  );
}
