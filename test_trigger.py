import requests

resp = requests.post(
    "http://localhost:1241/api/v1/projects/test-d46b4b35/assistant/sessions/send",
    json={"text": "test proxy"}
)
print(resp.status_code)
print(resp.text)
