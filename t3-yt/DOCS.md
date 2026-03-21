# YTSave — Technical Documentation

## Overview

YTSave is a full-stack YouTube downloader web app built on the T3 Stack. Users paste a YouTube URL into the browser, the server fetches video metadata, spawns a background download process, and streams the completed file back to the browser when ready. The entire stack is type-safe from the database to the UI.

---

## Technology Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| **Next.js 15** | App Router | Page routing, React Server Components, and API Route Handlers for file streaming |
| **React 19** | — | UI rendering with concurrent features and transitions |
| **TypeScript 5.8** | — | End-to-end type safety from tRPC schema definitions into React components |
| **Tailwind CSS 4** | — | Utility-first styling; all layout, spacing, and color is defined inline |
| **shadcn/ui** | — | Pre-built, accessible component library (Button, Input, Card, Progress, RadioGroup, Select, Badge). Components are copied into `src/components/ui/` and are fully owned by the project |

### Backend / Middleware

| Technology | Version | Role |
|---|---|---|
| **tRPC 11** | — | Type-safe remote procedure calls between the Next.js server and the React client. No REST endpoints, no manual type casting — input/output shapes are shared automatically |
| **TanStack React Query 5** | — | Client-side server-state management. Used here to poll `getJobStatus` every second during an active download |
| **Prisma 6** | ORM | Talks to the SQLite database. Provides a fully-typed client generated from the schema |
| **SQLite** | — | Local file-based database (`dev.db`). Stores `DownloadJob` records: URL, format, status, progress, output file path, and the PID of the spawned process |
| **NextAuth v5** | — | Authentication scaffolding (Discord OAuth). Not required for the core downloader but available for future features like per-user download history |
| **Zod** | — | Runtime schema validation. Validates URL format (must be a YouTube domain), format enum (`mp3`/`mp4`), and quality strings before they ever reach the server |

### External Binaries

| Binary | Role |
|---|---|
| **yt-dlp** | The download engine. Handles YouTube's format selection, DASH stream merging, rate limiting, and all the complexity of extracting video/audio from YouTube. Called via Node's `child_process` |
| **FFmpeg** | Audio/video processing. Used by yt-dlp to merge separate video and audio streams (YouTube serves them separately for resolutions above 480p) and to extract/convert audio to MP3 |

---

## Architecture Diagram

```
Browser
  │
  │  1. Paste URL → click Fetch
  ▼
tRPC mutation: getVideoInfo
  │
  │  yt-dlp --dump-json (no download)
  ▼
Server returns: { title, channel, duration, thumbnailUrl }
  │
  │  2. User picks format + quality → click Download
  ▼
tRPC mutation: startDownload
  │
  ├── Creates DownloadJob row in SQLite (status: "queued")
  ├── Spawns yt-dlp as background child process
  └── Returns { jobId } immediately
  │
  │  3. Client polls every 1 second
  ▼
tRPC query: getJobStatus({ jobId })
  │
  ├── Reads DownloadJob row → returns { status, progress }
  └── yt-dlp stdout updates DB as download progresses
  │
  │  4. status === "done"
  ▼
Browser renders "Save file" link → <a href="/api/download/<jobId>">
  │
  ▼
Next.js Route Handler: GET /api/download/[jobId]
  │
  ├── Reads outputPath from DB
  ├── Streams file via fs.createReadStream
  └── Sets Content-Disposition: attachment → browser Save dialog
```

---

## How a Download Works (Step by Step)

### Step 1 — URL Fetch (`getVideoInfo`)

When the user clicks **Fetch**, the client calls the `downloader.getVideoInfo` tRPC mutation with the pasted URL.

On the server:
1. Zod validates the URL is a proper YouTube domain (`youtube.com/watch` or `youtu.be/`)
2. `execYtDlpInfo()` in `src/lib/yt-dlp.ts` runs:
   ```
   yt-dlp --dump-json --no-download --no-playlist <url>
   ```
3. yt-dlp outputs a large JSON blob to stdout describing the video
4. The server parses `title`, `channel`, `duration`, and `thumbnail` from that JSON and returns them to the client
5. The UI renders the video info card

This step does **not** download anything — it only fetches metadata.

---

### Step 2 — Download Start (`startDownload`)

When the user clicks **Download**, the client calls `downloader.startDownload` with `{ url, format, quality }`.

