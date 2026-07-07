from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from utils.error_armor import retry_with_exponential_backoff
from duckduckgo_search import DDGS

class MockInterviewerAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.base_instruction = """
You are the Mock Interviewer Agent for Campus Copilot. You are a senior engineer/recruiter at a top tech company.
Your goal is to conduct a realistic, challenging, but fair mock interview with the user.

Rules for the interview:
1. Ask ONE question at a time. Do not overwhelm the user with multiple questions.
2. Wait for the user's response before proceeding.
3. If the user answers, provide brief feedback on their answer (using the STAR method if behavioral, or algorithmic complexity if technical).
4. Then, ask a follow-up question or move to the next topic.
5. If the user asks to end the interview, provide a comprehensive final feedback summary with a hiring recommendation.

Your tone should be professional and analytical. Use the real-world context provided below to formulate accurate questions.
"""

    def _get_real_world_context(self, role_prompt: str) -> str:
        try:
            results = DDGS().text(f"common interview questions and recent interview experiences for {role_prompt}", max_results=3)
            context = "\nReal-world context found:\n"
            for r in results:
                context += f"- {r['body']}\n"
            return context
        except Exception:
            return ""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def conduct_interview(self, prompt: str, chat_history: list) -> str:
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
        
        # If it's the first message of the interview (roughly), fetch real world context
        context = ""
        if len(chat_history) < 3:
            context = self._get_real_world_context(prompt)
            
        dynamic_instruction = self.base_instruction + context
        
        config = types.GenerateContentConfig(
            system_instruction=dynamic_instruction,
            temperature=0.4
        )
        
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=messages,
            config=config
        )
        
        return response.text
