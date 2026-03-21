"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const errorVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

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
      refetchInterval: 2500,
      staleTime: 0,
    },
  );

  const status = jobStatus.data?.status;
  const progress = jobStatus.data?.progress ?? 0;

  useEffect(() => {
    if (phase === "downloading" && status === "done") {
      setPhase("done");
      void utils.downloader.getJobStatus.invalidate();
    }
    if (phase === "downloading" && status === "error") {
      setErrorMsg(jobStatus.data?.errorMessage ?? "Download failed");
      setPhase("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.1 }}
      className="w-full max-w-2xl"
    >
      <Card className="border-border bg-card shadow-xl">
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

          <AnimatePresence mode="wait">
            {videoInfo && (
              <motion.div key="video-info" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
                <VideoInfoCard
                  title={videoInfo.title}
                  channel={videoInfo.channel}
                  durationSeconds={videoInfo.durationSeconds}
                  thumbnailUrl={videoInfo.thumbnailUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {(phase === "info_ready" || phase === "downloading" || phase === "done") && (
              <motion.div key="format-picker" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
                <FormatPicker
                  format={format}
                  quality={quality}
                  onFormatChange={(f) => {
                    setFormat(f);
                    if (phase === "done") { setPhase("info_ready"); setJobId(null); }
                  }}
                  onQualityChange={(q) => {
                    setQuality(q);
                    if (phase === "done") { setPhase("info_ready"); setJobId(null); }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === "info_ready" && (
              <motion.div key="dl-btn" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
                <Button
                  onClick={handleDownload}
                  className="animate-btn-pulse w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Download
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === "downloading" && (
              <motion.div key="progress" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
                <ProgressBar progress={progress} status={status ?? "downloading"} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === "done" && jobId && (
              <motion.div key="done" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
                <DoneActions jobId={jobId} onReset={handleReset} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase === "error" && (
              <motion.div key="error" variants={errorVariants} initial="initial" animate="animate" exit="exit">
                <div className="animate-shake flex items-center gap-3">
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
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
