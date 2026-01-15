from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class InterviewConfig:
    """Interview configuration from database"""
    interview_id: int
    user_id: int
    role: str
    job_description: str
    experience_level: str
    total_questions: int
    focus_areas: List[str]

@dataclass
class QuestionMetrics:
    """Track metrics for each question"""
    question_number: int
    question: str
    category: str
    difficulty: str
    question_asked_at: datetime
    answer_started_at: Optional[datetime] = None
    answer_ended_at: Optional[datetime] = None
    thinking_time: Optional[int] = None
    answer_duration: Optional[int] = None
    struggling_indicators: int = 0
    confidence_score: Optional[float] = None
    hints_provided: int = 0
    clarifications_asked: int = 0

class InterviewConductor:
    """Manages the interview flow and metrics"""
    
    def __init__(self, config: InterviewConfig):
        self.config = config
        self.current_question = 0
        self.questions_metrics: List[QuestionMetrics] = []
        self.conversation_history: List[Dict] = []
        self.interview_start_time = None
        self.user_struggling = False
        self.last_question_time = None
        
    def get_system_prompt(self) -> str:
        """Generate dynamic system prompt based on interview config"""
        return f"""You are an experienced technical interviewer conducting an interview for a {self.config.role} position.

Interview Context:
- Role: {self.config.role}
- Experience Level: {self.config.experience_level}
- Focus Areas: {', '.join(self.config.focus_areas)}
- Total Questions: {self.config.total_questions}
- Current Question: {self.current_question + 1}/{self.config.total_questions}

Job Description:
{self.config.job_description}

Your personality:
- Professional but warm and encouraging
- Patient and supportive for {self.config.experience_level} candidates
- Asks follow-up questions naturally
- Notices when candidates struggle and provides hints
- Acknowledges good answers with brief positive feedback

Interview guidelines:
- Keep responses SHORT (1-3 sentences max)
- Adapt difficulty to {self.config.experience_level} level
- React naturally to candidate's pace and confidence
- If candidate struggles, provide hints or rephrase
- If candidate gives great answer, acknowledge briefly before moving on
- Focus on areas: {', '.join(self.config.focus_areas)}

Response types based on context:
1. **Long pause after question** → "Take your time. Would you like me to rephrase?"
2. **Struggling/hesitant answer** → Provide hint: "Let me give you a hint: think about..."
3. **Good answer** → Brief acknowledgment: "Great! That's exactly right. Next question..."
4. **Incomplete answer** → "Good start. Can you elaborate on..."
5. **Off-topic** → Gently redirect: "Interesting, but let's focus on..."

IMPORTANT: Track the question number. After completing question {self.config.total_questions}, wrap up the interview politely.
"""

    def start_interview(self) -> str:
        """Generate opening message"""
        self.interview_start_time = datetime.now()
        
        opening = f"""Hello! Thanks for joining today. I'll be conducting your interview for the {self.config.role} position.

This will be a conversational interview with {self.config.total_questions} questions focusing on {', '.join(self.config.focus_areas)}.

"""
        
        # Adjust tone based on experience level
        if self.config.experience_level in ['INTERN', 'ENTRY_LEVEL']:
            opening += "Don't worry if you need hints or want to think out loud. This is a learning experience too!\n\n"
        else:
            opening += "Feel free to ask for clarification or discuss trade-offs in your answers.\n\n"
        
        opening += "Ready to begin?"
        
        return opening

    def ask_next_question(self, previous_answer: Optional[str] = None) -> Optional[Dict]:
        """Generate next question based on context"""
        
        if self.current_question >= self.config.total_questions:
            return None  # Interview complete
        
        self.current_question += 1
        self.last_question_time = datetime.now()
        
        # This would integrate with your LLM to generate contextual questions
        # For now, return metadata for question generation
        return {
            "question_number": self.current_question,
            "total_questions": self.config.total_questions,
            "focus_areas": self.config.focus_areas,
            "experience_level": self.config.experience_level,
            "previous_answer": previous_answer,
            "should_adjust_difficulty": self.user_struggling
        }

    def analyze_answer(self, text: str, duration: float) -> Dict:
        """Analyze answer quality and metrics"""
        
        word_count = len(text.split())
        
        # Detect struggling indicators
        struggling_words = ['um', 'uh', 'hmm', 'err', 'like', 'you know', 'ahh', 'basically', 'actually']
        struggle_count = sum(1 for word in struggling_words if word.lower() in text.lower())
        
        # Calculate confidence score (0-1)
        confidence_factors = []
        
        # Factor 1: Speech fluency (lower filler words = higher confidence)
        filler_ratio = struggle_count / max(word_count, 1)
        confidence_factors.append(max(0, 1 - (filler_ratio * 5)))
        
        # Factor 2: Answer length (too short or too long might indicate issues)
        optimal_length = 50 if self.config.experience_level in ['SENIOR', 'LEAD'] else 30
        length_score = 1 - abs(word_count - optimal_length) / optimal_length
        confidence_factors.append(max(0, min(1, length_score)))
        
        # Factor 3: Response time (not too fast, not too slow)
        if 5 < duration < 45:
            confidence_factors.append(0.9)
        elif duration < 5:
            confidence_factors.append(0.5)  # Too quick, might not be thorough
        else:
            confidence_factors.append(0.3)  # Too long, might be struggling
        
        confidence_score = sum(confidence_factors) / len(confidence_factors)
        
        analysis = {
            "duration": duration,
            "word_count": word_count,
            "words_per_second": word_count / max(duration, 1),
            "struggling_indicators": struggle_count,
            "confidence_score": confidence_score,
            "is_struggling": struggle_count > 3 or duration > 60,
            "is_too_brief": word_count < 15 and duration < 5,
            "is_confident": struggle_count <= 1 and 20 < word_count < 150,
            "needs_encouragement": duration > 30 or struggle_count > 4,
            "filler_words": struggle_count,
            "assessment": self._get_assessment(confidence_score, struggle_count)
        }
        
        # Update global state
        if analysis["is_struggling"]:
            self.user_struggling = True
        
        return analysis

    def _get_assessment(self, confidence_score: float, struggle_count: int) -> str:
        """Get qualitative assessment"""
        if confidence_score > 0.8 and struggle_count <= 1:
            return "excellent"
        elif confidence_score > 0.6:
            return "good"
        elif confidence_score > 0.4:
            return "moderate"
        else:
            return "struggling"

    def should_provide_hint(self, pause_duration: float, answer_analysis: Dict) -> bool:
        """Decide if interviewer should provide a hint"""
        return (
            pause_duration > 25 or
            answer_analysis.get("is_struggling", False) or
            answer_analysis.get("struggling_indicators", 0) > 4
        )

    def should_ask_followup(self, answer_analysis: Dict) -> bool:
        """Decide if a follow-up question is needed"""
        return (
            answer_analysis.get("is_too_brief", False) or
            answer_analysis.get("word_count", 0) < 20
        )

    def generate_encouragement(self, pause_duration: float) -> Optional[str]:
        """Generate encouragement based on pause length"""
        if pause_duration < 12:
            return None
        elif pause_duration < 20:
            return "Take your time to think through your answer."
        elif pause_duration < 30:
            return "No rush. Would you like me to rephrase the question?"
        else:
            return "I notice you're taking some time. Would a hint help, or should we approach this differently?"

    def get_interview_summary(self) -> Dict:
        """Get summary metrics for the completed interview"""
        
        if not self.interview_start_time:
            return {}
        
        total_duration = (datetime.now() - self.interview_start_time).total_seconds() / 60
        
        # Calculate aggregate metrics
        total_confidence = sum(m.confidence_score or 0 for m in self.questions_metrics)
        avg_confidence = total_confidence / len(self.questions_metrics) if self.questions_metrics else 0
        
        total_hints = sum(m.hints_provided for m in self.questions_metrics)
        total_struggles = sum(m.struggling_indicators for m in self.questions_metrics)
        
        avg_thinking_time = sum(m.thinking_time or 0 for m in self.questions_metrics) / max(len(self.questions_metrics), 1)
        avg_answer_duration = sum(m.answer_duration or 0 for m in self.questions_metrics) / max(len(self.questions_metrics), 1)
        
        return {
            "interview_id": self.config.interview_id,
            "total_questions": self.config.total_questions,
            "questions_answered": self.current_question,
            "total_duration_minutes": round(total_duration, 2),
            "avg_confidence": round(avg_confidence, 2),
            "total_hints_used": total_hints,
            "total_struggling_indicators": total_struggles,
            "avg_thinking_time_seconds": round(avg_thinking_time, 2),
            "avg_answer_duration_seconds": round(avg_answer_duration, 2),
            "completion_rate": round((self.current_question / self.config.total_questions) * 100, 2)
        }

    def save_question_metrics(self, conversation_id: int, metrics: QuestionMetrics) -> Dict:
        """Format question metrics for database save"""
        return {
            "conversation_id": conversation_id,
            "question_number": metrics.question_number,
            "question": metrics.question,
            "category": metrics.category,
            "difficulty": metrics.difficulty,
            "question_asked_at": metrics.question_asked_at.isoformat(),
            "answer_started_at": metrics.answer_started_at.isoformat() if metrics.answer_started_at else None,
            "answer_ended_at": metrics.answer_ended_at.isoformat() if metrics.answer_ended_at else None,
            "thinking_time": metrics.thinking_time,
            "answer_duration": metrics.answer_duration,
            "struggling_indicators": metrics.struggling_indicators,
            "confidence_score": metrics.confidence_score,
            "hints_provided": metrics.hints_provided,
            "clarifications_asked": metrics.clarifications_asked
        }


