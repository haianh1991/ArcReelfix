import asyncio
import os
import sys

from google import genai
from google.genai import types

async def main():
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("Set GEMINI_API_KEY env for test")
        return
    client = genai.Client(api_key=api_key)
    try:
        response = await client.aio.models.generate_content_stream(
            model='gemini-2.5-flash',
            contents='hello'
        )
        async for chunk in response:
            print("CHUNK:", chunk.text)
    except Exception as e:
        print("ERROR:", repr(e))

if __name__ == "__main__":
    asyncio.run(main())
