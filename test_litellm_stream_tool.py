import httpx
import json

def test_stream_tool(model_name="gemini/gemini-3.1-flash-lite-preview"):
    print(f"Testing stream for model: {model_name} with tools")
    client = httpx.Client()
    req_body = {
        "model": model_name,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Please read the file project.json"}],
        "tools": [{
            "name": "ReadFile",
            "description": "Read a file from the filesystem",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"}
                },
                "required": ["file_path"]
            }
        }],
        "stream": True
    }
    
    key = "AIzaSyC4KpFlAoOb1nMXlUveiLkGeRkUYG_gZ-4" # Use the user's active key
    print("Testing with real key...")
    
    try:
        with client.stream("POST", "http://127.0.0.1:1241/api/v1/projects/test-opt/assistant/litellm_proxy/v1/messages", 
                           headers={"x-api-key": key}, 
                           json={**req_body, "stream": False}, timeout=30.0) as r:
            print(f"HTTP Status: {r.status_code}")
            for line in r.iter_lines():
                if line:
                    print("RAW LINE:", line)
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_stream_tool()
