"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-border bg-card px-6 py-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="text-primary text-xl">▶</span>
          <span className="text-lg tracking-tight">YTSave</span>
        </Link>
      </div>
    </nav>
  );
}
