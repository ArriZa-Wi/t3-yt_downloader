"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const GAIN = 0.006;         // progress gained per px of mouse movement
const DECAY_PER_SEC = 18;   // % lost per second when idle
const FRAME_MS = 16;        // ~60fps

interface MouseChallengeProps {
  downloadComplete: boolean;
  onComplete: () => void;
}

export function MouseChallenge({ downloadComplete, onComplete }: MouseChallengeProps) {
  const [progress, setProgress] = useState(0);
  const [filled, setFilled] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const progressRef = useRef(0);
  const filledRef = useRef(false);

  // Track mouse position
  const onMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  // Animation loop: accumulate movement, apply decay
  useEffect(() => {
    const interval = setInterval(() => {
      if (filledRef.current) return;

      const dx = mousePos.current.x - lastPos.current.x;
      const dy = mousePos.current.y - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      lastPos.current = { ...mousePos.current };

      let next = progressRef.current;
      next += dist * GAIN;
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
    <div className="flex flex-col items-center gap-4">
      {!filled ? (
        <>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-lg font-bold text-foreground"
          >
            Shake your mouse as fast as you can!
          </motion.p>
          <p className="text-xs text-muted-foreground">
            Move your mouse to fill the bar — don&apos;t stop or it drains!
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
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="tabular-nums text-sm font-semibold text-foreground">
        {Math.floor(progress)}%
      </span>
    </div>
  );
}
