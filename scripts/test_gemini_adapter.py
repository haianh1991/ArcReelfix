"""
File test độc lập để hiển thị cách Gemini Adapter trả về luồng thời gian thực.
Chạy file này: uv run python -m scripts.test_gemini_adapter
"""
import sys
import asyncio
from typing import Any

# Tạm mượn path để tránh lỗi import
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from server.agent_runtime.gemini_stream_adapter import DummyGeminiSDKClient

async def main():
    print("=" * 60)
    print("[BAT DAU] TEST LOP PHIEN DICH GEMINI ADAPTER (DUMMY)")
    print("=" * 60)
    
    # Giả lập tham số
    options = type("Options", (), {"session_id": "test-session-123"})()
    
    # Khởi tạo
    client = DummyGeminiSDKClient(options=options, model_name="gemini-2.5-flash")
    
    # Thử kết nối
    await client.connect()
    
    # Gắn câu prompt
    prompt = "Bạn có đó không?"
    await client.query(prompt)
    
    print("\n--- BẮT ĐẦU NHẬN RAW EVENT TỪ ADAPTER ---")
    
    # Đọc luồng trả về (y hệt như cách mà SessionManager của ArcReel đang làm)
    async for message in client.receive_response():
        # Lọc ra các log để user dễ nhìn:
        m_type = message.get("type")
        
        if m_type == "stream_event":
            import json
            print(json.dumps(message, indent=2))
                
        elif m_type == "result":
            print(f"\n[Result] Dừng cuốc điện thoại. Trạng thái: {message.get('session_status')} - {message.get('subtype')}")
            
    # Ngắt kết nối
    await client.disconnect()

if __name__ == "__main__":
    # Chạy asynio event loop
    asyncio.run(main())
