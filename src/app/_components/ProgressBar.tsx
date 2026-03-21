"use client";

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
      <Progress
        value={progress}
        className="h-2 bg-secondary [&>div]:bg-primary"
      />
    </div>
  );
}

interface DoneActionsProps {
  jobId: string;
  onReset: () => void;
}

export function DoneActions({ jobId, onReset }: DoneActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-primary">✓ Done!</span>
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
