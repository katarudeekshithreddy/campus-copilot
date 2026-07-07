from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from utils.error_armor import retry_with_exponential_backoff

class SimulatorAgent:
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        
        self.system_instruction = """
You are a virtual machine and code execution engine for Campus Copilot.
Your job is to simulate the compilation and execution of code provided by the user.

CRITICAL INSTRUCTIONS:
1. The user will provide the code and the programming language.
2. You must carefully analyze the code for syntax errors, logical errors, and runtime behavior.
3. If there is a compilation or syntax error, output EXACTLY what the standard compiler (e.g. gcc, javac, python) would output.
4. If the code is correct, output EXACTLY what would be printed to stdout.
5. DO NOT provide any conversational text, markdown formatting, backticks, or explanations.
6. YOUR ENTIRE RESPONSE MUST BE ONLY THE RAW TERMINAL OUTPUT.
"""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=1, backoff_factor=2)
    def simulate(self, language: str, code: str, api_key: str = None) -> str:
        prompt = f"Language: {language}\n\nCode:\n{code}"
        
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.1
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
            contents=prompt,
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

        
        # Strip any markdown code blocks the model might accidentally add despite instructions
        out = response.text.strip()
        if out.startswith('```') and out.endswith('```'):
            lines = out.split('\n')
            if len(lines) > 2:
                out = '\n'.join(lines[1:-1])
        return out
