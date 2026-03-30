# YTSave

A YouTube MP3/MP4 downloader web app built with the T3 Stack. Paste a YouTube URL, preview the video, pick a format and quality, and download the file directly to your computer.

---

## Features

- Paste any YouTube video URL and preview title, channel, duration, and thumbnail
- Download as **MP3** (audio only) or **MP4** (video)
- MP4 quality selector: Best, 1080p, 720p, 480p
- Real-time download progress bar
- Dark theme with YouTube red accents

---

## Tech Stack

- **Next.js 15** — Full-stack React framework
- **tRPC** — Type-safe API layer
- **Prisma + SQLite** — Database for tracking download jobs
- **yt-dlp** — YouTube download engine (system binary)
- **FFmpeg** — Audio/video processing (system binary)
- **shadcn/ui + Tailwind CSS** — UI components and styling

> See [DOCS.md](./DOCS.md) for a full breakdown of the architecture and how everything works.

---

## Local Setup

### Prerequisites

You need the following installed before running the app:

**1. Node.js** (v18 or later)
- Download from [nodejs.org](https://nodejs.org)

**2. yt-dlp**
```bash
# Via pip (recommended)
pip install yt-dlp

# Or via winget (Windows)
winget install yt-dlp.yt-dlp
```

**3. FFmpeg**
```bash
# Windows (via winget)
winget install Gyan.FFmpeg

# macOS (via Homebrew)
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg
```

Verify both are working:
```bash
yt-dlp --version
ffmpeg -version
```

---

### Installation

**1. Clone the repo**
```bash
git clone <your-repo-url>
cd t3-yt
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Copy the example env file:
```bash
cp .env.example .env
```

Edit `.env` and fill in the values:
```env
# Required for NextAuth (run: npx auth secret)
AUTH_SECRET="your-secret-here"

# Discord OAuth (create an app at discord.com/developers)
AUTH_DISCORD_ID=""
AUTH_DISCORD_SECRET=""

# Database (SQLite — no changes needed)
DATABASE_URL="file:./dev.db"

# Binary paths — defaults work if yt-dlp and ffmpeg are on PATH
YTDLP_PATH="yt-dlp"
FFMPEG_PATH="ffmpeg"

# Windows example (if not on PATH):
# FFMPEG_PATH="C:\\Users\\YourName\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_...\\ffmpeg.exe"
```

**4. Set up the database**
```bash
npm run db:push
```

**5. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Exposing with Cloudflare Tunnel

To make your local dev server accessible over the internet (e.g., for testing on other devices or sharing a demo), you can use `cloudflared` to create a quick tunnel.

### Install cloudflared

```bash
# Windows (via winget)
winget install Cloudflare.cloudflared

# macOS (via Homebrew)
brew install cloudflared

# Linux (Debian/Ubuntu)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

Verify it's installed:
```bash
cloudflared --version
```

### Quick tunnel (no Cloudflare account needed)

This creates a temporary public URL that proxies to your local dev server:

```bash
# Make sure your dev server is running first
npm run dev

# In a second terminal, start the tunnel
cloudflared tunnel --url http://localhost:3000
```

`cloudflared` will output a public URL like `https://random-words.trycloudflare.com`. Anyone with the link can access your app while the tunnel is running. The URL changes each time you restart the tunnel.

### Named tunnel (requires Cloudflare account)

For a persistent subdomain on your own domain:

**1. Authenticate**
```bash
cloudflared tunnel login
```
This opens a browser to authorize `cloudflared` with your Cloudflare account.

**2. Create a named tunnel**
```bash
cloudflared tunnel create ytsave
```
This generates a tunnel ID and a credentials file at `~/.cloudflared/<tunnel-id>.json`.

**3. Configure the tunnel**

Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: /path/to/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: ytsave.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**4. Add a DNS record**
```bash
cloudflared tunnel route dns ytsave ytsave.yourdomain.com
```

**5. Run the tunnel**
```bash
cloudflared tunnel run ytsave
```

Your app is now available at `https://ytsave.yourdomain.com`.

> **Note:** The quick tunnel is ideal for hackathon demos and quick testing. Use a named tunnel if you need a stable URL.

---

## Database Management

```bash
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:push      # Sync schema changes to the database
npm run db:migrate   # Run migrations (production)
```

---

## Project Structure

```
src/
├── app/
│   ├── _components/        # UI components (DownloaderWidget, UrlInput, etc.)
│   ├── api/
│   │   └── download/[jobId]/route.ts   # File streaming endpoint
│   └── page.tsx            # Main page
├── components/ui/          # shadcn/ui components
├── lib/
│   └── yt-dlp.ts           # Shell-out helpers for yt-dlp and FFmpeg
├── server/
│   ├── api/routers/
│   │   └── downloader.ts   # tRPC router (getVideoInfo, startDownload, getJobStatus)
│   └── db.ts               # Prisma client
└── env.js                  # Environment variable validation
```
