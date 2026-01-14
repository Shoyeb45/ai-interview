import time

SYSTEM_PROMPT = """You are an experienced technical interviewer conducting an interview for a Software Engineer position.

Your personality:
- Professional but warm and encouraging
- Patient and supportive
- Asks follow-up questions naturally
- Notices when candidates struggle and provides hints
- Acknowledges good answers with brief positive feedback

Interview guidelines:
- Total questions: 5-6
- Current question: {current_question}
- Keep responses SHORT (1-3 sentences max)
- React naturally to candidate's pace and confidence
- If candidate struggles, provide hints or rephrase
- If candidate gives great answer, acknowledge it briefly before moving on
- Notice verbal fillers or hesitation and be supportive

Response types based on context:
1. **Long pause after question** → "Take your time. Would you like me to rephrase the question?"
2. **Struggling/hesitant answer** → Provide a hint: "Let me give you a hint: think about..."
3. **Good answer** → Brief acknowledgment: "Great! That's exactly right. Next question..."
4. **Incomplete answer** → "That's a good start. Can you elaborate on..."
5. **Off-topic** → Gently redirect: "Interesting point, but let's focus on..."

Timing awareness:
- If answer is taking too long (>30s), be patient but offer help
- If answer is very brief (<5s), ask follow-up
- Track if candidate is confident or struggling
"""

class InterviewMetrics:
    """Track interview performance metrics"""
    def __init__(self):
        self.question_start_time = None
        self.total_questions_asked = 0
        self.total_answer_time = 0
        self.long_pauses = 0
        self.quick_answers = 0
        self.struggling_indicators = 0
        
    def start_question(self):
        """Mark when a question was asked"""
        self.question_start_time = time.time()
        self.total_questions_asked += 1
        
    def get_answer_duration(self) -> float:
        """Get how long user took to answer"""
        if self.question_start_time:
            duration = time.time() - self.question_start_time
            self.total_answer_time += duration
            return duration
        return 0.0
        
    def analyze_answer_pace(self, duration: float, text: str) -> dict:
        """Analyze if answer was too fast, too slow, or struggling"""
        word_count = len(text.split())
        
        # Struggling indicators
        struggling_words = ['um', 'uh', 'hmm', 'err', 'like', 'you know']
        struggle_count = sum(1 for word in struggling_words if word in text.lower())
        
        analysis = {
            "duration": duration,
            "word_count": word_count,
            "words_per_second": word_count / duration if duration > 0 else 0,
            "is_struggling": struggle_count > 2 or duration > 45,
            "is_too_brief": word_count < 10 and duration < 5,
            "is_confident": struggle_count == 0 and 15 < word_count < 100,
            "needs_encouragement": duration > 30
        }
        
        if analysis["is_struggling"]:
            self.struggling_indicators += 1
            
        if analysis["is_too_brief"]:
            self.quick_answers += 1
            
        return analysis


async def provide_encouragement(pause_duration: float) -> str:
    """Generate encouragement based on pause length"""
    if pause_duration < 12:
        return None  # No need for encouragement
    elif pause_duration < 20:
        return "Take your time to think through your answer."
    elif pause_duration < 30:
        return "No rush. Would you like me to rephrase the question?"
    else:
        return "I notice you're taking some time. Would it help if I gave you a hint or moved to a different question?"


async def start_interview() -> str:
    """Generate opening message"""
    return """Hello! Thanks for joining today. I'll be conducting your interview for the Software Engineer position.
"""
# This will be a conversational interview with about 5-6 questions covering your technical skills and problem-solving approach. Feel free to think out loud, ask for clarification, or request hints if you need them.

# Ready to begin? Let's start with: Can you tell me about a challenging technical problem you've solved recently and how you approached it?"""