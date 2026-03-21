"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { UrlInput } from "./UrlInput";
import { VideoInfoCard } from "./VideoInfoCard";
import { FormatPicker } from "./FormatPicker";
import { ProgressBar, DoneActions } from "./ProgressBar";
import { Button } from "~/components/ui/button";

type Phase =
  | "idle"
  | "fetching_info"
  | "info_ready"
  | "downloading"
  | "done"
  | "error";

interface VideoInfo {
  title: string;
  channel: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

export function DownloaderWidget() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
  const [quality, setQuality] = useState("best");
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const utils = api.useUtils();

  const getVideoInfo = api.downloader.getVideoInfo.useMutation({
    onSuccess: (data) => {
      setVideoInfo(data);
      setPhase("info_ready");
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setPhase("error");
    },
  });

  const startDownload = api.downloader.startDownload.useMutation({
    onSuccess: ({ jobId: id }) => {
      setJobId(id);
      setPhase("downloading");
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setPhase("error");
    },
  });

  const jobStatus = api.downloader.getJobStatus.useQuery(
    { jobId: jobId ?? "" },
    {
      enabled: phase === "downloading" && !!jobId,
      refetchInterval: 1000,
    },
  );

  // React to job status changes
  const status = jobStatus.data?.status;
  const progress = jobStatus.data?.progress ?? 0;

  if (phase === "downloading" && status === "done") {
    setPhase("done");
    void utils.downloader.getJobStatus.invalidate();
  }
  if (phase === "downloading" && status === "error") {
    setErrorMsg(jobStatus.data?.errorMessage ?? "Download failed");
    setPhase("error");
  }

  function handleFetch(fetchUrl: string) {
    setUrl(fetchUrl);
    setPhase("fetching_info");
    setVideoInfo(null);
    getVideoInfo.mutate({ url: fetchUrl });
  }

  function handleDownload() {
    startDownload.mutate({ url, format, quality: quality as "best" | "1080p" | "720p" | "480p" });
  }

  function handleReset() {
    setPhase("idle");
    setUrl("");
    setVideoInfo(null);
    setJobId(null);
    setErrorMsg("");
  }

  return (
    <Card className="w-full max-w-2xl border-border bg-card shadow-xl">
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">
            Paste a YouTube URL
          </h2>
          <UrlInput
            onFetch={handleFetch}
            isLoading={phase === "fetching_info"}
          />
        </div>

        {videoInfo && (
          <VideoInfoCard
            title={videoInfo.title}
            channel={videoInfo.channel}
            durationSeconds={videoInfo.durationSeconds}
            thumbnailUrl={videoInfo.thumbnailUrl}
          />
        )}

        {(phase === "info_ready" || phase === "downloading" || phase === "done") && (
          <FormatPicker
            format={format}
            quality={quality}
            onFormatChange={setFormat}
            onQualityChange={setQuality}
          />
        )}

        {phase === "info_ready" && (
          <Button
            onClick={handleDownload}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Download
          </Button>
        )}

        {phase === "downloading" && (
          <ProgressBar progress={progress} status={status ?? "downloading"} />
        )}

        {phase === "done" && jobId && (
          <DoneActions jobId={jobId} onReset={handleReset} />
        )}

        {phase === "error" && (
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="shrink-0">Error</Badge>
            <span className="text-sm text-muted-foreground">{errorMsg}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="ml-auto border-border text-foreground hover:bg-secondary"
            >
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
