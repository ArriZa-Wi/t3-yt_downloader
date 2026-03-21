"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardFade = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const steps = [
  {
    number: "①",
    title:  "Paste a URL",
    desc:   "Paste any youtube.com or youtu.be link into the input above.",
  },
  {
    number: "②",
    title:  "Choose format",
    desc:   "MP3 for audio only, or MP4 for video with quality options.",
  },
  {
    number: "③",
    title:  "Download",
    desc:   "Your file downloads directly to your device — no account needed.",
  },
];

const pills = [
  { icon: "✅", label: "100% Free" },
  { icon: "🚫", label: "No sign-up" },
  { icon: "🎵", label: "MP3 & MP4" },
  { icon: "⬆️", label: "High quality" },
];

export function BelowCardContent() {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-12">

      {/* How it works */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="w-full"
      >
        <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
          How it works
        </h2>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={cardFade}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
            >
              <span className="text-3xl font-bold text-primary">{step.number}</span>
              <span className="text-sm font-semibold text-foreground">{step.title}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{step.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Feature pills */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="w-full"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {pills.map((pill) => (
            <span
              key={pill.label}
              className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground"
            >
              <span aria-hidden="true">{pill.icon}</span>
              {pill.label}
            </span>
          ))}
        </div>
      </motion.section>

    </div>
  );
}
