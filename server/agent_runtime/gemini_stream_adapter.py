import json
import uuid
import logging
from typing import Any, AsyncGenerator

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def _convert_schema(schema: dict) -> dict:
    """Recursively convert standard JSON schema to Google GenAI Schema dict."""
    if not isinstance(schema, dict):
        return schema
        
    out = {}
    
    # Map 'type' to uppercase STRING, OBJECT, ARRAY, etc if present
    if "type" in schema:
        t = schema["type"].upper()
        # JSON Schema 'boolean' -> Google 'BOOLEAN'
        # JSON Schema 'integer' -> Google 'INTEGER'
        out["type"] = t
        
    if "description" in schema:
        out["description"] = schema["description"]
        
    if "enum" in schema:
        out["enum"] = schema["enum"]
        
    if "required" in schema:
        out["required"] = schema["required"]
        
    if "properties" in schema:
        out["properties"] = {k: _convert_schema(v) for k, v in schema["properties"].items()}
        
    if "items" in schema:
        out["items"] = _convert_schema(schema["items"])
        
    return out

def translate_anthropic_to_gemini(request: dict) -> tuple[str, list, types.GenerateContentConfig]:
    """Translate Anthropic /v1/messages POST body to Gemini SDK parameters."""
    model = request.get("model", "gemini-3.1-flash-lite-preview")
    # Strip "gemini/" prefix if present
    if model.startswith("gemini/"):
        model = model[7:]
    
    anthropic_messages = request.get("messages", [])
    system_raw = request.get("system", "")
    if isinstance(system_raw, list):
        system_instruction = "\n".join(b.get("text", "") for b in system_raw if b.get("type") == "text")
    else:
        system_instruction = system_raw

    # Map Tools
    gemini_tools = []
    function_declarations = []
    
    for t in request.get("tools", []):
        func_name = t.get("name")
        desc = t.get("description", "")
        schema = t.get("input_schema", {})
        google_schema = _convert_schema(schema)
            
        decl = types.FunctionDeclaration(
            name=func_name,
            description=desc,
            parameters=google_schema
        )
        function_declarations.append(decl)
        
    if function_declarations:
        gemini_tools.append(types.Tool(function_declarations=function_declarations))
        
    # Map Messages
    tool_id_to_name = {}
    gemini_contents = []
    gemini_messages = []
    
    for msg in anthropic_messages:
        role = msg.get("role")
        gemini_role = "model" if role == "assistant" else "user"
        
        content = msg.get("content", "")
        parts = []
        
        if isinstance(content, str):
            parts.append(types.Part(text=content))
        elif isinstance(content, list):
            for block in content:
                b_type = block.get("type")
                if b_type == "text":
                    parts.append(types.Part(text=block.get("text", "")))
                elif b_type == "tool_use":
                    t_id = block.get("id")
                    t_name = block.get("name")
                    if t_id:
                        tool_id_to_name[t_id] = t_name
                    
                    new_part = types.Part(
                        function_call=types.FunctionCall(
                            name=t_name, 
                            args=block.get("input", {})
                        )
                    )
                    
                    if t_id and "_tsig_" in t_id:
                        _, tsig_hex = t_id.split("_tsig_", 1)
                        if tsig_hex:
                            import ast
                            try:
                                new_part.thought_signature = bytes.fromhex(tsig_hex)
                            except ValueError:
                                # Fallback for old sessions that stored the literal string representation
                                try:
                                    if tsig_hex.startswith("b'") or tsig_hex.startswith('b"'):
                                        new_part.thought_signature = ast.literal_eval(tsig_hex)
                                except Exception:
                                    pass
                            
                    parts.append(new_part)
                elif b_type == "tool_result":
                    t_id = block.get("tool_use_id")
                    t_name = tool_id_to_name.get(t_id, "unknown_tool")
                    
                    res_content = block.get("content", "")
                    if isinstance(res_content, list):
                        res_str = "\n".join(b.get("text", "") for b in res_content if b.get("type") == "text")
                    else:
                        res_str = str(res_content)
                        
                    parts.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=t_name,
                            response={"result": res_str}
                        )
                    ))
                    
        gemini_messages.append((gemini_role, parts))
        
    gemini_contents = []
    current_role = None
    current_parts = []
    
    for gemini_role, parts in gemini_messages:
        if gemini_role == current_role:
            current_parts.extend(parts)
        else:
            if current_role is not None:
                if not current_parts:
                    current_parts.append(types.Part(text=" "))
                gemini_contents.append(types.Content(role=current_role, parts=current_parts))
            current_role = gemini_role
            current_parts = list(parts)
            
    if current_role is not None:
        if not current_parts:
            current_parts.append(types.Part(text=" "))
        gemini_contents.append(types.Content(role=current_role, parts=current_parts))
        
    if not gemini_contents:
        gemini_contents.append(types.Content(role="user", parts=[types.Part(text=" ")]))
            
    config = types.GenerateContentConfig(
        system_instruction=system_instruction if system_instruction else None,
        tools=gemini_tools if gemini_tools else None,
        temperature=request.get("temperature", 1.0),
        max_output_tokens=request.get("max_tokens", 8192)
    )
    
    return model, gemini_contents, config


