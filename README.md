# mView Sentinel — The Ultimate Linux NVR Server

<div align="center">
  <img src="https://raw.githubusercontent.com/merlinthedev848/mview/main/docs/mockups/logo.png" alt="mView Sentinel Logo" width="600"/>
  <br/>
  <strong>Professional-grade, open-source Video Management System with Hardware AI.</strong>
</div>

---

## 🚀 One-Command Install (Linux)

To deploy mView Sentinel on any Ubuntu/Debian system, run:

```bash
curl -sSL https://raw.githubusercontent.com/merlinthedev848/mview/main/install.sh | bash
```

The installer will automatically:
- Install Docker and Docker Compose (if missing).
- Detect your hardware (NVIDIA GPU, Intel CPU, Google Coral TPU).
- Create persistent storage volumes in `/mnt/storage/mview`.
- Boot the cluster!

**Dashboard URL:** `http://localhost:5173`
**API URL:** `http://localhost:8000`

---

## ✨ Killer Features

- 🧠 **Semantic Search:** Find clips using natural language (e.g., *"Person in a red jacket"*).
- 👤 **Face Recognition:** Powered by InsightFace and `pgvector`.
- ⚡ **Lightning Fast Live View:** Sub-second WebRTC streaming via `go2rtc` multiplexing.
- 🏎️ **Hardware AI:** YOLOv8/11 object detection running on NVIDIA CUDA/TensorRT, Intel OpenVINO, or Google Coral EdgeTPU.
- 💾 **Zero-Copy Recording:** Highly optimized Rust engine writes MP4 segments direct to disk without CPU-heavy re-encoding.
- 🏠 **Home Assistant Native:** Automatic MQTT discovery for cameras and AI motion sensors.
- 🎨 **Premium React UI:** Glassmorphism, dark mode, smooth animations, customizable camera grids, and a scrubbing playback timeline.

---

## 🏗️ Architecture

mView Sentinel is built as a highly scalable microservice stack:
1. **Frontend:** React + Vite + TypeScript
2. **Backend API:** Python FastAPI + JWT Auth
3. **Database:** PostgreSQL + TimescaleDB + `pgvector`
4. **Recording Engine:** Rust + FFmpeg
5. **AI Detection:** Python (Ultralytics YOLO, ByteTrack, CLIP, InsightFace)
6. **Stream Proxy:** go2rtc (WebRTC/MSE/HLS)

## 📸 Screenshots

*(Mock screenshots of the visually stunning React UI go here)*

## 📄 License
MIT License. 100% Free and Open Source. No camera fees. No cloud subscriptions.
