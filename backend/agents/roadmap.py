from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional
from utils.error_armor import retry_with_exponential_backoff

class ActionItem(BaseModel):
    task_name: str
    platform: str
    link: str
    difficulty: Optional[str] = None

class Topic(BaseModel):
    name: str
    definition: str
    code_snippet: str

class Module(BaseModel):
    week_number: int
    title: str
    topics: List[Topic]
    action_items: List[ActionItem]

class Roadmap(BaseModel):
    roadmap_title: str
    modules: List[Module]

class RoadmapAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash' 
        
        self.system_instruction = """
You are the Roadmap Agent for Campus Copilot.
Your job is to generate highly structured, week-by-week learning roadmaps for students.

CRITICAL FORMATTING RULES:
1. You MUST return ONLY a valid JSON object adhering to the provided schema.
2. For each Topic, provide a clear, concise `definition` (1-2 sentences) and a relevant, short `code_snippet` demonstrating the concept.
3. The platform for action items should be highly diverse based on the context. You MUST heavily mix and use a variety of platforms including "YouTube", "LeetCode", "GeeksForGeeks", "HackerRank", "CodeChef", "W3Schools", "AlgoMaster", "Documentation", or "Practice". Do NOT just rely on LeetCode and YouTube for everything.
4. Break down the learning path logically based on the user's requested timeframe or a default 4-8 week plan.
5. For the `link` field in ActionItems, you MUST provide a valid, working URL. To ensure it never 404s, construct search URLs or !ducky redirect URLs instead of direct links if you aren't 100% certain of the direct link. 
   - YouTube example: `https://www.youtube.com/results?search_query=python+for+beginners`
   - LeetCode example: `https://leetcode.com/problemset/all/?search=two+sum`
   - GeeksForGeeks example: `https://duckduckgo.com/?q=!ducky+site:geeksforgeeks.org+binary+tree`
   - HackerRank / CodeChef / W3Schools example: `https://duckduckgo.com/?q=!ducky+site:hackerrank.com+array+manipulation`
   - Documentation example: `https://duckduckgo.com/?q=!ducky+python+official+documentation+lists`
5. When a task is a coding challenge, it MUST include a valid URL in the `link` key, and it MUST evaluate and assign a `difficulty` key with exactly one of three string values: "Easy", "Medium", or "Hard".
"""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def generate_roadmap(self, prompt: str, chat_history: list = None, api_key: str = None) -> str:
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
        
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
        
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.4,
            response_mime_type="application/json",
            response_schema=Roadmap
        )
        
        used_pool_key = None
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            used_pool_key = key_manager.get_active_key()
            if not used_pool_key:
                raise PoolDepletedException()
            client = genai.Client(api_key=used_pool_key)
        
        try:
            response = client.models.generate_content(
            model=self.model_id,
            contents=messages,
            config=config
        )
        except Exception as e:
            if "429" in str(e) and used_pool_key:
                key_manager.mark_key_exhausted(used_pool_key)
                if key_manager.get_active_key():
                    raise NeedRetryImmediately()
                else:
                    raise PoolDepletedException()
            raise e

        
        return response.text

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def rebalance_roadmap(self, current_roadmap_json: str, api_key: str = None) -> str:
        prompt = f"""
You are an intelligent JSON data mutation engine. You will receive a JSON object representing a student's learning roadmap.

Your strict instructions:

1. Identify all tasks in 'Week 1' (or past weeks) where isCompleted is explicitly false.
2. REMOVE these uncompleted tasks entirely from their current week's array.
3. DISTRIBUTE those removed tasks evenly by appending them into the task arrays of future weeks (e.g., Week 2, Week 3).
4. RENAME the moved tasks by adding the prefix [Carryover] to their titles so the user knows they were moved (e.g., [Carryover] Practice: Implement advanced selectors...).
5. Do NOT touch or move any tasks where isCompleted is true.
6. Return ONLY the newly mutated JSON matching the original schema.

Here is the JSON to mutate:
{current_roadmap_json}
"""
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=Roadmap
        )
        
        used_pool_key = None
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            used_pool_key = key_manager.get_active_key()
            if not used_pool_key:
                raise PoolDepletedException()
            client = genai.Client(api_key=used_pool_key)
        
        try:
            response = client.models.generate_content(
            model=self.model_id,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            config=config
        )
        except Exception as e:
            if "429" in str(e) and used_pool_key:
                key_manager.mark_key_exhausted(used_pool_key)
                if key_manager.get_active_key():
                    raise NeedRetryImmediately()
                else:
                    raise PoolDepletedException()
            raise e

        
        return response.text
