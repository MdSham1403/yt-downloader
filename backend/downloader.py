import os
import shutil
import uuid
from yt_dlp import YoutubeDL

# Define download folder
DOWNLOAD_DIR = os.path.abspath("backend/temp")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def _safe_filename(title, ext="mp4"):
    """Generate a safe unique filename for downloads."""
    safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in title)
    unique_id = uuid.uuid4().hex[:6]
    return f"{safe_title}_{unique_id}.{ext}"


def _get_impersonate_target():
    """Safely detect available impersonate targets (no CLI)."""
    try:
        from yt_dlp.utils import list_impersonate_targets
        targets = list_impersonate_targets()
        if "chrome" in targets:
            return "chrome"
    except Exception:
        pass
    return "default"


def fetch_video_details(url, use_cookies=False):
    """Fetch video info and available qualities."""
    try:
        impersonate = _get_impersonate_target()

        options = {
            "quiet": True,
            "noplaylist": True,
            "format": "bestaudio/best",
            "skip_download": True,
            "retries": 10,
            "fragment_retries": 10,
            "socket_timeout": 30,
            "continuedl": True,
            "ignoreerrors": True,        }

        if use_cookies:
            options["cookiesfrombrowser"] = ("chrome",)

        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)

        if not info:
            return {"error": "Failed to retrieve video details."}

        formats = {}
        for fmt in info.get("formats", []):
            ext = fmt.get("ext")
            vcodec = fmt.get("vcodec")
            resolution = fmt.get("height")
            format_id = fmt.get("format_id")
            filesize = fmt.get("filesize") or fmt.get("filesize_approx", 0)

            if ext == "mp4" and vcodec != "none":
                quality_label = f"{resolution}p" if resolution else "Unknown"
                size = filesize / (1024 * 1024) if filesize else None

                if quality_label not in formats:
                    formats[quality_label] = {"largest": 0, "largest_id": None}

                if size and size > formats[quality_label]["largest"]:
                    formats[quality_label]["largest"] = size
                    formats[quality_label]["largest_id"] = format_id

        filtered_formats = [
            {
                "quality": q,
                "format": "MP4",
                "size": f"{round(d['largest'], 2)} MB" if d["largest"] else "Unknown",
                "format_id": d["largest_id"],
            }
            for q, d in formats.items() if d["largest_id"]
        ]

        sorted_formats = sorted(
            filtered_formats,
            key=lambda x: int(x["quality"].replace("p", "")) if x["quality"].replace("p", "").isdigit() else 0
        )

        return {
            "title": info.get("title", "Unknown Title"),
            "thumbnail": info.get("thumbnail", ""),
            "qualities": sorted_formats if sorted_formats else [{"error": "No available video formats."}],
        }

    except Exception as e:
        msg = str(e)
        if "cookies" in msg.lower() or "login" in msg.lower():
            return {"error": "This video may require login. Try again with cookies enabled."}
        return {"error": f"Failed to fetch details: {msg}"}


def download_video(url, video_format, audio_format="bestaudio",
                   progress_hook=None, use_cookies=False):
    """Download YouTube video and merge audio/video."""
    try:
        if not shutil.which("ffmpeg"):
            return {"error": "FFmpeg is not installed."}

        impersonate = _get_impersonate_target()

        # ✅ Clean temp folder before new download to prevent reuse issues
        for f in os.listdir(DOWNLOAD_DIR):
            file_path = os.path.join(DOWNLOAD_DIR, f)
            if os.path.isfile(file_path):
                os.remove(file_path)

        # Create a unique output name to avoid overwriting
        unique_name = uuid.uuid4().hex[:8]
        outtmpl = os.path.join(DOWNLOAD_DIR, f"%(title)s_{unique_name}.%(ext)s")

        ydl_opts = {
            "format": f"{video_format}+{audio_format}" if video_format != "bestaudio" else "bestaudio",
            "outtmpl": outtmpl,
            "merge_output_format": "mp4",
            "progress_hooks": [progress_hook] if progress_hook else [],
            "noplaylist": True,
            "quiet": True,
            "ignoreerrors": True,
            "retries": 10,
            "fragment_retries": 10,
            "socket_timeout": 60,
            "continuedl": True,
            }

        if use_cookies:
            ydl_opts["cookiesfrombrowser"] = ("chrome",)

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not info:
                return {"error": "Failed to download video."}

            downloaded_path = ydl.prepare_filename(info)

        # Ensure .mp4 extension
        if not downloaded_path.endswith(".mp4"):
            downloaded_path = downloaded_path.rsplit(".", 1)[0] + ".mp4"

        if not os.path.exists(downloaded_path):
            return {"error": "Downloaded file not found."}

        final_file = os.path.basename(downloaded_path)
        return {"message": "Download successful!", "filename": final_file}

    except Exception as e:
        msg = str(e)
        if "cookies" in msg.lower() or "login" in msg.lower():
            return {"error": "This video may require login. Enable cookies."}
        if "429" in msg:
            return {"error": "Too Many Requests (429). Try again later."}
        return {"error": f"Download failed: {msg}"}
