import os from "os";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { execYtDlpInfo, spawnYtDlpDownload } from "~/lib/yt-dlp";

const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) =>
      /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(url),
    { message: "Must be a YouTube video URL" },
  );

export const downloaderRouter = createTRPCRouter({
  getVideoInfo: publicProcedure
    .input(z.object({ url: youtubeUrlSchema }))
    .mutation(async ({ input }) => {
      try {
        return await execYtDlpInfo(input.url);
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create output directory for this job
      const job = await ctx.db.downloadJob.create({
        data: {
          url: input.url,
          format: input.format,
          quality: input.quality,
          status: "queued",
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

      const { pid } = spawnYtDlpDownload(
        outputDir,
        input.url,
        input.format,
        input.quality,
        {
          onProgress: (progress) => {
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
});