On the server:
1. A `DownloadJob` row is created in SQLite with `status: "queued"`
2. An output directory is created: `os.tmpdir()/yt-dlp-jobs/<jobId>/`
3. `spawnYtDlpDownload()` spawns yt-dlp as a **non-blocking background process** using `child_process.spawn`
4. The `jobId` is returned to the client immediately — the download continues in the background

**MP3 command built:**
```
yt-dlp --no-playlist --newline --progress
       --extract-audio --audio-format mp3
       --ffmpeg-location <path>
       -o "<tmpdir>/<jobId>/%(title)s.%(ext)s"
       <url>
```

**MP4 command built:**
```
yt-dlp --no-playlist --newline --progress
       -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
       --merge-output-format mp4
       --ffmpeg-location <path>
       -o "<tmpdir>/<jobId>/%(title)s.%(ext)s"
       <url>
```

---

### Step 3 — Progress Tracking (polling)

While the download runs in the background:

1. The client enables React Query polling: `refetchInterval: 1000` on `getJobStatus`
2. Every 1 second, the client calls `downloader.getJobStatus({ jobId })`
3. The server does a simple `db.downloadJob.findUnique` and returns `{ status, progress }`

Meanwhile on the server, the spawned yt-dlp process writes lines like this to stdout:
```
[download]  47.3% of 45.23MiB at  2.50MiB/s ETA 00:17
```

A regex (`/\[download\]\s+([\d.]+)%/`) parses the percentage and writes it to the database:
```ts
db.downloadJob.update({ where: { id }, data: { progress: 47 } })
```

yt-dlp also prints the output file path:
```
[download] Destination: /tmp/yt-dlp-jobs/<jobId>/Video Title.mp3
```

Another regex captures this and stores it as `outputPath` for later streaming.

---

### Step 4 — File Streaming (`GET /api/download/[jobId]`)

When yt-dlp exits with code `0`:
- DB is updated: `status: "done"`, `progress: 100`, `outputPath: "<full path>"`

The client detects `status === "done"` via the poll, stops polling, and shows a **Save file** button. This is a plain HTML anchor:
```html
<a href="/api/download/<jobId>" download>Save file</a>
```

When clicked, the browser hits the Next.js Route Handler at `src/app/api/download/[jobId]/route.ts`:
1. Looks up the `DownloadJob` in the database
2. Verifies `status === "done"` and `outputPath` exists on disk
3. Opens a read stream with `fs.createReadStream(outputPath)`
4. Returns a streaming `NextResponse` with headers:
   - `Content-Type: audio/mpeg` or `video/mp4`
   - `Content-Disposition: attachment; filename="<video title>.mp3"`
   - `Content-Length: <file size>`
5. The browser receives the stream and presents its native Save dialog

---

## Database Schema

```prisma
model DownloadJob {
    id           String   @id @default(cuid())
    url          String                        // Original YouTube URL
    format       String                        // "mp3" | "mp4"
    quality      String?                       // "best" | "1080p" | "720p" | "480p"
    status       String   @default("queued")   // queued → downloading → done | error | cancelled
    progress     Int      @default(0)          // 0–100
    outputPath   String?                       // Absolute path to completed file on disk
    errorMessage String?                       // Populated when status = "error"
    pid          Int?                          // PID of spawned yt-dlp process (for cancellation)
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    createdBy    User?    @relation(...)       // Optional: tied to authenticated user
    createdById  String?
}
```

**Status flow:**
```
queued → downloading → done
                    → error
                    → cancelled  (future)
```

---

## tRPC Router Reference

File: `src/server/api/routers/downloader.ts`

### `downloader.getVideoInfo` — mutation

Fetches video metadata without downloading.

| | |
|---|---|
| **Input** | `{ url: string }` — must match YouTube URL pattern |
| **Output** | `{ title, channel, durationSeconds, thumbnailUrl }` |
| **Errors** | `BAD_REQUEST` if yt-dlp fails or URL is invalid |

### `downloader.startDownload` — mutation

Creates a download job and starts the background process.

| | |
|---|---|
| **Input** | `{ url, format: "mp3" \| "mp4", quality?: "best" \| "1080p" \| "720p" \| "480p" }` |
| **Output** | `{ jobId: string }` |
| **Side effects** | Creates DB row, spawns yt-dlp process, writes PID to DB |

### `downloader.getJobStatus` — query

Reads the current state of a download job. Polled every second by the client.

