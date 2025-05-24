from flask import Flask, request, jsonify, send_file
import os
import threading
from flask_socketio import SocketIO
from flask_cors import CORS
from downloader import download_video, fetch_video_details

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173"]}})
socketio = SocketIO(app, cors_allowed_origins="*")

DOWNLOAD_FOLDER = "backend/temp"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

download_locks = {}  # Track active downloads


def progress_hook(d):
    if d['status'] == 'downloading':
        percent = d['_percent_str'].strip()
        socketio.emit('download_progress', {'progress': percent})


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "YouTube Downloader API is running!"})


@app.route('/video-details', methods=['POST'])
def video_details():
    data = request.get_json()
    video_url = data.get("url")

    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    result = fetch_video_details(video_url)
    return jsonify(result)


@app.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    url = data.get("url")
    video_format = data.get("video_format")
    audio_format = data.get("audio_format", "bestaudio")

    if not url:
        return jsonify({"error": "No URL provided"}), 400
    if not video_format:
        return jsonify({"error": "No video format selected"}), 400

    if url in download_locks and download_locks[url].locked():
        return jsonify({"error": "Download already in progress"}), 429

    download_locks[url] = threading.Lock()
    with download_locks[url]:
        result = download_video(url, video_format, audio_format, progress_hook)

        if "error" in result:
            return jsonify(result), 500

        filename = result["filename"]
        file_path = (
            filename if os.path.isabs(filename)
            else os.path.abspath(os.path.join(DOWNLOAD_FOLDER, filename))
        )

        print(f"File saved at: {file_path}")  # Debugging

        if not os.path.exists(file_path):
            print("ERROR: File not found!")  # Debugging
            return jsonify({"error": "File not found"}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,  # Ensures your custom filename is used,
            mimetype='application/octet-stream'
        )


if __name__ == "__main__":
    socketio.run(app, debug=True)
