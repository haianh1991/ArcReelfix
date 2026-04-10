import asyncio
import os
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, "/app")
from server.app import app
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv("/app/.env")

from server.auth import create_token

def main():
    token = create_token({"sub": "admin"})
    client = TestClient(app)
    
    resp = client.post(
        "/api/v1/projects/test-d46b4b35/assistant/sessions/send",
        json={"text": "hello"}
    )
    print("STATUS", resp.status_code)
    print("BODY", resp.text)
    
if __name__ == "__main__":
    main()