| | |
|---|---|
| **Input** | `{ jobId: string }` |
| **Output** | `{ status, progress, errorMessage?, outputPath?, format }` |
| **Errors** | `NOT_FOUND` if jobId doesn't exist |

---

## File Structure

```
t3-yt/
├── prisma/
│   └── schema.prisma               # Database schema (DownloadJob + auth models)
├── src/
│   ├── app/
│   │   ├── _components/
│   │   │   ├── DownloaderWidget.tsx  # Root client component — owns all state
│   │   │   ├── Navbar.tsx            # Top navigation bar
│   │   │   ├── UrlInput.tsx          # URL text input + Fetch button
│   │   │   ├── VideoInfoCard.tsx     # Thumbnail + title + duration display
│   │   │   ├── FormatPicker.tsx      # MP3/MP4 radio + quality select
│   │   │   └── ProgressBar.tsx       # Progress bar + Done/Save actions
│   │   ├── api/
│   │   │   └── download/[jobId]/
│   │   │       └── route.ts          # File streaming GET endpoint
│   │   ├── layout.tsx                # Root layout (dark class, metadata)
│   │   └── page.tsx                  # Home page — renders Navbar + DownloaderWidget
│   ├── components/ui/                # shadcn/ui components (owned by project)
│   ├── lib/
│   │   ├── utils.ts                  # cn() helper from shadcn
│   │   └── yt-dlp.ts                 # execYtDlpInfo(), spawnYtDlpDownload()
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── downloader.ts     # Download procedures
│   │   │   │   └── post.ts           # Example T3 router (unused)
│   │   │   ├── root.ts               # Combines all routers
│   │   │   └── trpc.ts               # Context, publicProcedure, protectedProcedure
│   │   ├── auth/                     # NextAuth config
│   │   └── db.ts                     # Prisma client singleton
│   ├── trpc/
│   │   ├── react.tsx                 # Client-side tRPC + React Query provider
│   │   └── server.ts                 # Server-side tRPC caller
│   ├── styles/globals.css            # Tailwind + shadcn theme (dark + red)
│   └── env.js                        # Zod-validated environment variables
├── .env                              # Local secrets (gitignored)
├── .env.example                      # Template for new developers
├── README.md                         # Setup guide
└── DOCS.md                           # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_SECRET` | Prod only | — | NextAuth secret (generate with `npx auth secret`) |
| `AUTH_DISCORD_ID` | Yes | — | Discord OAuth app client ID |
| `AUTH_DISCORD_SECRET` | Yes | — | Discord OAuth app client secret |
| `DATABASE_URL` | Yes | `file:./dev.db` | Prisma SQLite connection string |
| `YTDLP_PATH` | No | `yt-dlp` | Full path to yt-dlp binary (if not on PATH) |
| `FFMPEG_PATH` | No | `ffmpeg` | Full path to ffmpeg binary (if not on PATH) |

---

## UI Component Tree

```
page.tsx (Server Component)
└── <Navbar />
└── <DownloaderWidget /> (Client Component — owns all state)
    ├── <UrlInput />          phase: idle → fetching_info
    ├── <VideoInfoCard />      phase: info_ready+
    ├── <FormatPicker />       phase: info_ready+
    ├── <Button> Download      phase: info_ready
    ├── <ProgressBar />        phase: downloading
    ├── <DoneActions />        phase: done
    └── <Badge> Error          phase: error
```

**State machine inside `DownloaderWidget`:**
```
idle
 └─[fetch URL]──► fetching_info
                   └─[success]──► info_ready
                   └─[error]───► error
                                  └─[reset]──► idle
info_ready
 └─[click Download]──► downloading
                        └─[status=done]──► done
                        └─[status=error]─► error
done
 └─[start over]──► idle
```

---

## Planned Future Features

### UX
- Download history page at `/history`
- Paste from clipboard button
- Toast notifications (Sonner)

### Functionality
- Playlist support — download full playlists or select individual tracks
- Audio bitrate picker (128k / 192k / 320k) for MP3
- Subtitle download alongside MP4
- Thumbnail embedding as album art in MP3 files
- Batch URL input — multiple URLs, zipped into one archive

### Infrastructure
- Server-Sent Events (SSE) to replace polling with real-time push progress
- Concurrency limit on simultaneous yt-dlp processes
- Automatic cleanup of temp files older than 1 hour
- Per-IP rate limiting on `startDownload`
- Docker Compose setup bundling the app + yt-dlp + ffmpeg
