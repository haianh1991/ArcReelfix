from anthropic import AsyncAnthropic

try:
    client = AsyncAnthropic(api_key="AIzaSy...dummy", base_url="http://localhost:4000")
    print("Success")
except Exception as e:
    print(f"Error: {e}")
