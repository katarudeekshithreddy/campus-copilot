import asyncio
from typing import Any
import json
import logging

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campus-copilot-mcp")

app = Server("campus-copilot-mcp-server")

@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools for the MCP server."""
    return [
        Tool(
            name="analyze_github_repo",
            description="Analyzes a GitHub repository and returns insights and actionable feedback.",
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_url": {
                        "type": "string",
                        "description": "The URL of the GitHub repository to analyze"
                    }
                },
                "required": ["repo_url"]
            }
        ),
        Tool(
            name="fetch_student_data",
            description="Fetches raw student learning metrics from the local database.",
            inputSchema={
                "type": "object",
                "properties": {
                    "student_id": {
                        "type": "string",
                        "description": "The ID of the student to fetch data for"
                    }
                },
                "required": ["student_id"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Execute a tool."""
    if name == "analyze_github_repo":
        repo_url = arguments.get("repo_url", "")
        # Mocking an intense analysis for the Capstone demo
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "repo": repo_url,
                    "analysis": "The repository demonstrates strong architectural patterns but lacks comprehensive CI/CD pipelines.",
                    "score": 85,
                    "action_items": [
                        "Add GitHub Actions for automated testing.",
                        "Include a more detailed README.md architecture diagram.",
                        "Refactor monolithic functions in main.py."
                    ]
                })
            )
        ]
    elif name == "fetch_student_data":
        student_id = arguments.get("student_id", "Unknown")
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "student_id": student_id,
                    "metrics": {
                        "modules_completed": 12,
                        "current_streak": 5,
                        "average_quiz_score": 92.5
                    }
                })
            )
        ]
    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
