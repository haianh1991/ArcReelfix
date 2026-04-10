import asyncio
import os
import sys

from google import genai
from google.genai import types

async def main():
    api_key = None
    from lib.db.engine import safe_session_factory
    from lib.db.repositories.credential_repository import CredentialRepository
    async with safe_session_factory() as session:
        cred_repo = CredentialRepository(session)
        cred = await cred_repo.get_active("gemini-aistudio")
        if cred and cred.api_key:
            api_key = cred.api_key
    
    if not api_key:
        print("No API Key in DB!")
        return
        
    print("Found API Key starting with:", api_key[:10])
    client = genai.Client(api_key=api_key)
    
    print("Testing generate_content_stream...")
    try:
        response = await client.aio.models.generate_content_stream(
            model='gemini-2.5-flash',
            contents='test'
        )
        print("Response received, iterating chunks...")
        async for chunk in response:
            print("CHUNK:", chunk.text)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
