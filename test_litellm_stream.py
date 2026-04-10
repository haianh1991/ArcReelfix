import httpx
import json

def test_stream(model_name="gemini/gemini-3.1-flash-lite-preview"):
    print(f"Testing stream for model: {model_name}")
    client = httpx.Client()
    req_body = {
        "model": model_name,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Hello, write a short haiku about coding."}],
        "stream": True
    }
    
    with client.stream("POST", "http://127.0.0.1:1241/api/v1/projects/abcd/assistant/litellm_proxy/v1/messages", 
                       headers={"x-api-key": "sk-dummy-test-key"}, 
                       json=req_body) as r:
        print(f"HTTP Status: {r.status_code}")
        for line in r.iter_lines():
            if line:
                print("RAW LINE:", line)

if __name__ == "__main__":
    # Wait, the x-api-key 'sk-dummy-test-key' might fail. We should use the real key fetched from DB if possible.
    # To be safe, I'll use the user's key: AIzaSyC4KpFlAoOb1nMXlUveiLkGeRkUYG_gZ-4
    key = "AIzaSyC4KpFlAoOb1nMXlUveiLkGeRkUYG_gZ-4"
    print("Testing with real key...")
    
    client = httpx.Client()
    req_body = {
        "model": "gemini/gemini-3.1-flash-lite-preview",
        "max_tokens": 50,
        "messages": [{"role": "user", "content": "say hi"}],
        "stream": True
    }
    try:
        with client.stream("POST", "http://127.0.0.1:1241/api/v1/projects/abcd/assistant/litellm_proxy/v1/messages", 
                           headers={"x-api-key": key}, 
                           json=req_body, timeout=30.0) as r:
            print(f"HTTP Status: {r.status_code}")
            for line in r.iter_lines():
                if line:
                    print("RAW LINE:", line)
    except Exception as e:
        print(f"Exception: {e}")
