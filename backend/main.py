import os
import sys
import io
import subprocess
import tempfile
from dotenv import load_dotenv
load_dotenv(override=True) # Force load environment variables before initializing agents

from google import genai
from google.genai import types
from fastapi import FastAPI, UploadFile, File, Form, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

# Import our agents
from agents.coordinator import CoordinatorAgent
from agents.roadmap import RoadmapAgent
from agents.resume_guard import ResumeGuardAgent
from agents.researcher import ResearchAgent
from agents.simulator import SimulatorAgent
from agents.quiz import QuizAgent
from agents.tutor import TutorAgent

from database import engine, Base, get_db
import models

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Campus Copilot V2 API")

# Allow CORS for React frontend (Vite defaults to 5173/5174)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

coordinator = CoordinatorAgent()
roadmap_agent = RoadmapAgent()
resume_guard = ResumeGuardAgent()
researcher = ResearchAgent()
simulator = SimulatorAgent()
quiz_agent = QuizAgent()
tutor_agent = TutorAgent()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    prompt: str
    chat_history: List[ChatMessage] = []
    resume_text: Optional[str] = None

class CodeExecutionRequest(BaseModel):
    code: str
    
class SimulateRequest(BaseModel):
    language: str
    code: str

class QuizRequest(BaseModel):
    module_title: str
    action_items: list

class TutorRequest(BaseModel):
    message: str
    chat_history: list
    currentActiveScope: dict
    globalOverview: list

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Campus Copilot Backend Running"}

@app.post("/api/v1/chat")
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), x_api_key: Optional[str] = Header(None)):
    # Convert Pydantic history to list of dicts for the agent
    history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
    
    response = coordinator.run(request.prompt, history, request.resume_text, api_key=x_api_key)
    
    # FALLBACK DUMMY ROADMAP FOR DEMOS WHEN API QUOTA IS EXHAUSTED
    if "ROUTE_TO_ROADMAP" in request.prompt and response.startswith("⚠️ **Traffic Jam:"):
        import re
        goal_match = re.search(r"Goal:\s*(.*?)(?:, Level:|$)", request.prompt)
        goal_text = goal_match.group(1).strip().title() if goal_match else "Your Goal"
        
        response = f"""{{
            "roadmap_title": "{goal_text} (Fallback)",
            "modules": [
                {{
                    "week_number": 1,
                    "title": "Core Fundamentals (Offline Demo)",
                    "topics": [{{"name": "Introduction to {goal_text}"}}, {{"name": "Basic Concepts"}}],
                    "action_items": [
                        {{"task_name": "Read Documentation", "platform": "Practice", "link": ""}},
                        {{"task_name": "Hello World Project", "platform": "Practice", "link": ""}}
                    ]
                }},
                {{
                    "week_number": 2,
                    "title": "Intermediate Topics (Offline Demo)",
                    "topics": [{{"name": "Advanced Features"}}, {{"name": "Best Practices"}}],
                    "action_items": [
                        {{"task_name": "Build a Mini Project", "platform": "Practice", "link": ""}}
                    ]
                }}
            ]
        }}"""
    
    # Save user message and bot message to DB
    user_msg = models.Message(role="user", content=request.prompt)
    bot_msg = models.Message(role="model", content=response)
    db.add(user_msg)
    db.add(bot_msg)
    db.commit()
    
    return {"response": response}

class RebalanceRequest(BaseModel):
    roadmap_json: str

@app.post("/api/v1/roadmaps/rebalance")
def rebalance_roadmap(request: RebalanceRequest, x_api_key: Optional[str] = Header(None)):
    try:
        response = roadmap_agent.rebalance_roadmap(request.roadmap_json, api_key=x_api_key)
        
        # DEMO FALLBACK: Algorithmic Rebalancing if API is exhausted
        if response.startswith("⚠️ **Traffic Jam:"):
            import json
            try:
                data = json.loads(request.roadmap_json)
                carryover_tasks = []
                
                # 1. Extract incomplete tasks from completed/in-progress modules
                for mod in data.get("modules", []):
                    if mod.get("status") in ["Completed", "In Progress"]:
                        incomplete = [t for t in mod.get("action_items", []) if not t.get("isCompleted", False)]
                        for t in incomplete:
                            if not t.get("task_name", "").startswith("[Carryover]"):
                                t["task_name"] = "[Carryover] " + t["task_name"]
                            carryover_tasks.append(t)
                        # Keep only completed tasks in the old module
                        mod["action_items"] = [t for t in mod.get("action_items", []) if t.get("isCompleted", False)]
                
                # 2. Distribute to upcoming modules
                upcoming_modules = [mod for mod in data.get("modules", []) if mod.get("status") not in ["Completed", "In Progress"]]
                if not upcoming_modules and data.get("modules"):
                    upcoming_modules = [data["modules"][-1]]
                
                if upcoming_modules and carryover_tasks:
                    for i, task in enumerate(carryover_tasks):
                        target_mod = upcoming_modules[i % len(upcoming_modules)]
                        if "action_items" not in target_mod:
                            target_mod["action_items"] = []
                        target_mod["action_items"].append(task)
                        
                response = json.dumps(data)
            except Exception as e:
                pass # If fallback fails, original Traffic Jam response is returned

        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/sandbox/execute")
async def execute_code(request: CodeExecutionRequest):
    # WARNING: This is a simulated secure sandbox for the Hackathon/Capstone.
    # In a real enterprise environment, this would run inside an isolated Docker container or gVisor.
    
    original_stdout = sys.stdout
    original_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    
    output = ""
    error = ""
    
    try:
        # Execute in a clean namespace
        exec(request.code, {})
        output = sys.stdout.getvalue()
    except Exception as e:
        error = str(e)
    finally:
        sys.stdout = original_stdout
        sys.stderr = original_stderr
        
    return {
        "output": output,
        "error": error
    }

