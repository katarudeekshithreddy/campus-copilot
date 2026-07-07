from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List

class QuizOption(BaseModel):
    id: int
    question: str
    options: List[str]
    correctAnswerIdx: int
    explanation: str

from utils.error_armor import retry_with_exponential_backoff, NeedRetryImmediately, PoolDepletedException

class QuizAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.system_instruction = """
You are a rigorous technical instructor and an expert assessment engine.
Your task is to generate a concise, high-impact multiple-choice quiz based on the provided module topics.
You MUST generate EXACTLY 3 questions.
For each question, provide 4 plausible options, the index of the correct option (0-indexed), and a concise explanation of why it is correct.
Return the output strictly matching the requested JSON schema.
"""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def generate_quiz(self, module_title: str, action_items: List[dict], user_api_key: str = None):
        prompt = f"""
Module Title: {module_title}

Action Items / Topics:
"""
        for item in action_items:
            prompt += f"- {item.get('title', '')}\n"
            
        prompt += "\nGenerate exactly 3 multiple-choice questions testing these concepts."
        
        used_pool_key = None
        if user_api_key:
            client = genai.Client(api_key=user_api_key)
        else:
            used_pool_key = key_manager.get_active_key()
            if not used_pool_key:
                raise PoolDepletedException()
            client = genai.Client(api_key=used_pool_key)
            
        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_instruction,
                    temperature=0.7,
                    response_mime_type="application/json",
                    response_schema=list[QuizOption],
                )
            )
            return response.text
        except Exception as e:
            if "429" in str(e) and used_pool_key:
                key_manager.mark_key_exhausted(used_pool_key)
                if key_manager.get_active_key():
                    raise NeedRetryImmediately()
                else:
                    raise PoolDepletedException()
            raise e
