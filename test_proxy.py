import sys
from pathlib import Path
import asyncio
# ensure /app in sys
sys.path.insert(0, "/app")

from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def main():
    gemini_key = "sk-dummy"
    try:
        from lib.db import async_session_factory
        from lib.db.repositories.credential import CredentialRepository
        async with async_session_factory() as session:
            repo = CredentialRepository(session)
            cred = await repo.get_active("gemini-aistudio")
            if cred and cred.api_key:
                gemini_key = cred.api_key
    except Exception as e:
        print(f"Failed to fetch gemini api key: {e}")

    print(f"Using key starting with: {gemini_key[:5]}...")

    options = ClaudeAgentOptions(
        model="gemini/gemini-2.5-flash",
        env={
            "ANTHROPIC_BASE_URL": "http://litellm:4000",
            "ANTHROPIC_API_KEY": gemini_key
        }
    )
    client = ClaudeSDKClient(options=options)
    try:
        await client.connect()
        print("Connected!")
    except Exception as e:
        print(f"Failed: {type(e)} {e}")
        if hasattr(e, "stderr"):
            print("STDERR:")
            print(e.stderr)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
