import { Mail, Linkedin, Github } from "lucide-react";

export default function ContactSection() {
  return (
    <section id="contact" className="px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-10">
        <p className="text-sm uppercase tracking-[0.24em] text-teal-400">Contact</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-100 md:text-4xl">Let's build a framework for success.</h2>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none ring-teal-400 transition focus:ring-2"
            />
            <input
              type="email"
              placeholder="Your email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none ring-teal-400 transition focus:ring-2"
            />
            <textarea
              rows="5"
              placeholder="Tell me about your evaluation challenge..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none ring-teal-400 transition focus:ring-2"
            />
            <button
              type="button"
              className="rounded-full bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              Send Message
            </button>
          </form>

          <div className="space-y-5 text-slate-300">
            <p className="text-slate-400">
              Open to advisory, embedded, and rapid-response M&E assignments across humanitarian and development settings.
            </p>

            <a className="flex items-center gap-3 transition hover:text-teal-300" href="mailto:your@email.com">
              <Mail size={18} /> your@email.com
            </a>
            <a className="flex items-center gap-3 transition hover:text-teal-300" href="#">
              <Linkedin size={18} /> LinkedIn
            </a>
            <a className="flex items-center gap-3 transition hover:text-teal-300" href="#">
              <Github size={18} /> GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
