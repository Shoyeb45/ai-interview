"""
InterviewFlowManager: Fetches interview config from Redis and manages the dynamic interview flow.
- Opening message: use agent's openingMessage or generate
- Questions: CUSTOM_ONLY (use provided), AI_ONLY (generate all), MIXED (use provided + generate remaining)
- Flow: opening first, then next question based on user's answer
"""
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from src.services.redis import redis_client

logger = logging.getLogger(__name__)

QUESTION_SELECTION_MODE = {
    "CUSTOM_ONLY": "custom_only",
    "AI_ONLY": "ai_only",
    "MIXED": "mixed",
}


class SessionNotFoundError(Exception):
    """Raised when session data is not found in Redis."""
    pass


class InterviewFlowManager:
    """
    Manages the entire interview flow dynamically:
    - Fetches interview agent config from Redis
    - Provides opening message (from agent or default)
    - Provides next question (from provided list or generates via LLM context)
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self._data: Optional[Dict[str, Any]] = None
        self._questions: List[Dict] = []
        self._questions_sorted: List[Dict] = []
        self.current_question_index = 0
        self._load_session()

    def _load_session(self) -> None:
        """Fetch session data from Redis. Key format: session-{sessionId} (matches Node backend)."""
        key = f"session-{self.session_id}"
        raw = redis_client.get(key)
        if not raw:
            logger.error(f"Session not found in Redis: {key}")
            raise SessionNotFoundError(f"Session expired or invalid. Please start the interview again.")
        try:
            self._data = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse session data: {e}")
            raise SessionNotFoundError("Invalid session data.")
        self._questions = self._data.get("questions") or []
        self._questions_sorted = sorted(self._questions, key=lambda q: q.get("orderIndex", 0))

    @property
    def config(self) -> Dict[str, Any]:
        if self._data is None:
            raise SessionNotFoundError("Session not loaded.")
        return self._data

    @property
    def total_questions(self) -> int:
        return self.config.get("totalQuestions", 6)

    @property
    def question_selection_mode(self) -> str:
        return self.config.get("questionSelectionMode", "MIXED")

    @property
    def role(self) -> str:
        return self.config.get("role", "Software Engineer")

    @property
    def job_description(self) -> str:
        return self.config.get("jobDescription", "")

    @property
    def experience_level(self) -> str:
        return self.config.get("experienceLevel", "MID_LEVEL")

    @property
    def focus_areas(self) -> List[str]:
        areas = self.config.get("focusAreas") or []
        return areas if isinstance(areas, list) else []

    @property
    def opening_message(self) -> Optional[str]:
        return self.config.get("openingMessage")

    def get_opening_message(self) -> str:
        """Return opening message. Use agent's openingMessage if present and non-empty, else generate default."""
        custom = self.opening_message
        if custom and isinstance(custom, str) and custom.strip():
            return custom.strip()
        focus_str = ", ".join(self.focus_areas) if self.focus_areas else "technical skills and problem-solving"
        level = self.experience_level.replace("_", " ").lower()
        return (
            f"Hello! Thanks for joining today. I'll be conducting your interview for the {self.role} position.\n\n"
            f"This will be a conversational interview with {self.total_questions} questions focusing on {focus_str}.\n\n"
            f"Don't worry if you need hints or want to think out loud. Ready to begin?"
        )

    def get_system_prompt(self, current_question_count: int) -> str:
        """Generate dynamic system prompt based on interview config."""
        focus_str = ", ".join(self.focus_areas) if self.focus_areas else "technical skills"
        return f"""You are an experienced technical interviewer conducting a CONVERSATIONAL interview for a {self.role} position. This is NOT a quiz - engage naturally with the candidate's answers.

Interview Context:
- Role: {self.role}
- Experience Level: {self.experience_level}
- Focus Areas: {focus_str}
- Total Questions: {self.total_questions}
- Current Question: {current_question_count + 1}/{self.total_questions}

Job Description:
{self.job_description[:2000]}

CRITICAL - Conversational Flow (NOT quiz-style):
1. **Always acknowledge** the candidate's answer (e.g., "Hi Shoaib, thanks for that" or "Great point about React")
2. **Follow up when answers are brief** - If they gave a short intro like "My name is X", ask for more: "Can you tell me about your interests or skills?" or "What drew you to this role?"
3. **Only move to the next question** when you have enough depth. Don't rush to the next question.
4. **Personalize** - Use their name if they gave it. Reference what they said.
5. **Keep responses natural** - 2-4 sentences. Warm and professional.

When to follow up vs move on:
- Brief answer (1-2 sentences) → Follow up to get more depth. Do NOT end with [NEXT].
- Satisfactory answer (good detail) → Acknowledge and move to next question. End with [NEXT].
- If unsure, prefer follow-up. Better to ask once more than rush.

Output format: End your response with exactly [NEXT] ONLY when moving to the next question. If asking a follow-up, do NOT include [NEXT].
"""

    def get_context_for_interviewer_response(self) -> Tuple[str, Optional[str], str, Dict]:
        """
        Get context for LLM to generate a CONVERSATIONAL response (acknowledge + follow-up OR acknowledge + next).
        Does NOT advance - advancement happens only when LLM signals move_to_next.

        Returns: (current_question_context, next_question_text, system_prompt, llm_context)
        - current_question_context: what we asked (or "opening/self-introduction" for first turn)
        - next_question_text: the next question to ask when advancing (predefined or instruction for LLM)
        """
        if self.current_question_index >= self.total_questions:
            return "", None, self.get_system_prompt(self.current_question_index), {}

        system_prompt = self.get_system_prompt(self.current_question_index)
        llm_context: Dict[str, Any] = {}

        # Current question context - what we asked (for follow-up awareness)
        if self.current_question_index == 0:
            current_context = "Opening / self-introduction (asked candidate to introduce themselves)"
        else:
            # We're on question current_question_index (1-indexed: question 1, 2, ...)
            current_context = self._get_question_text_at(self.current_question_index - 1)
            if not current_context:
                current_context = f"Question {self.current_question_index} (from focus areas)"

        # Next question - what to ask when we advance (or closing if last)
        next_question_text: Optional[str] = None
        next_index = self.current_question_index
        if next_index >= self.total_questions - 1 and self.current_question_index > 0:
            # Advancing from last question - give closing, not next question
            llm_context["next_question_instruction"] = (
                "This was the last question. Provide a warm closing message thanking the candidate, "
                "mentioning next steps (e.g., 'We'll be in touch'), and concluding the interview. End with [NEXT]."
            )
        else:
            next_question_text = self._get_question_text_at(self.current_question_index)
            if next_question_text:
                llm_context["next_question"] = next_question_text
            else:
                mode = self.question_selection_mode.upper()
                if mode == "AI_ONLY" or mode == "MIXED":
                    next_num = self.current_question_index + 1
                    llm_context["next_question_instruction"] = (
                        f"Generate question {next_num} of {self.total_questions} based on job description and focus areas."
                    )

        return current_context, next_question_text, system_prompt, llm_context

    def _get_question_text_at(self, index: int) -> Optional[str]:
        """Get predefined question text at index, or None if none."""
        if index < 0 or index >= len(self._questions_sorted):
            return None
        q = self._questions_sorted[index]
        text = q.get("questionText") or ""
        return text.strip() if text else None

    def advance_to_next_question(self) -> None:
        """Call when LLM has decided to move to the next question."""
        self.current_question_index += 1

    def is_interview_complete(self) -> bool:
        return self.current_question_index >= self.total_questions
