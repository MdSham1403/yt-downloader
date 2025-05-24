import { useState } from "react";
import axios from "axios";
import "./Home.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const [formats, setFormats] = useState([]);
  const [thumbnail, setThumbnail] = useState("");
  const [title, setTitle] = useState("");  // New state for video title
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState(0);

  const isValidYouTubeUrl = (inputUrl) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(inputUrl);
  };

  const fetchFormats = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setError("Invalid URL. Please enter a valid YouTube video link.");
      return;
    }

    // Refresh state when fetching new video details
    setFormats([]);
    setThumbnail("");
    setTitle("");    // Clear title when fetching new video
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:5000/video-details", { url });
      const allFormats = response.data.qualities || [];
      const filteredFormats = allFormats.filter(
        (format) => format.size !== "Unknown" && /^[0-9]+p$/.test(format.quality)
      );
      setFormats(filteredFormats);
      setThumbnail(response.data.thumbnail || "");
      setTitle(response.data.title || "video");  // Set title from backend response
    } catch (err) {
      setError("Failed to fetch formats. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async (formatId) => {
    setDownloading(formatId);
    setProgress(0);

    try {
      const response = await fetch("http://127.0.0.1:5000/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, video_format: formatId }),
      });

      const reader = response.body.getReader();
      const contentLength = +response.headers.get("Content-Length") || 100000000; // fallback if not provided
      let receivedLength = 0;
      let chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        setProgress(Math.round((receivedLength / contentLength) * 100));
      }

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // Use title as filename and sanitize for invalid chars
      const safeTitle = title.replace(/[^a-z0-9_\- ]/gi, "").trim() || "video";
      a.download = `${safeTitle}.mp4`;

      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      setError("Download failed.");
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
        <button className="fetch-button" onClick={fetchFormats} disabled={loading || !url.trim()}>
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
            {formats.map((format) => (
              <tr key={format.quality}>
                <td>{format.quality}p</td>
                <td>{format.size} MB</td>
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
