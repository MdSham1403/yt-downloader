import { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./Home.css";

const BACKEND_URL = "http://localhost:5000"; // Change to hosted URL in production
const socket = io(BACKEND_URL);

export default function Home() {
  const [url, setUrl] = useState("");
  const [formats, setFormats] = useState([]);
  const [thumbnail, setThumbnail] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    socket.on("download_progress", (data) => {
      setProgress(parseInt(data.progress) || 0);
    });
    return () => socket.off("download_progress");
  }, []);

  const isValidYouTubeUrl = (inputUrl) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(inputUrl);

  const fetchFormats = async () => {
    if (!url.trim()) return setError("Please enter a YouTube URL.");
    if (!isValidYouTubeUrl(url)) return setError("Invalid YouTube URL.");

    setFormats([]);
    setThumbnail("");
    setTitle("");
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/video-details`, { url });
      const data = response.data;

      if (data.error) {
        setError(data.error);
        return;
      }

      setFormats(data.qualities || []);
      setThumbnail(data.thumbnail || "");
      setTitle(data.title || "video");
    } catch (err) {
      setError("Failed to fetch video details. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async (formatId) => {
    setDownloading(formatId);
    setProgress(0);
    setError(null);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/download`,
        { url, video_format: formatId, download_subtitles: true }, // ✅ always embed subtitles
        { responseType: "blob" }
      );

      const blob = new Blob([response.data]);
      const safeTitle = title.replace(/[^a-z0-9_\- ]/gi, "").trim() || "video";
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${safeTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(null);
      setProgress(0);
    }
  };

  return (
    <div className="container">
      <h1 className="title">YouTube Video Downloader</h1>

      <div className="form-container">
        <input
          type="text"
          placeholder="Enter YouTube URL"
          className="input-field"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="fetch-button"
          onClick={fetchFormats}
          disabled={loading || !url.trim()}
        >
          {loading ? "Fetching..." : "Get Video Quality"}
        </button>
      </div>

      {thumbnail && (
        <div className="thumbnail-container">
          <img src={thumbnail} alt="Video Thumbnail" />
        </div>
      )}

      {formats.length > 0 && (
        <table className="quality-table">
          <thead>
            <tr>
              <th>Quality</th>
              <th>Size</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {formats.map((format, index) => (
              <tr key={`${format.format_id}-${index}`}>
                <td>{format.quality}</td>
                <td>{format.size || "Unknown"}</td>
                <td>
                  <button
                    className="download-button"
                    onClick={() => downloadVideo(format.format_id)}
                    disabled={downloading === format.format_id}
                  >
                    {downloading === format.format_id
                      ? `Downloading... ${progress}%`
                      : "Download"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}