import { Navbar } from "./_components/Navbar";
import { DownloaderWidget } from "./_components/DownloaderWidget";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-start justify-center px-4 pt-16">
        <DownloaderWidget />
      </main>
    </div>
  );
}
