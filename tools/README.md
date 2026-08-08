# Optional media acquisition tool

CUTS does not install or download yt-dlp automatically.

For YouTube, Vimeo, and similar platform page URLs, place the official Windows standalone executable at:

```text
tools/yt-dlp.exe
```

Alternatively, set `CUTS_YTDLP_PATH` to an explicitly chosen executable.

The CUTS wrapper invokes it without a shell, ignores user/global yt-dlp configuration, disables playlists, limits file size, and requests a single pre-merged video/audio format so no external FFmpeg installation is required. If the platform does not offer a suitable combined format, acquisition fails explicitly.

Download releases only from the official project:

https://github.com/yt-dlp/yt-dlp/releases
