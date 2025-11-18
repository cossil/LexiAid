from langchain_core.messages import BaseMessage, messages_to_dict, messages_from_dict
from typing import List, Any, Union

def serialize_messages(messages: List[Any]) -> List[Any]:
    """Convert list of BaseMessage objects to list of dicts for JSON storage."""
    if not isinstance(messages, list):
        return messages
    return [
        messages_to_dict([m])[0] if isinstance(m, BaseMessage) else m
        for m in messages
    ]

def deserialize_messages(messages: List[Any]) -> List[Any]:
    """Rebuild BaseMessage objects from list of dicts."""
    if not isinstance(messages, list):
        return messages
    return [
        messages_from_dict([m])[0] if isinstance(m, dict) and "type" in m else m
        for m in messages
    ]

def _is_base_message(obj: Any) -> bool:
    """Check if object is a BaseMessage instance."""
    return isinstance(obj, BaseMessage)

def serialize_deep(obj: Any) -> Any:
    """Recursively walk obj and replace any BaseMessage with dicts."""
    if _is_base_message(obj):
        return messages_to_dict([obj])[0]
    if isinstance(obj, dict):
        return {k: serialize_deep(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_deep(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(serialize_deep(v) for v in obj)
    return obj

def deserialize_deep(obj: Any) -> Any:
    """Reverse of serialize_deep, reconstruct BaseMessage objects where possible."""
    if isinstance(obj, dict) and "type" in obj and "data" in obj:
        try:
            return messages_from_dict([obj])[0]
        except Exception:
            return obj
    if isinstance(obj, dict):
        return {k: deserialize_deep(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deserialize_deep(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(deserialize_deep(v) for v in obj)
    return obj
