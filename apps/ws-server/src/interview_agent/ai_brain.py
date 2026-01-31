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

NEXT_MARKER = "[NEXT]"


async def get_interviewer_response(
    conversation_history: list,
    system_prompt: str,
    metrics: InterviewMetrics = None,
    context: dict = None
) -> tuple[str, bool]:
    """
    Get GPT response with conversational interview behavior.
    Returns (response_text, move_to_next).
    - move_to_next=True when LLM ends with [NEXT] (acknowledged and advancing to next question)
    - move_to_next=False when LLM is asking a follow-up (staying on same question)
    """
    system_msg = system_prompt

    # Add current question context (what we asked)
    if context and context.get("current_question_context"):
        system_msg += f"\n\nCurrent question you asked: {context['current_question_context']}"

    # Add next question (for when advancing) - predefined or instruction
    if context and context.get("next_question"):
        system_msg += f"\n\nWhen you advance (end with [NEXT]), naturally incorporate this next question: {context['next_question']}"
    elif context and context.get("next_question_instruction"):
        system_msg += f"\n\nWhen you advance (end with [NEXT]), {context['next_question_instruction']}"

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
                behavior_note += "- User gave very brief answer - DEFINITELY ask a follow-up, do NOT advance yet\n"
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
            max_tokens=250,
            temperature=0.8,
            top_p=0.95,
        )
        
        raw = response.choices[0].message.content or ""
        move_to_next = NEXT_MARKER in raw
        # Strip the marker and any trailing whitespace
        text = raw.replace(NEXT_MARKER, "").strip()
        return text or "Could you elaborate on that?", move_to_next
        
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        return "I apologize, I'm having technical difficulties. Could you please repeat that?", False
