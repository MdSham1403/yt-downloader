import React, { useState } from "react";

const VideoInfo = ({ videoDetails }) => {
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  if (!videoDetails) {
    return <p className="message">Enter a YouTube URL to fetch video details.</p>;
  }

  const handleDownload = async (formatId, format) => {
    if (downloadingFormat) return; // Prevent multiple downloads

    setDownloadingFormat(formatId);

    try {
      const response = await fetch("http://localhost:5000/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: videoDetails.url,
          video_format: formatId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start download");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${videoDetails.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingFormat(null);
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
            </tr>
          </thead>
          <tbody>
            {videoDetails.qualities.map((quality, index) => (
              <tr key={index}>
                <td>{quality.quality}</td>
                <td>{quality.format}</td>
                <td>{quality.size || "Unknown"}</td>
                <td>
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(quality.format_id, quality.format)}
                    disabled={downloadingFormat === quality.format_id}
                  >
                    {downloadingFormat === quality.format_id ? "Downloading..." : "Download"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoInfo;
