from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
import os
from .software_engineer import InterviewMetrics

load_dotenv()

api_version = os.getenv("OPENAI_API_VERSION", "")
api_key = os.getenv("OPENAI_API_KEY", "")
endpoint = os.getenv("OPENAI_URL", "")
deployment = os.getenv("OPENAI_MODEL", "")

client = AsyncAzureOpenAI(
    api_version=api_version,
    api_key=api_key,
    azure_endpoint=endpoint,
)

async def get_interviewer_response(
    conversation_history: list,
    current_question_count: int,
    SYSTEM_PROMPT: str,
    metrics: InterviewMetrics = None,
    context: dict = None
) -> str:
    """
    Get GPT response with natural interview behavior
    
    Args:
        conversation_history: Full conversation so far
        current_question_count: Which question we're on
        metrics: Performance tracking
        context: Additional context like pause duration, answer analysis
    """
    
    # Build system prompt
    system_msg = SYSTEM_PROMPT.format(
        current_question=current_question_count + 1
    )
    
    # Add context about user's behavior if available
    if context:
        behavior_note = "\n\nCandidate behavior context:\n"
        
        if context.get("long_pause"):
            behavior_note += f"- User paused for {context['long_pause']:.1f}s before answering\n"
            
        if context.get("answer_analysis"):
            analysis = context["answer_analysis"]
            if analysis.get("is_struggling"):
                behavior_note += "- User seems to be struggling (many filler words or taking long time)\n"
            if analysis.get("is_too_brief"):
                behavior_note += "- User gave very brief answer, might need follow-up\n"
            if analysis.get("is_confident"):
                behavior_note += "- User seems confident in their answer\n"
                
        system_msg += behavior_note
    
    messages = [
        {"role": "system", "content": system_msg}
    ] + conversation_history
    
    try:
        response = await client.chat.completions.create(
            model=deployment,
            messages=messages,
            max_tokens=150,
            temperature=0.8,  # Slightly higher for more natural variation
            top_p=0.95,
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        return "I apologize, I'm having technical difficulties. Could you please repeat that?"
