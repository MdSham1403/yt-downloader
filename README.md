# YouTube Video Downloader

This project is a full-stack YouTube video downloader application with a React-based frontend and Flask backend using `yt-dlp` for video extraction and download.

---

## Features

- Extract video details and available formats
- Download video + audio merged as MP4
- Supports multiple video qualities
- Real-time download progress (via Flask-SocketIO)
- Simple React frontend UI for user interaction

---

## Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO, yt-dlp, moviepy
- **Frontend:** React, Vite
- **Others:** FFmpeg (required for merging audio and video)

---

## Setup Instructions

### Backend

1. Navigate to backend directory:

```bash
cd backend
```
### Create and activate a virtual environment:

```bash
python -m venv venv
# On Linux/macOS
source venv/bin/activate
# On Windows
venv\Scripts\activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Make sure FFmpeg is installed and available in your system PATH.
Run the Flask app:
```bash
python app.py
```
