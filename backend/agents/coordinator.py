from utils.key_manager import key_manager
from utils.error_armor import NeedRetryImmediately, PoolDepletedException
import os
from google import genai
from google.genai import types
from agents.roadmap import RoadmapAgent
from agents.resume_guard import ResumeGuardAgent
from agents.interviewer import MockInterviewerAgent
from agents.github_analyzer import GitHubAnalyzerAgent
from agents.researcher import ResearchAgent
from utils.error_armor import retry_with_exponential_backoff

class CoordinatorAgent:
    """
    Campus Copilot ADK (Agent Development Kit) Coordinator.
    This acts as the primary Multi-Agent router, receiving incoming requests
    and dynamically delegating them to specialized sub-agents based on LLM intent classification.
    """
    def __init__(self):
        self.model_id = 'gemini-2.5-flash'
        self.roadmap_agent = RoadmapAgent()
        self.resume_guard = ResumeGuardAgent()
        self.interviewer = MockInterviewerAgent()
        self.github_analyzer = GitHubAnalyzerAgent()
        self.researcher = ResearchAgent()
        
        self.system_instruction = """
You are the Coordinator Agent for Campus Copilot.
Your job is to analyze the student's request and determine the user's intent.
You have access to the following specialized agents:
- ROADMAP_AGENT: Generates week-by-week study plans and checklists.
- RESUME_AGENT: Reviews resumes, gives ATS scores, and rewrites bullet points.
- INTERVIEW_AGENT: Conducts mock interviews.
- COVER_LETTER_AGENT: Generates a tailored cover letter using the uploaded resume and a job description.
- GITHUB_AGENT: Analyzes a student's public GitHub profile and repositories for portfolio strength.
- RESEARCH_AGENT: Actively searches the live internet to find up-to-date tech trends, job postings, or company info.

If the user wants a study plan, learning path, or to modify an existing roadmap, simply reply with the exact text: ROUTE_TO_ROADMAP
If the user explicitly asks to review, check, or grade their resume, reply with: ROUTE_TO_RESUME
If the user asks to write or generate a cover letter, reply with: ROUTE_TO_COVER_LETTER
If the user asks to start a mock interview or practice interview questions, reply with: ROUTE_TO_INTERVIEW
If the user asks to review, scan, or analyze their GitHub profile or portfolio, reply with: ROUTE_TO_GITHUB
If the user asks to search the web, find current jobs, or fetch live data, reply with: ROUTE_TO_RESEARCH

If the user asks for a coding exercise, coding practice, or help with debugging, DO NOT route them to the roadmap. Instead, answer them directly right here as an expert coding tutor. Give them a short, engaging coding problem to solve in the sandbox. The sandbox supports multiple languages including Python, C++, Java, and Javascript, so provide the exercise in the language they are studying.

If the user asks for generic advice that doesn't fit the agents, answer them directly as a helpful mentor.
"""

    @retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2)
    def run(self, prompt: str, chat_history: list, resume_text: str = None, api_key: str = None) -> str:
        messages = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
                
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
        
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.1
        )
        
        # Step 1: ADK Coordinator determines intent
        used_pool_key = None
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            used_pool_key = key_manager.get_active_key()
            if not used_pool_key:
                raise PoolDepletedException()
            client = genai.Client(api_key=used_pool_key)
        
        try:
            coordinator_response = client.models.generate_content(
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

        
        intent = coordinator_response.text.strip()
        
        # Step 2: Multi-Agent ADK Routing based on intent
        if "ROUTE_TO_ROADMAP" in intent:
            res = self.roadmap_agent.generate_roadmap(prompt, chat_history, api_key=api_key)
            if res.startswith("⚠️ **Traffic Jam:"):
                # FALLBACK DUMMY ROADMAP FOR DEMOS WHEN API QUOTA IS EXHAUSTED
                return """
                {
                    "roadmap_title": "AI Quota Exceeded (Fallback Mode)",
                    "modules": [
                        {
                            "week_number": 1,
                            "title": "Arrays & Strings",
                            "topics": [
                              {
                                "name": "Memory allocation and contiguous storage",
                                "definition": "Arrays store elements sequentially in memory, allowing O(1) random access.",
                                "code_snippet": "int[] arr = new int[5];\\narr[0] = 10;"
                              },
                              {
                                "name": "Two-pointer technique",
                                "definition": "A pattern using two indices to iterate through a data structure simultaneously, often to save time or space.",
                                "code_snippet": "int left = 0, right = arr.length - 1;\\nwhile (left < right) {\\n  // process\\n  left++; right--;\\n}"
                              },
                              {
                                "name": "Sliding window",
                                "definition": "A technique to reduce nested loops by maintaining a window of elements and sliding it across the array.",
                                "code_snippet": "int sum = 0;\\nfor(int i=0; i<k; i++) sum += arr[i];\\n// slide window\\nsum += arr[k] - arr[0];"
                              }
                            ],
                            "action_items": [
                                {"task_name": "Two Sum", "platform": "LeetCode", "link": "https://leetcode.com/problems/two-sum/"},
                                {"task_name": "Implement HashMap", "platform": "Practice", "link": ""}
                            ]
                        },
                        {
                            "week_number": 2,
                            "title": "Linked Lists & Fast/Slow Pointers",
                            "topics": [
                              {
                                "name": "Singly and doubly linked lists",
                                "definition": "Nodes containing data and pointers to the next (and previous) node in the sequence.",
                                "code_snippet": "class Node {\\n  int val;\\n  Node next;\\n}"
                              },
                              {
                                "name": "Cycle detection (Floyd's Tortoise and Hare)",
                                "definition": "Using two pointers moving at different speeds to detect if a cycle exists in a linked list.",
                                "code_snippet": "Node slow = head, fast = head;\\nwhile (fast != null && fast.next != null) {\\n  slow = slow.next;\\n  fast = fast.next.next;\\n  if (slow == fast) return true;\\n}"
                              },
                              {
                                "name": "Reversing a linked list",
                                "definition": "Iteratively or recursively reversing the next pointers of the nodes.",
                                "code_snippet": "Node prev = null, curr = head;\\nwhile (curr != null) {\\n  Node nextTemp = curr.next;\\n  curr.next = prev;\\n  prev = curr;\\n  curr = nextTemp;\\n}"
                              }
                            ],
                            "action_items": [
                                {"task_name": "Invert Binary Tree", "platform": "LeetCode", "link": "https://leetcode.com/problems/invert-binary-tree/"},
                                {"task_name": "Number of Islands", "platform": "LeetCode", "link": "https://leetcode.com/problems/number-of-islands/"}
                            ]
                        }
                    ]
                }
                """
            return res
        elif "ROUTE_TO_RESUME" in intent:
            if resume_text:
                return self.resume_guard.review_resume(prompt, resume_text, chat_history)
            else:
                return "I see you want a resume review! Please upload your resume using the sidebar or paste your resume text so I can analyze it."
        elif "ROUTE_TO_COVER_LETTER" in intent:
            if resume_text:
                return self.resume_guard.generate_cover_letter(prompt, resume_text, chat_history)
            else:
                return "I need your resume to write a tailored cover letter! Please upload your resume (PDF) using the sidebar."
        elif "ROUTE_TO_INTERVIEW" in intent:
            return self.interviewer.conduct_interview(prompt, chat_history)
        elif "ROUTE_TO_GITHUB" in intent:
            return self.github_analyzer.analyze_profile(prompt, chat_history)
        elif "ROUTE_TO_RESEARCH" in intent:
            return self.researcher.research(prompt, chat_history)
        else:
            return coordinator_response.text
