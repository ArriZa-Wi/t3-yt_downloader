"use client";

import { useEffect, useRef } from "react";

/* ── Tuning constants ─────────────────────────────── */
const PARTICLE_COUNT = 70;
const CONNECTION_DISTANCE = 150;
const MOUSE_CONNECTION_DISTANCE = 200;
const MOUSE_REPULSION_RADIUS = 120;
const MOUSE_REPULSION_STRENGTH = 800;
const VELOCITY_DAMPING = 0.03;
const GLOW_RADIUS = 280;
const MIN_SPEED = 0.15;
const MAX_SPEED = 0.4;
const TWO_PI = Math.PI * 2;

const RED = "rgba(255, 48, 48,";
const WHITE = "rgba(255, 255, 255,";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  isRed: boolean;
  opacity: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const vx = randomBetween(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1);
    const vy = randomBetween(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx,
      vy,
      baseVx: vx,
      baseVy: vy,
      radius: randomBetween(1.5, 3),
      isRed: i % 3 === 0,
      opacity: randomBetween(0.55, 0.9),
    };
  });
}

export function InteractiveParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ── Resize ──────────────────────────────────── */
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reinitialise particles on first call or when there are none
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(w, h);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    /* ── Mouse listeners ─────────────────────────── */
    function onMouseMove(e: MouseEvent) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    }
    function onMouseLeave() {
      mouseRef.current.active = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    /* ── Visibility ──────────────────────────────── */
    let paused = false;
    function onVisibilityChange() {
      paused = document.hidden;
      if (!paused) rafRef.current = requestAnimationFrame(animate);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    /* ── Animation loop ──────────────────────────── */
    function animate() {
      if (paused) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      ctx!.clearRect(0, 0, w, h);

      // Update & draw particles
      for (const p of particles) {
        // Mouse repulsion
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < MOUSE_REPULSION_RADIUS && dist > 0) {
            const force = MOUSE_REPULSION_STRENGTH / distSq;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Dampen back to base velocity
        p.vx += (p.baseVx - p.vx) * VELOCITY_DAMPING;
        p.vy += (p.baseVy - p.vy) * VELOCITY_DAMPING;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, TWO_PI);
        ctx!.fillStyle = `${p.isRed ? RED : WHITE}${p.opacity})`;
        ctx!.fill();
      }

      // Connection lines between particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.6;
            const color = a.isRed || b.isRed ? RED : WHITE;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `${color}${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      // Lines from particles to mouse
      if (mouse.active) {
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_CONNECTION_DISTANCE) {
            const opacity = (1 - dist / MOUSE_CONNECTION_DISTANCE) * 0.75;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.strokeStyle = `${RED}${opacity})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }

        // Glow orb
        const gradient = ctx!.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, GLOW_RADIUS,
        );
        gradient.addColorStop(0, "rgba(255, 48, 48, 0.35)");
        gradient.addColorStop(1, "rgba(255, 48, 48, 0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(mouse.x - GLOW_RADIUS, mouse.y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    /* ── Cleanup ─────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}
