import requests
import json

payload = {
    "message": "test",
    "chat_history": [],
    "currentActiveScope": {},
    "globalOverview": []
}

res = requests.post("http://127.0.0.1:8000/api/v1/tutor/chat", json=payload)
print(res.status_code)
print(res.text)
