from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
import requests
from google import genai
from google.genai import types
from utils.error_armor import retry_with_exponential_backoff

class GitHubAnalyzerAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.system_instruction = """
You are the GitHub Portfolio Analyzer Agent for Campus Copilot.
Your job is to analyze a student's GitHub profile and their repositories to give actionable feedback on how to improve their portfolio for tech recruiters.

When provided with GitHub profile data and repository lists, you must:
1. Provide a quick summary of their current portfolio strength.
2. Identify which repositories stand out the most.
3. Highlight missing elements (e.g., lack of READMEs, missing tests, generic projects).
4. Suggest 1-2 new project ideas that would complement their current stack.

Format your output beautifully using Markdown. Be encouraging but highly analytical.
"""

    async def _fetch_from_mcp(self, username: str) -> str:
        try:
            import sys
            from mcp.client.stdio import stdio_client, StdioServerParameters
            from mcp.client.session import ClientSession
            import os
            
            # Locate the mcp_server.py in the same backend directory
            server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mcp_server.py")
            
            server_params = StdioServerParameters(
                command=sys.executable,
                args=[server_path]
            )
            
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(
                        "analyze_github_repo",
                        arguments={"repo_url": f"https://github.com/{username}"}
                    )
                    return result.content[0].text
        except Exception as e:
            return f"Error communicating with MCP server: {str(e)}"

    def fetch_github_data(self, username: str) -> str:
        import asyncio
        return asyncio.run(self._fetch_from_mcp(username))

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def analyze_profile(self, user_prompt: str, chat_history: list = None) -> str:
        # Extract username from prompt using a simple heuristic or prompt
        # We can just pass the user prompt to Gemini to extract the username, or do it explicitly.
        # To keep it simple, let's ask Gemini to extract the username first.
        extract_prompt = f"Extract the GitHub username from this text. Return ONLY the username, nothing else. If none is found, return 'UNKNOWN'. Text: {user_prompt}"
        username = self.client.models.generate_content(
            model=self.model_id,
            contents=extract_prompt
        ).text.strip()
        
        if username == "UNKNOWN":
            return "I couldn't detect a GitHub username in your request. Could you provide your GitHub username so I can analyze your portfolio?"
            
        github_data = self.fetch_github_data(username)
        
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        combined_prompt = f"{user_prompt}\n\nHere is the raw data from my GitHub profile ({username}):\n\n{github_data}"
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