async def generate_anthropic_sse_stream(
    api_key: str, 
    request: dict
) -> AsyncGenerator[str, None]:
    """Connect to Gemini and yield SSE formatted chunks matching Anthropic's output schema."""
    try:
        model_name, contents, config = translate_anthropic_to_gemini(request)
    except Exception as e:
        logger.error(f"Failed to translate request: {e}", exc_info=True)
        yield f'event: error\ndata: {{"type": "error", "error": {{"type": "invalid_request_error", "message": "Translation error: {str(e)}"}}}} \n\n'
        return

    client = genai.Client(api_key=api_key)
    msg_id = f"msg_{uuid.uuid4().hex}"
    
    try:
        # 1. Message Start
        msg_start = {
            "type": "message_start",
            "message": {
                "id": msg_id,
                "type": "message",
                "role": "assistant",
                "content": [],
                "model": model_name,
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {"input_tokens": 0}
            }
        }
        yield f'event: message_start\ndata: {json.dumps(msg_start)}\n\n'

        response_stream = await client.aio.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=config
        )

        content_index = 0
        current_block_type = None
        has_yielded_start = False
        
        tool_call_buffer = []

        output_tokens = 0
        input_tokens = 0
        
        async for chunk in response_stream:
            # Usage tracking from chunk if available
            if chunk.usage_metadata:
                if getattr(chunk.usage_metadata, "total_token_count", None):
                    output_tokens = chunk.usage_metadata.candidates_token_count or output_tokens
                    input_tokens = chunk.usage_metadata.prompt_token_count or input_tokens

            # Iterate through parts sequentially
            if getattr(chunk, "candidates", None):
                for cand in chunk.candidates:
                    if not cand.content or not cand.content.parts: continue
                    for part in cand.content.parts:
                        if part.function_call:
                            func_call = part.function_call
                            if current_block_type == "text":
                                yield f'event: content_block_stop\ndata: {{"type": "content_block_stop", "index": {content_index}}}\n\n'
                                content_index += 1
                                has_yielded_start = False
                                
                            t_id = f"call_{uuid.uuid4().hex[:12]}"
                            tsig = getattr(part, "thought_signature", None)
                            if tsig and isinstance(tsig, bytes):
                                t_id += f"_tsig_{tsig.hex()}"
                            elif tsig and isinstance(tsig, str):
                                t_id += f"_tsig_{tsig.encode('utf-8').hex()}"
                                
                            block_start = {
                                "type": "content_block_start",
                                "index": content_index,
                                "content_block": {
                                    "type": "tool_use",
                                    "id": t_id,
                                    "name": func_call.name,
                                    "input": {}
                                }
                            }
                            yield f'event: content_block_start\ndata: {json.dumps(block_start)}\n\n'
                            
                            args_dict = func_call.args or {}
                            delta = {
                                "type": "content_block_delta",
                                "index": content_index,
                                "delta": {
                                    "type": "input_json_delta",
                                    "partial_json": json.dumps(args_dict)
                                }
                            }
                            yield f'event: content_block_delta\ndata: {json.dumps(delta)}\n\n'
                            
                            yield f'event: content_block_stop\ndata: {{"type": "content_block_stop", "index": {content_index}}}\n\n'
                            content_index += 1
                            current_block_type = None
                            
                        elif getattr(part, "text", None):
                            chunk_text = part.text
                            if current_block_type != "text":
                                current_block_type = "text"
                                block_start = {
                                    "type": "content_block_start",
                                    "index": content_index,
                                    "content_block": {"type": "text", "text": ""}
                                }
                                yield f'event: content_block_start\ndata: {json.dumps(block_start)}\n\n'
                                has_yielded_start = True
                                
                            delta = {
                                "type": "content_block_delta",
                                "index": content_index,
                                "delta": {"type": "text_delta", "text": chunk_text}
                            }
                            yield f'event: content_block_delta\ndata: {json.dumps(delta)}\n\n'

        # Close the last block if it was left open
        if current_block_type == "text" and has_yielded_start:
            yield f'event: content_block_stop\ndata: {{"type": "content_block_stop", "index": {content_index}}}\n\n'

        # Determine stop reason
        stop_reason = "end_turn"
        if current_block_type is None and content_index > 0:
            # We yielded a tool use and then nothing else -> stop_reason=tool_use
            stop_reason = "tool_use"
        
        # Message Delta (Usage)
        msg_delta = {
            "type": "message_delta",
            "delta": {"stop_reason": stop_reason},
            "usage": {"output_tokens": output_tokens}
        }
        yield f'event: message_delta\ndata: {json.dumps(msg_delta)}\n\n'

        yield 'event: message_stop\ndata: {"type": "message_stop"}\n\n'

    except Exception as e:
        logger.error(f"Gemini API Error: {e}", exc_info=True)
        # Yield the error block directly so client doesn't crash on unfulfilled usage metrics
        # If it happens mid-stream, the Anthropic SDK handles event: error
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg.lower():
            err_type = "rate_limit_error"
        elif "503" in err_msg or "unavailable" in err_msg.lower():
            err_type = "api_error"
        else:
            err_type = "api_error"
            
        yield f'event: error\ndata: {{"type": "error", "error": {{"type": "{err_type}", "message": {json.dumps(err_msg)}}}}}\n\n'

