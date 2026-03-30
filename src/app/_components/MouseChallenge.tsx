"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const GAIN = 3.5;           // progress gained per tap
const DECAY_PER_SEC = 12;   // % lost per second when idle
const FRAME_MS = 16;        // ~60fps

interface MouseChallengeProps {
  downloadComplete: boolean;
  onComplete: () => void;
}

export function MouseChallenge({ downloadComplete, onComplete }: MouseChallengeProps) {
  const [progress, setProgress] = useState(0);
  const [filled, setFilled] = useState(false);
  const progressRef = useRef(0);
  const filledRef = useRef(false);
  const pendingTaps = useRef(0);

  // Accumulate taps (works for both click and touch)
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (filledRef.current) return;
    e.preventDefault();
    pendingTaps.current += 1;
  }, []);

  // Animation loop: apply taps, apply decay
  useEffect(() => {
    const interval = setInterval(() => {
      if (filledRef.current) return;

      let next = progressRef.current;

      // Apply accumulated taps
      if (pendingTaps.current > 0) {
        next += pendingTaps.current * GAIN;
        pendingTaps.current = 0;
      }

      // Decay
      next -= DECAY_PER_SEC * (FRAME_MS / 1000);
      next = Math.max(0, Math.min(100, next));

      progressRef.current = next;
      setProgress(next);

      if (next >= 100) {
        filledRef.current = true;
        setFilled(true);
      }
    }, FRAME_MS);

    return () => clearInterval(interval);
  }, []);

  // When both filled and download complete → trigger done
  useEffect(() => {
    if (filled && downloadComplete) {
      onComplete();
    }
  }, [filled, downloadComplete, onComplete]);

  const barColor =
    progress < 40
      ? "bg-red-600"
      : progress < 75
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div
      className="flex cursor-pointer flex-col items-center gap-4 select-none"
      onClick={handleTap}
      onTouchStart={handleTap}
      role="button"
      tabIndex={0}
    >
      {!filled ? (
        <>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-lg font-bold text-foreground"
          >
            Tap as fast as you can!
          </motion.p>
          <p className="text-xs text-muted-foreground">
            Click or tap to fill the bar &mdash; don&apos;t stop or it drains!
          </p>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm font-medium text-muted-foreground"
        >
          Wrapping up...
        </motion.p>
      )}

      {/* Progress bar */}
      <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-75 ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="tabular-nums text-sm font-semibold text-foreground">
        {Math.floor(progress)}%
      </span>
    </div>
  );
}
