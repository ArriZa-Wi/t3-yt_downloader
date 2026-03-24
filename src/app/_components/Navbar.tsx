"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session, status } = useSession();

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

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-secondary" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-7 w-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
