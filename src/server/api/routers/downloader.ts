import os from "os";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { execYtDlpInfo, spawnYtDlpDownload, type VideoInfo } from "~/lib/yt-dlp";

interface CacheEntry { data: VideoInfo; cachedAt: number; }
const VIDEO_INFO_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedVideoInfo(url: string): VideoInfo | null {
  const entry = VIDEO_INFO_CACHE.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    VIDEO_INFO_CACHE.delete(url);
    return null;
  }
  return entry.data;
}

const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) =>
      /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts\/)|youtu\.be\/)/.test(url),
    { message: "Must be a YouTube video URL" },
  );

export const downloaderRouter = createTRPCRouter({
  getVideoInfo: publicProcedure
    .input(z.object({ url: youtubeUrlSchema }))
    .mutation(async ({ input }) => {
      try {
        const cached = getCachedVideoInfo(input.url);
        if (cached) return cached;
        const result = await execYtDlpInfo(input.url);
        VIDEO_INFO_CACHE.set(input.url, { data: result, cachedAt: Date.now() });
        return result;
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            err instanceof Error
              ? err.message
              : "Failed to fetch video info. Check the URL and try again.",
        });
      }
    }),

  startDownload: publicProcedure
    .input(
      z.object({
        url: youtubeUrlSchema,
        format: z.enum(["mp3", "mp4"]),
        quality: z
          .enum(["best", "1080p", "720p", "480p"])
          .optional()
          .default("best"),
        title: z.string().optional(),
        thumbnailUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create output directory for this job
      const job = await ctx.db.downloadJob.create({
        data: {
          url: input.url,
          format: input.format,
          quality: input.quality,
          title: input.title,
          thumbnailUrl: input.thumbnailUrl,
          status: "queued",
          createdById: ctx.session?.user?.id,
        },
      });

      const outputDir = path.join(
        os.tmpdir(),
        "yt-dlp-jobs",
        job.id,
      );
      fs.mkdirSync(outputDir, { recursive: true });

      // Update status to downloading before spawning
      await ctx.db.downloadJob.update({
        where: { id: job.id },
        data: { status: "downloading" },
      });

      let lastWrittenProgress = -1;
      let lastWriteTime = 0;
      const WRITE_DEBOUNCE_MS = 3000;
      const WRITE_THRESHOLD_PCT = 2;

      const { pid } = spawnYtDlpDownload(
        outputDir,
        input.url,
        input.format,
        input.quality,
        {
          onProgress: (progress) => {
            const now = Date.now();
            if (
              progress - lastWrittenProgress < WRITE_THRESHOLD_PCT &&
              now - lastWriteTime < WRITE_DEBOUNCE_MS
            ) return;
            lastWrittenProgress = progress;
            lastWriteTime = now;
            void ctx.db.downloadJob
              .update({ where: { id: job.id }, data: { progress } })
              .catch(() => undefined);
          },
          onDone: (outputPath) => {
            void ctx.db.downloadJob
              .update({
                where: { id: job.id },
                data: { status: "done", progress: 100, outputPath },
              })
              .catch(() => undefined);
          },
          onError: (errorMessage) => {
            void ctx.db.downloadJob
              .update({
                where: { id: job.id },
                data: { status: "error", errorMessage },
              })
              .catch(() => undefined);
          },
        },
      );

      if (pid) {
        await ctx.db.downloadJob.update({
          where: { id: job.id },
          data: { pid },
        });
      }

      return { jobId: job.id };
    }),

  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.downloadJob.findUnique({
        where: { id: input.jobId },
        select: {
          status: true,
          progress: true,
          errorMessage: true,
          outputPath: true,
          format: true,
        },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      return job;
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.downloadJob.findMany({
      where: { createdById: ctx.session.user.id },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        url: true,
        format: true,
        quality: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});
