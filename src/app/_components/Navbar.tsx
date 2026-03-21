"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="relative z-10 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="inline-block text-primary text-xl" style={{ animation: "check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>▶</span>
          <span className="text-lg tracking-tight">YTSave</span>
        </Link>
      </div>
    </motion.nav>
  );
}
