"""
Recorder Service — FFmpeg-based 24/7 recording engine.

For each enabled camera, spawns an ffmpeg process that:
  - Reads the RTSP stream (video + audio)
  - Segments recordings into short MP4 files under /recordings/{camera_id}/
  - Auto-restarts on stream drop (with backoff)
"""

import asyncio
import logging
import os
import re
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("mView-Recorder")

RECORDINGS_BASE = Path(os.environ.get("RECORDINGS_DIR", "/mnt/storage/mview/recordings"))
SEGMENT_DURATION = int(os.environ.get("SEGMENT_SECONDS") or (int(os.environ.get("SEGMENT_MINUTES", "1")) * 60))
RECORD_SUBSTREAM_DEFAULT = os.environ.get("RECORD_SUBSTREAM_DEFAULT", "false").lower() in {"1", "true", "yes", "on"}
RECORD_VIDEO_CODEC = os.environ.get("RECORD_VIDEO_CODEC", "copy").lower()
RECORD_VIDEO_CRF = os.environ.get("RECORD_VIDEO_CRF", "30")
RECORD_VIDEO_PRESET = os.environ.get("RECORD_VIDEO_PRESET", "veryfast")


class CameraRecorder:
    def __init__(self, camera_id: str, camera_name: str, rtsp_url: str):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.rtsp_url = rtsp_url
        self._task: asyncio.Task | None = None
        self._stop = False

    def start(self):
        self._stop = False
        self._task = asyncio.create_task(self._run_loop(), name=f"recorder-{self.camera_id}")

    def stop(self):
        self._stop = True
        if self._task:
            self._task.cancel()

    async def _run_loop(self):
        backoff = 5
        while not self._stop:
            try:
                await self._record_once()
                backoff = 5  # reset on clean exit
            except asyncio.CancelledError:
                logger.info(f"[{self.camera_name}] Recorder cancelled.")
                return
            except Exception as e:
                logger.warning(f"[{self.camera_name}] Recorder error: {e}. Retrying in {backoff}s…")
            if not self._stop:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 120)

    async def _record_once(self):
        output_dir = RECORDINGS_BASE / self.camera_id
        output_dir.mkdir(parents=True, exist_ok=True)

        # Output pattern: 2024-01-15_14-00-00.mp4
        output_pattern = str(output_dir / "%Y-%m-%d_%H-%M-%S.mp4")

        # Probe the stream dynamically to detect valid audio
        has_audio = False
        try:
            probe_cmd = [
                "ffprobe",
                "-v", "error",
                "-rtsp_transport", "tcp",
                "-stimeout", "8000000",
                "-show_entries", "stream=codec_type,codec_name",
                "-of", "json",
                self.rtsp_url
            ]
            probe_proc = await asyncio.create_subprocess_exec(
                *probe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(probe_proc.communicate(), timeout=8.0)
            if probe_proc.returncode == 0:
                import json
                data = json.loads(stdout.decode())
                for stream in data.get("streams", []):
                    if stream.get("codec_type") == "audio":
                        codec = stream.get("codec_name")
                        if codec and codec != "none":
                            has_audio = True
                            logger.info(f"[{self.camera_name}] Detected audio stream with codec: {codec}")
        except Exception as e:
            logger.warning(f"[{self.camera_name}] ffprobe stream analysis timed out or failed: {e}. Defaulting to video-only.")

        cmd = [
            "ffmpeg",
            "-loglevel", "warning",
            "-analyzeduration", "10000000",
            "-probesize", "10000000",
            "-rtsp_transport", "tcp",
            "-i", self.rtsp_url,
            "-map", "0:v",                     # Always map the video stream
            "-c:v", "copy",                    # Copy video stream — zero transcoding, zero quality loss
        ]

        if RECORD_VIDEO_CODEC == "libx264":
            video_codec_index = cmd.index("-c:v")
            cmd[video_codec_index:video_codec_index + 2] = [
                "-c:v", "libx264",
                "-preset", RECORD_VIDEO_PRESET,
                "-crf", RECORD_VIDEO_CRF,
                "-pix_fmt", "yuv420p",
                "-profile:v", "main",
                "-g", "50",
            ]

        if has_audio:
            cmd.extend([
                "-map", "0:a",                 # Map the audio stream
                "-c:a", "aac",                 # Encode audio to AAC
                "-b:a", "128k",
            ])
        else:
            cmd.append("-an")                  # Disable audio if absent or invalid

        cmd.extend([
            "-ignore_unknown",                 # Skip unknown stream types instead of crashing
            "-f", "segment",
            "-segment_time", str(SEGMENT_DURATION),
            "-segment_format", "mp4",
            "-segment_format_options", "movflags=+faststart",
            "-reset_timestamps", "1",
            "-strftime", "1",
            "-movflags", "+faststart",         # Web-optimised MP4 — can play before fully downloaded
            output_pattern,
        ])

        logger.info(f"[{self.camera_name}] Starting ffmpeg recording → {output_dir}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await proc.communicate()

        if proc.returncode not in (0, 255):  # 255 = SIGTERM (normal stop)
            err = stderr.decode(errors="replace") if stderr else "unknown"
            raise RuntimeError(f"ffmpeg exited {proc.returncode}: {err[-300:]}")

        logger.info(f"[{self.camera_name}] ffmpeg segment completed normally.")


async def register_go2rtc_stream(name: str, rtsp_url: str):
    import httpx
    for attempt in range(1, 6):
        try:
            async with httpx.AsyncClient() as client:
                res = await client.put(
                    "http://127.0.0.1:1984/api/streams",
                    params={"name": name, "src": rtsp_url},
                    timeout=2.0
                )
                if res.status_code == 200:
                    logger.info(f"Successfully registered stream {name} in go2rtc (attempt {attempt})")
                    return
                else:
                    logger.warning(f"Failed to register stream {name} in go2rtc: {res.status_code} {res.text} (attempt {attempt})")
        except Exception as e:
            if attempt == 5:
                logger.warning(f"Could not connect to go2rtc API to register stream (attempt {attempt}/5): {e}")
        if attempt < 5:
            await asyncio.sleep(2.0)


async def delete_go2rtc_stream(name: str):
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            res = await client.delete("http://127.0.0.1:1984/api/streams", params={"name": name})
            if res.status_code == 200:
                logger.info(f"Successfully deleted stream {name} from go2rtc")
            else:
                logger.warning(f"Failed to delete stream {name} from go2rtc: {res.status_code} {res.text}")
    except Exception as e:
        logger.warning(f"Could not connect to go2rtc API to delete stream: {e}")


class RecorderManager:
    def __init__(self):
        self._recorders: dict[str, CameraRecorder] = {}

    async def sync_cameras(self, cameras: list):
        """
        Called at startup and whenever cameras change.
        Starts recording for every enabled camera with an RTSP URL,
        stops recording for cameras that have been removed.
        """
        current_ids = {cam.id for cam in cameras if cam.enabled and cam.rtsp_url_main}

        # Stop removed cameras
        for cid in list(self._recorders.keys()):
            if cid not in current_ids:
                logger.info(f"Stopping recorder for removed camera {cid}")
                self._recorders.pop(cid).stop()
                asyncio.create_task(delete_go2rtc_stream(cid))
                asyncio.create_task(delete_go2rtc_stream(f"{cid}_main"))
                asyncio.create_task(delete_go2rtc_stream(f"{cid}_sub"))

        # Start new or update changed cameras
        for cam in cameras:
            if cam.enabled and cam.rtsp_url_main:
                # Prefer substream for storage savings when enabled globally or per camera.
                use_substream = RECORD_SUBSTREAM_DEFAULT
                if cam.config and "record_substream" in cam.config:
                    use_substream = cam.config.get("record_substream") is True
                record_url = cam.rtsp_url_sub if (use_substream and cam.rtsp_url_sub) else cam.rtsp_url_main
                
                if cam.id not in self._recorders:
                    rec = CameraRecorder(cam.id, cam.name, record_url)
                    self._recorders[cam.id] = rec
                    rec.start()
                    logger.info(f"Started recorder for [{cam.name}] → {record_url}")
                    live_url = cam.rtsp_url_sub or cam.rtsp_url_main
                    asyncio.create_task(register_go2rtc_stream(cam.id, live_url))
                    asyncio.create_task(register_go2rtc_stream(f"{cam.id}_main", cam.rtsp_url_main))
                    if cam.rtsp_url_sub:
                        asyncio.create_task(register_go2rtc_stream(f"{cam.id}_sub", cam.rtsp_url_sub))
                else:
                    existing = self._recorders[cam.id]
                    if existing.rtsp_url != record_url or existing.camera_name != cam.name:
                        logger.info(f"Updating recorder for [{cam.name}] due to configuration change...")
                        existing.stop()
                        rec = CameraRecorder(cam.id, cam.name, record_url)
                        self._recorders[cam.id] = rec
                        rec.start()
                        live_url = cam.rtsp_url_sub or cam.rtsp_url_main
                        asyncio.create_task(register_go2rtc_stream(cam.id, live_url))
                        asyncio.create_task(register_go2rtc_stream(f"{cam.id}_main", cam.rtsp_url_main))
                        if cam.rtsp_url_sub:
                            asyncio.create_task(register_go2rtc_stream(f"{cam.id}_sub", cam.rtsp_url_sub))

    def stop_all(self):
        for rec in self._recorders.values():
            rec.stop()
        self._recorders.clear()

    def status(self) -> dict:
        return {cid: "recording" for cid in self._recorders}


recorder_manager = RecorderManager()


def list_recordings(camera_id: str | None = None) -> list[dict]:
    """Return a list of recording files, optionally filtered by camera."""
    results = []
    base = RECORDINGS_BASE
    if not base.exists():
        return results

    cam_dirs = [base / camera_id] if camera_id else [d for d in base.iterdir() if d.is_dir()]

    for cam_dir in cam_dirs:
        if not cam_dir.exists():
            continue
        for f in sorted(cam_dir.glob("*.mp4"), reverse=True):
            stat = f.stat()
            age_seconds = (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).total_seconds()
            if stat.st_size == 0 or age_seconds < 12:
                continue
            results.append({
                "camera_id": cam_dir.name,
                "filename": f.name,
                "path": str(f),
                "size_mb": round(stat.st_size / 1_048_576, 1),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "url": f"/recordings/{cam_dir.name}/{f.name}",
            })
    return results


def storage_report() -> dict:
    """Return per-camera recording storage usage and simple retention estimates."""
    base = RECORDINGS_BASE
    now = datetime.now()
    report = {
        "segment_seconds": SEGMENT_DURATION,
        "record_substream_default": RECORD_SUBSTREAM_DEFAULT,
        "cameras": [],
        "total_gb": 0.0,
        "estimated_gb_per_day": 0.0,
    }
    if not base.exists():
        return report

    total_bytes = 0
    total_day_bytes = 0
    for cam_dir in sorted([d for d in base.iterdir() if d.is_dir()]):
        files = []
        cam_bytes = 0
        day_bytes = 0
        latest = None
        for f in cam_dir.glob("*.mp4"):
            try:
                stat = f.stat()
            except OSError:
                continue
            mtime = datetime.fromtimestamp(stat.st_mtime)
            cam_bytes += stat.st_size
            if (now - mtime).total_seconds() <= 24 * 3600:
                day_bytes += stat.st_size
            latest = max(latest, mtime) if latest else mtime
            files.append(stat.st_size)

        total_bytes += cam_bytes
        total_day_bytes += day_bytes
        report["cameras"].append({
            "camera_id": cam_dir.name,
            "files": len(files),
            "total_gb": round(cam_bytes / 1_073_741_824, 2),
            "last_24h_gb": round(day_bytes / 1_073_741_824, 2),
            "avg_segment_mb": round((sum(files) / len(files) / 1_048_576) if files else 0, 2),
            "estimated_gb_per_day": round(day_bytes / 1_073_741_824, 2),
            "latest_recording": latest.isoformat() if latest else None,
        })

    report["total_gb"] = round(total_bytes / 1_073_741_824, 2)
    report["estimated_gb_per_day"] = round(total_day_bytes / 1_073_741_824, 2)
    return report


def purge_old_recordings(retention_days: int):
    """Delete recording segment files older than retention_days."""
    if retention_days <= 0:
        return
    
    logger.info(f"Running auto-purge worker... (retention: {retention_days} days)")
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(days=retention_days)
    purged_count = 0
    purged_bytes = 0
    
    if not RECORDINGS_BASE.exists():
        return
        
    for cam_dir in RECORDINGS_BASE.iterdir():
        if not cam_dir.is_dir():
            continue
        for f in cam_dir.glob("*.mp4"):
            try:
                stat = f.stat()
                file_time = datetime.fromtimestamp(stat.st_mtime)
                if file_time < cutoff:
                    file_size = stat.st_size
                    f.unlink()
                    purged_count += 1
                    purged_bytes += file_size
            except Exception as e:
                logger.error(f"Error purging file {f}: {e}")
                
    if purged_count > 0:
        logger.info(f"Auto-purge complete. Deleted {purged_count} files ({round(purged_bytes / 1_048_576, 1)} MB)")