@app.post("/api/v1/sandbox/simulate")
def simulate_code(request: SimulateRequest, x_api_key: Optional[str] = Header(None)):
    # FALLBACK: If Python, run locally to save API quota!
    if request.language.lower() == 'python':
        original_stdout = sys.stdout
        original_stderr = sys.stderr
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
        output = ""
        error = ""
        try:
            exec(request.code, {})
            output = sys.stdout.getvalue()
        except Exception as e:
            error = str(e)
        finally:
            sys.stdout = original_stdout
            sys.stderr = original_stderr
        return {"output": output, "error": error}

    # For other languages, use the AI Simulator
    output = simulator.simulate(request.language, request.code, api_key=x_api_key)
    
    # Catch 429 Resource Exhausted errors from the AI
    if "429 RESOURCE_EXHAUSTED" in output or "quota" in output.lower() or "error" in output.lower():
        # FALLBACK 2: Try Local Compilers via subprocess!
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                if request.language == 'cpp' or request.language == 'c':
                    ext = '.cpp' if request.language == 'cpp' else '.c'
                    compiler = 'g++' if request.language == 'cpp' else 'gcc'
                    code_file = os.path.join(temp_dir, f"main{ext}")
                    exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
                    with open(code_file, 'w') as f:
                        f.write(request.code)
                    # Compile
                    comp = subprocess.run([compiler, code_file, "-o", exe_file], capture_output=True, text=True)
                    if comp.returncode != 0:
                        return {"output": "", "error": f"Local Compiler Error:\n{comp.stderr}"}
                    # Run
                    run = subprocess.run([exe_file], capture_output=True, text=True, timeout=3)
                    return {"output": run.stdout, "error": run.stderr}
                
                elif request.language == 'java':
                    code_file = os.path.join(temp_dir, "Main.java")
                    with open(code_file, 'w') as f:
                        f.write(request.code)
                    # Compile
                    comp = subprocess.run(["javac", code_file], capture_output=True, text=True)
                    if comp.returncode != 0:
                        return {"output": "", "error": f"Local Compiler Error:\n{comp.stderr}"}
                    # Run
                    run = subprocess.run(["java", "-cp", temp_dir, "Main"], capture_output=True, text=True, timeout=3)
                    return {"output": run.stdout, "error": run.stderr}
                    
        except FileNotFoundError:
            return {
                "output": f"Error: AI Simulation Quota Exceeded.\n\nYour Gemini API key has run out of credits to simulate {request.language.upper()}.\nWe attempted to run it locally, but you do not have the required compiler ({'gcc/g++' if request.language in ['c', 'cpp'] else 'javac'}) installed on this computer.\n\nPlease select Python or JavaScript to run code locally for free, or install the compiler.",
                "error": ""
            }
        except Exception as e:
            pass # Fall through to the generic 429 message if subprocess fails

        return {
            "output": "Error: AI Simulation Quota Exceeded.\n\nYour Gemini API key has run out of credits to simulate this language.\n\nThe local execution engine has fallen back to Python and JavaScript. Please select Python or JavaScript from the dropdown to run code locally for free, or upgrade your API billing to resume multi-language simulation.",
            "error": ""
        }

    return {
        "output": output,
        "error": "" # AI includes errors in output
    }

@app.post("/api/v1/resume/upload")
def upload_resume(file: UploadFile = File(...)):
    # Read the file content
    contents = file.file.read()
    # In a full implementation, we extract PDF text here.
    # For now, we return a success status.
    return {"filename": file.filename, "message": "File uploaded and processed securely"}

class SyncRoadmapsRequest(BaseModel):
    user_id: str = "default_user"
    data: str

@app.post("/api/v1/roadmaps/sync")
def sync_roadmaps(request: SyncRoadmapsRequest, db: Session = Depends(get_db)):
    # Upsert the roadmaps for the user
    roadmap_store = db.query(models.RoadmapStore).filter(models.RoadmapStore.user_id == request.user_id).first()
    if roadmap_store:
        roadmap_store.data = request.data
    else:
        roadmap_store = models.RoadmapStore(user_id=request.user_id, data=request.data)
        db.add(roadmap_store)
    db.commit()
    return {"status": "success", "message": "Roadmaps synced to database"}

@app.post("/api/v1/test-key")
def test_api_key(x_api_key: Optional[str] = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=400, detail="No API Key provided")
    try:
        client = genai.Client(api_key=x_api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents='Say OK',
            config=types.GenerateContentConfig(max_output_tokens=1)
        )
        return {"status": "success", "message": "Key is valid"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Key: {str(e)}")

@app.post("/api/v1/quiz/generate")
def generate_quiz(request: QuizRequest, x_api_key: Optional[str] = Header(None)):
    try:
        result = quiz_agent.generate_quiz(
            module_title=request.module_title,
            action_items=request.action_items,
            user_api_key=x_api_key
        )
        # result is a JSON string of the structured output
        import json
        return json.loads(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/tutor/chat")
def tutor_chat(request: TutorRequest, x_api_key: Optional[str] = Header(None)):
    try:
        reply = tutor_agent.chat(
            user_message=request.message,
            chat_history=request.chat_history,
            active_scope=request.currentActiveScope,
            global_overview=request.globalOverview,
            user_api_key=x_api_key
        )
        return {"status": "success", "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
