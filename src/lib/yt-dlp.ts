import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { env } from "~/env";

const execFileAsync = promisify(execFile);

export interface VideoInfo {
  title: string;
  channel: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

export async function execYtDlpInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(env.YTDLP_PATH, [
    "--dump-json",
    "--no-download",
    "--no-playlist",
    url,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = JSON.parse(stdout) as Record<string, unknown>;

  return {
    title: String(data.title ?? "Unknown Title"),
    channel: String(data.channel ?? data.uploader ?? "Unknown Channel"),
    durationSeconds: Number(data.duration ?? 0),
    thumbnailUrl: String(data.thumbnail ?? ""),
  };
}

const PROGRESS_RE = /\[download\]\s+([\d.]+)%/;

export interface DownloadCallbacks {
  onProgress: (progress: number) => void;
  onDone: (outputPath: string) => void;
  onError: (message: string) => void;
}

export function spawnYtDlpDownload(
  outputDir: string,
  url: string,
  format: "mp3" | "mp4",
  quality: string | undefined,
  callbacks: DownloadCallbacks,
): { pid: number | undefined; kill: () => void } {
  const args: string[] = ["--no-playlist", "--newline", "--progress"];

  if (format === "mp3") {
    args.push(
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--ffmpeg-location",
      env.FFMPEG_PATH,
    );
  } else {
    const formatStr = buildMp4Format(quality);
    args.push("-f", formatStr, "--merge-output-format", "mp4");
    args.push("--ffmpeg-location", env.FFMPEG_PATH);
  }

  args.push("-o", `${outputDir}/%(title)s.%(ext)s`, url);

  const child = spawn(env.YTDLP_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stderrBuf = "";
  let outputPath = "";
  let lineBuffer = "";

  child.stdout.on("data", (chunk: Buffer) => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const match = PROGRESS_RE.exec(line);
      if (match?.[1]) {
        callbacks.onProgress(Math.floor(parseFloat(match[1])));
      }

      // yt-dlp prints "[ExtractAudio] Destination: <path>" or "[download] Destination: <path>"
      const destMatch = /Destination:\s+(.+)$/.exec(line.trim());
      if (destMatch?.[1]) {
        outputPath = destMatch[1].trim();
      }
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      callbacks.onDone(outputPath);
    } else {
      callbacks.onError(stderrBuf || `yt-dlp exited with code ${String(code)}`);
    }
  });

  return {
    pid: child.pid,
    kill: () => child.kill(),
  };
}

function buildMp4Format(quality: string | undefined): string {
  switch (quality) {
    case "1080p":
      return "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
    case "720p":
      return "bestvideo[height<=720]+bestaudio/best[height<=720]";
    case "480p":
      return "bestvideo[height<=480]+bestaudio/best[height<=480]";
    default:
      return "bestvideo+bestaudio/best";
  }
}
