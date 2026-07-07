from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from duckduckgo_search import DDGS
from google import genai
from google.genai import types

class ResearchAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.system_instruction = """
You are the Web Research Agent for Campus Copilot.
You have access to live internet search results.
Answer the user's question using the provided search results.
Synthesize the information clearly, using bullet points and Markdown formatting.
If the search results do not contain enough information, state that clearly, but try your best to answer.
Always cite your sources by mentioning the domain or linking to the URL if possible.
"""

    def perform_search(self, query: str) -> str:
        try:
            results = DDGS().text(query, max_results=5)
            if not results:
                return "No search results found."
                
            formatted_results = ""
            for i, r in enumerate(results):
                formatted_results += f"Result {i+1}:\nTitle: {r.get('title')}\nURL: {r.get('href')}\nSnippet: {r.get('body')}\n\n"
            return formatted_results
        except Exception as e:
            return f"Error performing search: {str(e)}"

    def research(self, user_prompt: str, chat_history: list = None) -> str:
        # 1. Ask Gemini to generate an optimized search query
        query_prompt = f"Generate a short, concise web search query (2-5 words) to find information for this user request: '{user_prompt}'. Return ONLY the query."
        search_query = self.client.models.generate_content(
            model=self.model_id,
            contents=query_prompt
        ).text.strip().replace('"', '')
        
        # 2. Perform search
        search_results = self.perform_search(search_query)
        
        # 3. Synthesize answer
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        combined_prompt = f"User Request: {user_prompt}\n\nLive Search Results for '{search_query}':\n\n{search_results}"
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
