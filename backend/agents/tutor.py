from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
import json
from google import genai
from google.genai import types

class TutorAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'

    def chat(self, user_message: str, chat_history: list, active_scope: dict, global_overview: list, user_api_key: str = None):
        client = genai.Client(api_key=user_api_key) if user_api_key else genai.Client(api_key=key_manager.get_active_key())
        
        system_instruction = f"""
You are the Campus Copilot AI Tutor, a world-class computer science professor.

The student has multiple active tracking tracks:
{json.dumps(global_overview, indent=2)}

However, they are currently focused explicitly on the '{active_scope.get('roadmapTitle', 'Unknown')}' track, specifically studying '{active_scope.get('activeModule', 'Unknown')}'.
Here are their incomplete tasks in this module:
{json.dumps(active_scope.get('incompleteTasks', []), indent=2)}

Use the context of what they are working on to tailor your technical analogies. If they ask a generic coding question, prioritize examples relevant to their active focus unless they explicitly ask to switch topics. Keep your answers clear, concise, and heavily utilize markdown code blocks for examples.

{f"You are receiving the user's personal module notes:\\n{active_scope.get('activeNotes')}\\nYou MUST prioritize these notes over standard programming conventions. If a note contradicts standard practice, treat the note as the absolute truth for the user's current environment." if active_scope.get('activeNotes') else ""}
"""

        # Convert chat_history to Gemini format
        contents = []
        for msg in chat_history:
            # Skip the initial static greeting from the frontend to avoid Gemini "must start with user" error
            if msg.get("content", "").startswith("Hello! I am your Campus Copilot AI Tutor"):
                continue
                
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("content", ""))]
                )
            )
        
        # Append the new user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_message)]
            )
        )

        response = client.models.generate_content(
            model=self.model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        
        return response.text
