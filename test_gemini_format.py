import asyncio
from google import genai

async def main():
    client = genai.Client(api_key="faketest")
    try:
        req = [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]
        response = await client.aio.models.generate_content_stream(
            model='gemini-2.5-flash',
            contents=req
        )
        async for chunk in response:
            print(chunk.text)
    except Exception as e:
        print("GENAI ERROR CAUGHT:", repr(e))

if __name__ == "__main__":
    asyncio.run(main())
