import { Navbar } from "./_components/Navbar";
import { DownloaderWidget } from "./_components/DownloaderWidget";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Animated red glow background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.577 0.245 27.325 / 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 90%,  oklch(0.577 0.245 27.325 / 0.07) 0%, transparent 60%)
          `,
          animation: "bg-pulse 8s ease-in-out infinite",
        }}
      />
      <Navbar />
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pt-16">
        <DownloaderWidget />
      </main>
    </div>
  );
}
