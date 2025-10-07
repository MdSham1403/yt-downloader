from flask import Flask, request, jsonify, send_file
import os
from flask_socketio import SocketIO
from flask_cors import CORS
from downloader import download_video, fetch_video_details  # updated downloader

# Initialize Flask
app = Flask(__name__)

# CORS: allow all origins for development
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Folder to save downloaded videos
DOWNLOAD_FOLDER = os.path.abspath("backend/temp")
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)


# Progress hook for SocketIO
def progress_hook(d):
    if d["status"] == "downloading":
        percent = d.get("_percent_str", "0%").strip()
        socketio.emit("download_progress", {"progress": percent})


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "YouTube Downloader API is running!"})


@app.route("/video-details", methods=["POST"])
def video_details():
    data = request.get_json()
    video_url = data.get("url")
    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        result = fetch_video_details(video_url)
        result["url"] = video_url  # Include original URL for frontend
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch video details: {str(e)}"}), 500


@app.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    url = data.get("url")
    video_format = data.get("video_format")
    audio_format = data.get("audio_format", "bestaudio")

    if not url or not video_format:
        return jsonify({"error": "Missing URL or video format"}), 400

    # Run download directly (no threading, so Flask can return the file)
    result = download_video(
        url,
        video_format,
        audio_format,
        progress_hook=progress_hook,
    )

    if "error" in result:
        return jsonify(result), 500

    filename = result.get("filename")
    if not filename:
        return jsonify({"error": "Download failed, file not found."}), 500

    file_path = os.path.join(DOWNLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found after download."}), 404

    # 👇 Send file directly to browser (triggers Chrome's download dialog)
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/octet-stream",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
