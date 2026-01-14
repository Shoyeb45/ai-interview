from openai import AsyncOpenAI
import os
from src.open_ai_llm import chat_with_openai


client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Interview configuration
INTERVIEW_CONFIG = {
    "position": "Software Engineer",
    "duration_minutes": 30,
    "total_questions": 5,
    "difficulty": "medium"
}

SYSTEM_PROMPT = """You are an experienced technical interviewer conducting an interview for a {position} position.

Your role:
- Ask clear, relevant technical questions
- Listen carefully to answers
- Ask follow-up questions when needed
- Be professional but friendly
- Keep responses concise (2-3 sentences max)
- Don't repeat questions

Interview format:
- Total questions: {total_questions}
- Current question: {current_question}
- Keep questions progressive (start easy, get harder)

Guidelines:
- If the candidate asks for clarification, provide it
- If answer is unclear, ask them to elaborate
- After each answer, acknowledge it briefly before moving to next question
- At the end, thank them and mention next steps
"""

async def get_interviewer_response(
    conversation_history: list,
    current_question_count: int
) -> str:
    """
    Get GPT-4 response for the interview
    """
    
    # Build system prompt with current context
    system_msg = SYSTEM_PROMPT.format(
        position=INTERVIEW_CONFIG["position"],
        total_questions=INTERVIEW_CONFIG["total_questions"],
        current_question=current_question_count + 1
    )
    
    # Build messages for GPT
    messages = [
        {"role": "system", "content": system_msg}
    ] + conversation_history
    
    try:
        response = await chat_with_openai(messages)
        
        return response
        
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        return "I apologize, I'm having technical difficulties. Could you please repeat that?"


async def start_interview() -> str:
    """
    Generate the opening message for the interview
    """
    return f"""Hello! Thanks for joining today. I'll be conducting your interview for the {INTERVIEW_CONFIG['position']} position. 

This will be a conversational interview with about {INTERVIEW_CONFIG['total_questions']} questions covering your technical skills and experience. Feel free to think out loud and ask for clarification if needed.

Let's start with an easy one: Can you tell me about yourself and your experience with software development?"""