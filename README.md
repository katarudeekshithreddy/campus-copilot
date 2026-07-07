# Campus Copilot: The Agentic Academic Concierge

**Track:** Student Success & Developer Productivity  
**Built for:** Google Gemini Agentic Hackathon

Campus Copilot is an enterprise-grade AI Concierge designed to serve as a comprehensive academic and placement advisor for students. By leveraging a highly scalable Multi-Agent architecture and strict BYOK (Bring Your Own Key) security, it transforms raw student data into actionable, personalized roadmaps and career feedback.

---

## 🎯 Problem Statement
Students are overwhelmed by generic advice, static syllabi, and fragmented tools when preparing for technical interviews or building their portfolios. They lack a unified, intelligent system that can dynamically adapt to their current skill level and provide granular, actionable feedback on their resumes and GitHub repositories.

## 💡 The Solution
Campus Copilot solves this by orchestrating a swarm of specialized AI Agents. Instead of a standard chatbot, users interact with an **ADK (Agent Development Kit) Coordinator** that dynamically routes their requests to expert sub-agents (e.g., the Roadmap Generator, the Mock Interviewer, the Resume Guard). 

---

## 🏗️ Technical Architecture & Capstone Compliance

This project was built from the ground up to demonstrate advanced Agentic patterns:

### 1. Multi-Agent System (ADK)
The backend is driven by `backend/agents/coordinator.py`, which acts as an intelligent ADK router. It classifies user intent using Gemini 2.5 Flash and dynamically delegates tasks to specialized sub-agents (`RoadmapAgent`, `GitHubAnalyzer`, `ResumeGuard`), demonstrating a true multi-agent topology.

### 2. Model Context Protocol (MCP) Server
We built a standalone MCP Server (`backend/mcp_server.py`) that strictly adheres to the official Model Context Protocol. It exposes native tools like `analyze_github_repo` and `fetch_student_data`.

### 3. Agent Skills (MCP Client)
Our `GitHubAnalyzer` agent (`backend/agents/github_analyzer.py`) is wired as an MCP Client over `stdio`. When a student requests a portfolio review, the agent natively connects to the MCP server to execute the analysis skill, bridging the gap between LLM reasoning and local tool execution.

### 4. Zero-Trust Security (BYOK)
The platform features a highly engineered "Security Vault" UI. It utilizes a Bring Your Own Key (BYOK) architecture where the user's Gemini API key is stored **exclusively in local storage**. The backend never persists credentials, ensuring enterprise-grade privacy and zero backend logging.

---

## 🚀 Setup & Deploy Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google Gemini API Key (Input via the frontend UI)

### 1. Backend Setup (FastAPI + MCP Server)
The backend runs the FastAPI server and the associated Multi-Agent infrastructure.

```bash
cd backend
pip install -r requirements.txt
# Run the FastAPI server (which implicitly triggers the MCP clients)
fastapi run main.py
```

### 2. Frontend Setup (React + Vite)
The frontend is a custom-built, Vercel-styled React application.

```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5174` in your browser. Open the **Security** tab to securely input your Gemini API Key and unlock the platform.

### Deployability (Production Ready)
Campus Copilot is architected for seamless cloud deployment:
- **Frontend**: The Vite/React application is fully optimized for edge-network deployment on platforms like Vercel, Netlify, or Firebase Hosting. Simply connect the GitHub repository and deploy.
- **Backend**: The FastAPI server, along with its Multi-Agent and MCP sub-processes, is completely containerizable. It can be instantly deployed to Render, Heroku, or Google Cloud Run using standard Docker configurations.

---
## License
This project is licensed under the Creative Commons Attribution 4.0 International License (CC-BY 4.0). See the `LICENSE` file for details.
