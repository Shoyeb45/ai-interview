"""
Video pipeline: receive video track, sample frames every 3-4 seconds,
analyze for face presence, movement, and basic engagement metrics.
"""
import asyncio
import time
from aiortc import MediaStreamTrack

from src.services.redis.event_emitter import emit_proctoring_snapshot


class VideoPipeline:
    def __init__(self, session):
        self.session = session
        self._last_frame = None
        self._analysis_interval = 3.5  # seconds

    async def process_video_track(self, track: MediaStreamTrack, should_stop: asyncio.Event):
        """Process video frames: sample every ~3-4s and analyze."""
        last_analysis_time = 0.0
        last_frame_data = None

        try:
            while not should_stop.is_set():
                try:
                    frame = await asyncio.wait_for(track.recv(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    if "ended" in str(e).lower() or "closed" in str(e).lower():
                        break
                    print(f"Video track error: {e}")
                    break

                now = time.monotonic()
                if now - last_analysis_time >= self._analysis_interval:
                    last_analysis_time = now
                    try:
                        raw = frame.to_ndarray()
                        result = self._analyze_frame(raw, last_frame_data)
                        last_frame_data = raw
                        if result and self.session.flow_manager:
                            emit_proctoring_snapshot(
                                self.session,
                                face_present=result.get("face_present", False),
                                movement_level=result.get("movement_level", 0.0),
                                dominant_emotion=result.get("dominant_emotion"),
                                engagement_score=result.get("engagement_score", 0.5),
                            )
                    except Exception as e:
                        print(f"Video analysis error: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Video pipeline error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Video track handler cleanup")

    def _analyze_frame(self, frame_ndarray, prev_frame):
        """
        Basic analysis: variance for movement, simple heuristics for engagement.
        Extend with opencv/mediapipe for proper face/emotion detection.
        """
        import numpy as np

        face_present = False
        movement_level = 0.0
        dominant_emotion = "neutral"
        engagement_score = 0.5

        try:
            # Frame variance: low variance = empty/static, high = content
            if frame_ndarray.size > 0:
                var = float(np.var(frame_ndarray))
                face_present = var > 500  # heuristic: some content present

            # Movement: compare to previous frame
            if prev_frame is not None and frame_ndarray.shape == prev_frame.shape:
                diff = np.abs(frame_ndarray.astype(np.float32) - prev_frame.astype(np.float32))
                movement_level = min(1.0, float(np.mean(diff)) / 30.0)

            # Engagement: combine presence + some movement (looking at camera)
            engagement_score = min(1.0, (0.6 if face_present else 0.2) + movement_level * 0.2)

        except Exception:
            pass

        return {
            "face_present": face_present,
            "movement_level": movement_level,
            "dominant_emotion": dominant_emotion,
            "engagement_score": engagement_score,
        }
