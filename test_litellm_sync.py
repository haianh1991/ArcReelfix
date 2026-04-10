import httpx
import json

def test_sync():
    client = httpx.Client()
    req_body = {
        "model": "gemini/gemini-3.1-flash-lite-preview",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Please read the file project.json"}],
        "tools": [{
            "name": "ReadFile",
            "description": "Read a file",
            "input_schema": {
                "type": "object",
                "properties": {"file_path": {"type": "string"}},
                "required": ["file_path"]
            }
        }],
        "stream": False
    }
    key = "AIzaSyC4KpFlAoOb1nMXlUveiLkGeRkUYG_gZ-4" 
    
    try:
        r = client.post("http://127.0.0.1:1241/api/v1/projects/abcd/assistant/litellm_proxy/v1/messages", 
                        headers={"x-api-key": key}, 
                        json=req_body, timeout=30.0)
        print(f"HTTP Status: {r.status_code}")
        print("Response JSON:")
        print(json.dumps(r.json(), indent=2))
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_sync()
