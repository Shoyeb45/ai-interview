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
        return f"""You are an experienced technical interviewer conducting an interview for a {self.role} position.

Interview Context:
- Role: {self.role}
- Experience Level: {self.experience_level}
- Focus Areas: {focus_str}
- Total Questions: {self.total_questions}
- Current Question: {current_question_count + 1}/{self.total_questions}

Job Description:
{self.job_description[:2000]}

Your personality:
- Professional but warm and encouraging
- Patient and supportive for {self.experience_level} candidates
- Asks follow-up questions naturally
- Notices when candidates struggle and provides hints
- Acknowledges good answers with brief positive feedback

Interview guidelines:
- Keep responses SHORT (1-3 sentences max)
- Adapt difficulty to {self.experience_level} level
- React naturally to candidate's pace and confidence
- If candidate struggles, provide hints or rephrase
- If candidate gives great answer, acknowledge briefly before moving on
- Focus on areas: {focus_str}

Response types based on context:
1. **Long pause after question** → "Take your time. Would you like me to rephrase?"
2. **Struggling/hesitant answer** → Provide hint: "Let me give you a hint: think about..."
3. **Good answer** → Brief acknowledgment: "Great! That's exactly right. Next question..."
4. **Incomplete answer** → "Good start. Can you elaborate on..."
5. **Off-topic** → Gently redirect: "Interesting, but let's focus on..."

IMPORTANT: Track the question number. After completing question {self.total_questions}, wrap up the interview politely.
"""

    def get_next_question(
        self,
        previous_answer: Optional[str] = None,
        context: Optional[Dict] = None,
    ) -> Tuple[Optional[str], str, Dict]:
        """
        Get the next question or instruction for LLM.
        Returns: (predefined_question_text or None, system_prompt, llm_context)

        - If predefined question exists: return (question_text, system_prompt, {}) -> caller speaks it directly
        - If LLM should generate: return (None, system_prompt, context) -> caller uses ai_brain
        """
        if self.current_question_index >= self.total_questions:
            return None, self.get_system_prompt(self.current_question_index), {}

        mode = self.question_selection_mode.upper()
        system_prompt = self.get_system_prompt(self.current_question_index)
        llm_context = context or {}

        # CUSTOM_ONLY: use provided questions in order
        if mode == "CUSTOM_ONLY":
            if self.current_question_index < len(self._questions_sorted):
                q = self._questions_sorted[self.current_question_index]
                text = q.get("questionText") or ""
                if text.strip():
                    self.current_question_index += 1
                    return text.strip(), system_prompt, {}
            self.current_question_index += 1
            return None, system_prompt, llm_context

        # AI_ONLY: always generate
        if mode == "AI_ONLY":
            self.current_question_index += 1
            instruction = (
                f"Ask question {self.current_question_index} of {self.total_questions}. "
                f"Base it on the job description and focus areas. "
                f"{'The previous answer was: ' + previous_answer[:300] if previous_answer else ''}"
            )
            llm_context["question_instruction"] = instruction
            return None, system_prompt, llm_context

        # MIXED: use custom if available, else generate
        if mode == "MIXED" and self.current_question_index < len(self._questions_sorted):
            q = self._questions_sorted[self.current_question_index]
            text = q.get("questionText") or ""
            if text.strip():
                self.current_question_index += 1
                return text.strip(), system_prompt, {}

        self.current_question_index += 1
        instruction = (
            f"Ask question {self.current_question_index} of {self.total_questions}. "
            f"Generate based on job description and focus areas. "
            f"{'Previous answer: ' + previous_answer[:300] if previous_answer else ''}"
        )
        llm_context["question_instruction"] = instruction
        return None, system_prompt, llm_context

    def advance_question_index(self) -> None:
        """Called when we use a predefined question (since get_next_question already increments)."""
        pass  # Already incremented in get_next_question

    def is_interview_complete(self) -> bool:
        return self.current_question_index >= self.total_questions
