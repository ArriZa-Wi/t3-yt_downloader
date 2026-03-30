"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";

interface ProgressBarProps {
  progress: number;
  status: string;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  const label =
    status === "converting"
      ? "Converting..."
      : status === "downloading"
        ? `Downloading... ${progress}%`
        : status === "queued"
          ? "Queued..."
          : `${progress}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{progress}%</span>
      </div>
      <div className="relative">
        <Progress
          value={progress}
          className="h-2 bg-secondary [&>div]:bg-primary"
        />
        {/* Shimmer sweep */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

interface ConfettiParticle {
  id: number;
  cx: string;
  cy: string;
  cr: string;
  color: string;
  delay: string;
  size: string;
}

function ConfettiBurst({ particles }: { particles: ConfettiParticle[] }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: p.color,
            ["--cx" as string]: p.cx,
            ["--cy" as string]: p.cy,
            ["--cr" as string]: p.cr,
            animation: `confetti-fly 0.8s ease-out ${p.delay} forwards`,
          }}
        />
      ))}
    </span>
  );
}

interface DoneActionsProps {
  jobId: string;
  onReset: () => void;
}

export function DoneActions({ jobId, onReset }: DoneActionsProps) {
  const particles = useMemo<ConfettiParticle[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      cx: `${(Math.random() - 0.5) * 120}px`,
      cy: `${-(Math.random() * 80 + 30)}px`,
      cr: `${(Math.random() - 0.5) * 540}deg`,
      color: (["oklch(0.577 0.245 27.325)", "oklch(0.985 0 0)", "oklch(0.6 0 0)"] as string[])[i % 3]!,
      delay: `${(Math.random() * 0.3).toFixed(2)}s`,
      size: `${(Math.random() * 5 + 4).toFixed(1)}px`,
    }))
  , []);

  return (
    <div className="flex items-center gap-3">
      <span className="relative inline-flex">
        <motion.span
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}
          className="text-lg font-bold text-primary"
        >
          ✓ Done!
        </motion.span>
        <ConfettiBurst particles={particles} />
      </span>
      <a href={`/api/download/${jobId}`} download>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          ⬇ Save file
        </Button>
      </a>
      <Button
        variant="outline"
        onClick={onReset}
        className="border-border text-foreground hover:bg-secondary"
      >
        Start over
      </Button>
    </div>
  );
}
