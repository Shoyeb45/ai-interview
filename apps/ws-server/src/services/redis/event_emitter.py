"""
Emit interview events to Redis stream for Node.js worker to consume.
Stream key: interview_events (must match Node worker)
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from src.services.redis import redis_client

logger = logging.getLogger(__name__)
STREAM_KEY = "interview_events"


def _get_session_context(session) -> Dict[str, Any]:
    """Extract sessionId, interviewId, userId from session/flow_manager."""
    if not session or not session.flow_manager:
        return {}
    cfg = session.flow_manager.config
    return {
        "sessionId": int(session.session_id) if str(session.session_id).isdigit() else session.session_id,
        "interviewId": cfg.get("interviewId"),
        "userId": cfg.get("userId"),
        "interviewAgentId": cfg.get("id"),
    }


def emit_start_interview(session) -> Optional[str]:
    """Emit when user verified and session loaded."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        logger.warning("Cannot emit start_interview: missing sessionId")
        return None
    return redis_client.xadd_event(STREAM_KEY, "start_interview", ctx)


def emit_end_interview(session, conversation_history: List[Dict] = None) -> Optional[str]:
    """Emit when interview completes successfully."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {**ctx, "conversationHistory": conversation_history or []}
    return redis_client.xadd_event(STREAM_KEY, "end_interview", payload)


def emit_abandon_interview(session, reason: str, conversation_history: List[Dict] = None) -> Optional[str]:
    """Emit when interview is closed/abandoned (user clicked close, unexpected disconnect)."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {
        **ctx,
        "reason": reason or "unknown",
        "conversationHistory": conversation_history or [],
    }
    return redis_client.xadd_event(STREAM_KEY, "abandon_interview", payload)


def emit_cheat_interview(session, reason: str = "tab_change_violation") -> Optional[str]:
    """Emit when proctoring detects cheating (e.g. 3+ tab changes)."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {**ctx, "reason": reason or "tab_change_violation"}
    return redis_client.xadd_event(STREAM_KEY, "cheat_interview", payload)


def emit_proctoring_tab_change(session) -> Optional[str]:
    """Emit for audit when user changes tab (worker increments count, creates event)."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    return redis_client.xadd_event(STREAM_KEY, "proctoring_tab_change", ctx)


def emit_proctoring_snapshot(
    session,
    face_present: bool = False,
    movement_level: float = 0.0,
    dominant_emotion: Optional[str] = None,
    engagement_score: float = 0.5,
) -> Optional[str]:
    """Emit video analysis snapshot for metrics (every 3-4 seconds)."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {
        **ctx,
        "facePresent": face_present,
        "movementLevel": movement_level,
        "dominantEmotion": dominant_emotion or "neutral",
        "engagementScore": engagement_score,
        "snapshotAt": datetime.utcnow().isoformat() + "Z",
    }
    return redis_client.xadd_event(STREAM_KEY, "proctoring_snapshot", payload)


def emit_question_evaluate(
    session,
    question_number: int,
    question: str,
    user_response: str,
    ai_response: str,
    question_asked_at: Optional[str],
    answer_started_at: Optional[str],
    answer_ended_at: Optional[str],
    thinking_time_sec: Optional[int],
    answer_duration_sec: Optional[float],
    conversation_history: List[Dict],
    metrics: Optional[Dict] = None,
    interview_question_id: Optional[int] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
) -> Optional[str]:
    """Emit when a question is evaluated (user answered, we advanced to next)."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {
        **ctx,
        "questionNumber": question_number,
        "question": question,
        "userResponse": user_response,
        "aiResponse": ai_response,
        "questionAskedAt": question_asked_at,
        "answerStartedAt": answer_started_at,
        "answerEndedAt": answer_ended_at,
        "thinkingTime": thinking_time_sec,
        "answerDuration": answer_duration_sec,
        "conversationHistory": conversation_history,
        "metrics": metrics or {},
        "interviewQuestionId": interview_question_id,
        "category": category,
        "difficulty": difficulty,
    }
    return redis_client.xadd_event(STREAM_KEY, "question_evaluate", payload)


def emit_generate_report(session, conversation_history: List[Dict], full_payload: Dict = None) -> Optional[str]:
    """Emit at successful end - worker generates detailed report and stores."""
    ctx = _get_session_context(session)
    if not ctx.get("sessionId"):
        return None
    payload = {
        **ctx,
        "conversationHistory": conversation_history or [],
        **(full_payload or {}),
    }
    return redis_client.xadd_event(STREAM_KEY, "generate_report", payload)
