"use client";

import { useState } from "react";
import Image from "next/image";

interface VideoInfoCardProps {
  title: string;
  channel: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoInfoCard({ title, channel, durationSeconds, thumbnailUrl }: VideoInfoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="flex gap-4 rounded-lg bg-secondary p-3">
      {thumbnailUrl && (
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className={`object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            unoptimized
            onLoad={() => setImgLoaded(true)}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-col justify-center">
        <p className="truncate font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {channel} · {formatDuration(durationSeconds)}
        </p>
      </div>
    </div>
  );
}
