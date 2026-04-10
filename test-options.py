import asyncio
import sys
import os
sys.path.insert(0, "/app")

from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions
from server.agent_runtime.session_manager import SessionManager

async def test():
    from pathlib import Path
    manager = SessionManager(project_root=Path("/app"), data_dir=Path("/app/projects/.data"), meta_store=None)
    options = manager._build_options("test-d46b4b35")
    options.model = "gemini/sonnet"
    
    env_updates = {
        "ANTHROPIC_BASE_URL": "http://litellm:4000",
        "ANTHROPIC_API_KEY": "sk-dummy"
    }

    if options.env is None:
        options.env = dict(os.environ)
    else:
        options.env = {**os.environ, **options.env}
        
    options.env.update(env_updates)

    
    
    try:
        client = ClaudeSDKClient(options=options)
        await client.connect()
        print("SUCCESS CONNECT")
        async for event in client.query("hello"):
            print("EVENT:", type(event))
        print("SUCCESS SEND")
    except Exception as e:
        print(f"FAILED: {type(e)}")
        print(str(e))
        if hasattr(e, "stderr"):
            print("STDERR:")
            print(e.stderr)
        elif hasattr(e, "stdout"):
            print("STDOUT:")
            print(e.stdout)

if __name__ == "__main__":
    asyncio.run(test())
