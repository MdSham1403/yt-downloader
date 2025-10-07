import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const BACKEND_URL = "http://localhost:5000"; // Change to deployed URL for production
const socket = io(BACKEND_URL);

const VideoInfo = ({ videoDetails }) => {
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    socket.on("download_progress", (data) => {
      setProgress(parseInt(data.progress) || 0);
    });
    return () => socket.off("download_progress");
  }, []);

  if (!videoDetails) {
    return <p className="message">Enter a YouTube URL to fetch video details.</p>;
  }

  const handleDownload = async (formatId) => {
    if (downloadingFormat) return;

    setDownloadingFormat(formatId);
    setProgress(0);

    try {
      const response = await fetch(`${BACKEND_URL}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: videoDetails.url,
          video_format: formatId,
          download_subtitles: true, // ✅ allow subtitles if available
        }),
      });

      if (!response.ok) throw new Error("Failed to start download");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      // Sanitize title for safe filename
      const safeTitle =
        videoDetails.title.replace(/[^a-z0-9_\- ]/gi, "").trim() || "video";

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${safeTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingFormat(null);
      setProgress(0);
    }
  };

  return (
    <div className="video-info-container">
      <h2 className="video-title">{videoDetails.title}</h2>
      <img className="thumbnail" src={videoDetails.thumbnail} alt="Thumbnail" />

      <div className="quality-container">
        <table className="quality-table">
          <thead>
            <tr>
              <th>Quality</th>
              <th>Format</th>
              <th>Size</th>
              <th>Download</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {(videoDetails.qualities || videoDetails.formats || []).map(
              (quality, index) => (
                <tr key={`${quality.format_id}-${index}`}>
                  <td>{quality.quality}</td>
                  <td>{quality.format}</td>
                  <td>{quality.size || "Unknown"}</td>
                  <td>
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(quality.format_id)}
                      disabled={downloadingFormat === quality.format_id}
                    >
                      {downloadingFormat === quality.format_id
                        ? `Downloading...`
                        : "Download"}
                    </button>
                  </td>
                  <td>
                    {downloadingFormat === quality.format_id
                      ? `${progress}%`
                      : "-"}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {videoDetails.subtitles && videoDetails.subtitles.length > 0 && (
        <div className="subtitles-section">
          <h3>Available Subtitles</h3>
          <ul>
            {videoDetails.subtitles.map((sub, i) => (
              <li key={i}>
                <a href={sub.url} target="_blank" rel="noreferrer">
                  {sub.language} ({sub.ext})
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoInfo;