async def generate_anthropic_json(
    api_key: str, 
    request: dict
) -> dict:
    """Connect to Gemini and return a single JSON response matching Anthropic's output schema."""
    model_name, contents, config = translate_anthropic_to_gemini(request)
    client = genai.Client(api_key=api_key)
    msg_id = f"msg_{uuid.uuid4().hex}"
    
    response = await client.aio.models.generate_content(
        model=model_name,
        contents=contents,
        config=config
    )
    
    # Track usage
    output_tokens = 0
    input_tokens = 0
    if response.usage_metadata:
        if getattr(response.usage_metadata, "total_token_count", None):
            output_tokens = response.usage_metadata.candidates_token_count or 0
            input_tokens = response.usage_metadata.prompt_token_count or 0
            
    content_blocks = []
    stop_reason = "end_turn"
    
    if getattr(response, "candidates", None) and response.candidates:
        cand = response.candidates[0]
        if cand.content and cand.content.parts:
            for part in cand.content.parts:
                if part.function_call:
                    func_call = part.function_call
                    t_id = f"call_{uuid.uuid4().hex[:12]}"
                    tsig = getattr(part, "thought_signature", None)
                    if tsig and isinstance(tsig, bytes):
                        t_id += f"_tsig_{tsig.hex()}"
                    elif tsig and isinstance(tsig, str):
                        t_id += f"_tsig_{tsig.encode('utf-8').hex()}"
                        
                    content_blocks.append({
                        "type": "tool_use",
                        "id": t_id,
                        "name": func_call.name,
                        "input": func_call.args or {}
                    })
                    stop_reason = "tool_use"
                elif getattr(part, "text", None):
                    content_blocks.append({
                        "type": "text",
                        "text": part.text
                    })
                    
    return {
        "id": msg_id,
        "type": "message",
        "role": "assistant",
        "model": model_name,
        "content": content_blocks,
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }
    }