class FeedbackGenerator:
    """Generate detailed feedback for interviews"""
    
    @staticmethod
    def generate_question_feedback(
        question: str,
        answer: str,
        expected_keywords: List[str],
        metrics: Dict
    ) -> Dict:
        """Generate feedback for a single question"""
        
        # Analyze answer content
        answer_lower = answer.lower()
        mentioned_keywords = [kw for kw in expected_keywords if kw.lower() in answer_lower]
        missed_keywords = [kw for kw in expected_keywords if kw.lower() not in answer_lower]
        
        # Score calculation (1-10 scale)
        keyword_score = (len(mentioned_keywords) / max(len(expected_keywords), 1)) * 10
        confidence_score = metrics.get('confidence_score', 0.5) * 10
        
        answer_quality = round((keyword_score + confidence_score) / 2)
        technical_accuracy = round(keyword_score)
        communication_clarity = round(confidence_score)
        
        # Generate strengths and weaknesses
        strengths = []
        weaknesses = []
        suggestions = []
        
        if metrics.get('is_confident'):
            strengths.append("Clear and confident communication")
        if len(answer.split()) > 30:
            strengths.append("Detailed explanation provided")
        if metrics.get('struggling_indicators', 0) == 0:
            strengths.append("Fluent response without hesitation")
        
        if metrics.get('is_struggling'):
            weaknesses.append("Multiple hesitations detected")
            suggestions.append("Practice explaining concepts out loud to improve fluency")
        if metrics.get('is_too_brief'):
            weaknesses.append("Answer could be more detailed")
            suggestions.append("Try to elaborate on your thought process")
        if len(missed_keywords) > len(expected_keywords) / 2:
            weaknesses.append("Missed several key concepts")
            suggestions.append(f"Review topics: {', '.join(missed_keywords[:3])}")
        
        return {
            "answer_quality": max(1, min(10, answer_quality)),
            "technical_accuracy": max(1, min(10, technical_accuracy)),
            "communication_clarity": max(1, min(10, communication_clarity)),
            "problem_solving_skill": max(1, min(10, round(confidence_score + 2))),  # Slight boost
            "strengths": strengths if strengths else ["Completed the question"],
            "weaknesses": weaknesses if weaknesses else ["Good effort overall"],
            "suggestions": suggestions if suggestions else ["Keep practicing similar questions"],
            "expected_keywords": expected_keywords,
            "mentioned_keywords": mentioned_keywords,
            "missed_keywords": missed_keywords
        }
    
    @staticmethod
    def generate_overall_feedback(
        interview_summary: Dict,
        question_feedbacks: List[Dict],
        conversation_history: List[Dict]
    ) -> Dict:
        """Generate comprehensive interview feedback"""
        
        # Calculate overall scores
        avg_answer_quality = sum(f['answer_quality'] for f in question_feedbacks) / max(len(question_feedbacks), 1)
        avg_technical = sum(f['technical_accuracy'] for f in question_feedbacks) / max(len(question_feedbacks), 1)
        avg_communication = sum(f['communication_clarity'] for f in question_feedbacks) / max(len(question_feedbacks), 1)
        avg_problem_solving = sum(f['problem_solving_skill'] for f in question_feedbacks) / max(len(question_feedbacks), 1)
        
        overall_score = round((avg_answer_quality + avg_technical + avg_communication + avg_problem_solving) / 4 * 10)
        
        # Aggregate strengths and weaknesses
        all_strengths = []
        all_weaknesses = []
        for feedback in question_feedbacks:
            all_strengths.extend(feedback['strengths'])
            all_weaknesses.extend(feedback['weaknesses'])
        
        # Get top 3 unique strengths and weaknesses
        from collections import Counter
        strength_counts = Counter(all_strengths)
        weakness_counts = Counter(all_weaknesses)
        
        top_strengths = [s for s, _ in strength_counts.most_common(3)]
        top_weaknesses = [w for w, _ in weakness_counts.most_common(3)]
        
        # Determine hiring decision
        decision = FeedbackGenerator._determine_decision(overall_score, interview_summary)
        role_readiness = FeedbackGenerator._calculate_readiness(overall_score, interview_summary)
        
        # Generate improvement plan
        improvement_plan = FeedbackGenerator._generate_improvement_plan(
            top_weaknesses, question_feedbacks
        )
        
        # Extract skill scores
        skill_scores = FeedbackGenerator._extract_skill_scores(question_feedbacks)
        
        return {
            "overall_score": overall_score,
            "technical_score": round(avg_technical * 10),
            "communication_score": round(avg_communication * 10),
            "problem_solving_score": round(avg_problem_solving * 10),
            "culture_fit_score": round(avg_communication * 10),  # Based on communication
            "skill_scores": skill_scores,
            "top_strengths": top_strengths if top_strengths else ["Attended the interview", "Attempted all questions"],
            "top_weaknesses": top_weaknesses if top_weaknesses else ["Needs more practice"],
            "decision": decision,
            "role_readiness_percent": role_readiness,
            "improvement_plan": improvement_plan,
            "total_questions": interview_summary.get('total_questions', 0),
            "questions_answered": interview_summary.get('questions_answered', 0),
            "avg_response_time": interview_summary.get('avg_answer_duration_seconds', 0),
            "avg_confidence": interview_summary.get('avg_confidence', 0),
            "total_hints_used": interview_summary.get('total_hints_used', 0),
            "interview_duration": round(interview_summary.get('total_duration_minutes', 0))
        }
    
    @staticmethod
    def _determine_decision(score: int, summary: Dict) -> str:
        """Determine hiring decision"""
        completion_rate = summary.get('completion_rate', 0)
        hints_used = summary.get('total_hints_used', 0)
        
        if score >= 85 and completion_rate >= 80 and hints_used <= 2:
            return "STRONG_HIRE"
        elif score >= 70 and completion_rate >= 70:
            return "HIRE"
        elif score >= 55 and completion_rate >= 60:
            return "BORDERLINE"
        elif score >= 40:
            return "NO_HIRE"
        else:
            return "STRONG_NO_HIRE"
    
    @staticmethod
    def _calculate_readiness(score: int, summary: Dict) -> int:
        """Calculate role readiness percentage"""
        base_readiness = score
        completion_bonus = summary.get('completion_rate', 0) * 0.2
        confidence_bonus = summary.get('avg_confidence', 0) * 10
        
        readiness = round(base_readiness + completion_bonus + confidence_bonus)
        return max(0, min(100, readiness))
    
    @staticmethod
    def _generate_improvement_plan(weaknesses: List[str], feedbacks: List[Dict]) -> Dict:
        """Generate 7-day improvement plan"""
        
        # Collect all missed keywords
        all_missed = []
        for f in feedbacks:
            all_missed.extend(f.get('missed_keywords', []))
        
        unique_missed = list(set(all_missed))[:5]
        
        plan = {
            "day1-2": [
                "Review fundamental concepts that were challenging",
                f"Study these topics: {', '.join(unique_missed[:2])}" if unique_missed else "Review interview basics"
            ],
            "day3-4": [
                "Practice mock interviews with a friend",
                "Work on communication clarity and reducing filler words"
            ],
            "day5-6": [
                f"Deep dive into: {', '.join(unique_missed[2:4])}" if len(unique_missed) > 2 else "Practice coding problems",
                "Watch technical talks or tutorials on weak areas"
            ],
            "day7": [
                "Take another mock interview to measure progress",
                "Review notes and create a study guide for next interview"
            ]
        }
        
        return plan
    
    @staticmethod
    def _extract_skill_scores(feedbacks: List[Dict]) -> Dict:
        """Extract skill-based scores"""
        # This would be more sophisticated in production
        # For now, create generic skill scores
        
        avg_technical = sum(f['technical_accuracy'] for f in feedbacks) / max(len(feedbacks), 1)
        avg_communication = sum(f['communication_clarity'] for f in feedbacks) / max(len(feedbacks), 1)
        avg_problem_solving = sum(f['problem_solving_skill'] for f in feedbacks) / max(len(feedbacks), 1)
        
        return {
            "technical_knowledge": round(avg_technical * 10),
            "communication": round(avg_communication * 10),
            "problem_solving": round(avg_problem_solving * 10),
            "coding": round((avg_technical + avg_problem_solving) / 2 * 10)
        }