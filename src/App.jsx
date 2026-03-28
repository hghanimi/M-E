import { motion } from "framer-motion";
import FloatingNav from "./components/FloatingNav";
import HeroSection from "./components/HeroSection";
import ControlCenter from "./components/ControlCenter";
import BentoGrid from "./components/BentoGrid";
import CaseStudies from "./components/CaseStudies";
import ContactSection from "./components/ContactSection";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-radial-grid" />

      <FloatingNav />

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
