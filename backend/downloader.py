import os
import shutil
from yt_dlp import YoutubeDL

DOWNLOAD_DIR = "temp"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def fetch_video_details(url):
    try:
        options = {
            'quiet': True,
            'noplaylist': True,
            'format': 'bestaudio/best',
            'skip_download': True
        }

        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)

        if not info:
            return {"error": "Failed to retrieve video details."}

        formats = {}

        for fmt in info.get("formats", []):
            resolution = fmt.get("height")
            format_id = fmt.get("format_id")
            ext = fmt.get("ext", "")
            filesize = fmt.get("filesize") or fmt.get("filesize_approx", 0)
            vcodec = fmt.get("vcodec", "")

            if ext == "mp4" and vcodec != "none":  # Skip audio-only formats
                quality_label = f"{resolution}p" if resolution else "Unknown"
                size = filesize / (1024 * 1024) if filesize else None

                if quality_label not in formats:
                    formats[quality_label] = {"unknown": None, "largest": 0, "largest_id": None}

                if size is None:
                    formats[quality_label]["unknown"] = format_id
                elif size > formats[quality_label]["largest"]:
                    formats[quality_label]["largest"] = size
                    formats[quality_label]["largest_id"] = format_id

        filtered_formats = []
        for quality, data in formats.items():
            if data["unknown"]:
                filtered_formats.append({
                    "quality": quality,
                    "format": "MP4",
                    "size": "Unknown",
                    "format_id": data["unknown"],
                    "label": "High Download"
                })
            if data["largest_id"]:
                filtered_formats.append({
                    "quality": quality,
                    "format": "MP4",
                    "size": f"{round(data['largest'], 2)} MB",
                    "format_id": data["largest_id"],
                    "label": "Good Download"
                })

        sorted_formats = sorted(
            filtered_formats,
            key=lambda x: int(x["quality"].replace("p", "")) if x["quality"].replace("p", "").isdigit() else 0
        )

        return {
            "title": info.get("title", "Unknown Title"),
            "thumbnail": info.get("thumbnail", ""),
            "qualities": sorted_formats if sorted_formats else [{"error": "No available video formats."}]
        }

    except Exception as e:
        return {"error": f"Failed to fetch details: {str(e)}"}


def download_video(url, video_format, audio_format="bestaudio", progress_hook=None):
    try:
        if not shutil.which("ffmpeg"):
            return {"error": "FFmpeg is not installed. Please install it to merge video and audio."}

        # Step 1: Get info to extract title and resolution
        info_opts = {
            "quiet": True,
            "skip_download": True,
            "format": f"{video_format}+{audio_format}" if video_format != "bestaudio" else "bestaudio"
        }

        with YoutubeDL(info_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        video_title = info.get("title", "video")
        video_format_detail = next((f for f in info["formats"] if f["format_id"] == video_format), None)
        resolution = f'{video_format_detail.get("height", "unknown")}p' if video_format_detail else "unknown"

        # Sanitize title and add resolution
        safe_title = "".join(c if c.isalnum() or c in " _-()" else "_" for c in video_title)
        output_filename = f"{safe_title}_{resolution}.%(ext)s"

        ydl_opts = {
            "format": f"{video_format}+{audio_format}" if video_format != "bestaudio" else "bestaudio",
            "outtmpl": os.path.join(DOWNLOAD_DIR, output_filename),
            "merge_output_format": "mp4",
            "progress_hooks": [progress_hook] if progress_hook else [],
            "postprocessors": [{
                "key": "FFmpegVideoConvertor",
                "preferedformat": "mp4",
            }]
        }

        with YoutubeDL(ydl_opts) as ydl:
            final_info = ydl.extract_info(url, download=True)
            downloaded_path = ydl.prepare_filename(final_info)

        filename_only = os.path.basename(downloaded_path)

        return {"message": "Download successful!", "filename": filename_only}

    except Exception as e:
        return {"error": f"Download failed: {str(e)}"}
