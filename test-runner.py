import asyncio
import sys
import os
sys.path.insert(0, "/app")

from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def test():
    try:
        options = ClaudeAgentOptions(
            model="gemini/gemini-2.5-flash",
            env={
                "ANTHROPIC_BASE_URL": "http://litellm:4000",
                "ANTHROPIC_API_KEY": "sk-dummy"
            }
        )
        # Apply the fix I did in session_manager!
        if options.env is None:
            options.env = dict(os.environ)
        else:
            options.env = {**os.environ, **options.env}
            
        print("Env PATH:", options.env.get("PATH"))
        print("Env PWD:", options.env.get("PWD"))
        
        client = ClaudeSDKClient(options=options)
        await client.connect()
        print("SUCCESS CONNECT")
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
