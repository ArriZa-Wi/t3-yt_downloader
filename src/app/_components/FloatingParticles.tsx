"use client";

import { useMemo } from "react";

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id:       i,
    top:      (i * 37) % 95,
    left:     (i * 61 + 13) % 95,
    size:     2 + (i % 5),
    opacity:  parseFloat((0.15 + ((i * 7) % 36) / 100).toFixed(3)),
    duration: 12 + (i % 14),
    delay:    (i * 3) % 16,
    color:    i % 3 === 0 ? "oklch(0.577 0.245 27.325)" : "oklch(0.9 0 0)",
  }));
}

export function FloatingParticles() {
  const particles = useMemo(() => generateParticles(25), []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position:        "absolute",
            top:             `${p.top}%`,
            left:            `${p.left}%`,
            width:           `${p.size}px`,
            height:          `${p.size}px`,
            borderRadius:    "50%",
            backgroundColor: p.color,
            ["--p-opacity" as string]: String(p.opacity),
            opacity:         p.opacity,
            animation:       `float-particle ${p.duration}s ${p.delay}s ease-in-out infinite`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
