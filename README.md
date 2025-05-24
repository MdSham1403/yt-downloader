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
2. Create and activate a virtual environment:

```bash
python -m venv venv
# On Linux/macOS
source venv/bin/activate
# On Windows
venv\Scripts\activate
```
3. Install dependencies:
```bash
pip install -r requirements.txt
```
4. Make sure FFmpeg is installed and available in your system PATH.
5. Run the Flask app:
```bash
python app.py
```
### Frontend
1. Navigate to frontend directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```
---

## Usage
*Enter a YouTube video URL on the frontend.
*Choose desired video quality.
*Click download and wait for the video to be processed and downloaded.

## Notes
Make sure FFmpeg is installed to enable video/audio merging.

Downloaded files are saved temporarily in backend/temp/.

## License
## MIT License

## Author
## MdSham1403
