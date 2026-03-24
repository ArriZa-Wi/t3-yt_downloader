import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = await db.downloadJob.findUnique({
    where: { id: jobId },
    select: { status: true, outputPath: true, format: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "done" || !job.outputPath) {
    return NextResponse.json({ error: "File not ready" }, { status: 409 });
  }

  if (!fs.existsSync(job.outputPath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 410 });
  }

  const filename = path.basename(job.outputPath);
  const contentType =
    job.format === "mp3" ? "audio/mpeg" : "video/mp4";
  const buffer = await readFile(job.outputPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
