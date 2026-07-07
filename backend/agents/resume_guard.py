from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from utils.error_armor import retry_with_exponential_backoff

class ResumeGuardAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.system_instruction = """
You are the Resume Guard Agent for Campus Copilot, an expert tech recruiter and resume reviewer.
Your job is to analyze a student's resume against standard ATS best practices and any specific role they mentioned.

When provided with a resume (either uploaded text or pasted text), you must:
1. Provide an ATS-style score out of 100.
2. Identify strengths.
3. Identify weak bullet points and rewrite them using the XYZ format (Accomplished [X] as measured by [Y], by doing [Z]).
4. Highlight missing critical keywords if they mentioned a specific role (e.g., Google SWE).

Format your output beautifully using Markdown. Use bolding, bullet points, and clear headers.
Be encouraging but highly critical of generic bullet points.
"""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def review_resume(self, user_prompt: str, resume_text: str, chat_history: list = None) -> str:
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                # Skip adding large resume dumps from previous messages if we want to keep context clean,
                # but for now we just pass them.
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        # Combine user prompt and resume text
        combined_prompt = f"{user_prompt}\n\nHere is my resume content:\n\n{resume_text}"
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=combined_prompt)]))
        
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.3
        )
        
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=messages,
            config=config
        )
        
        return response.text

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def generate_cover_letter(self, user_prompt: str, resume_text: str, chat_history: list = None) -> str:
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        prompt = f"""
You are the Campus Copilot Cover Letter Expert.
Using the following resume:
---
{resume_text}
---

And the following job description/request from the user:
---
{user_prompt}
---

Draft a highly tailored, professional, and engaging cover letter. 
Do not use generic fluff. Explicitly map their resume experiences to the job requirements.
"""
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
        
        config = types.GenerateContentConfig(temperature=0.4)
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=messages,
            config=config
        )
        return response.text

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def extract_metadata(self, resume_text: str) -> str:
        prompt = f"""
Analyze this resume text and return exactly a 3-line summary:
1. "Detected: [X] Projects"
2. "Detected: [Y] Core Skills"
3. "Detected: [Z] Years Experience"

Resume:
{resume_text[:4000]}
"""
        config = types.GenerateContentConfig(temperature=0.1)
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt,
            config=config
        )
        return response.text.strip()
