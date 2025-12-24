"""
Optional LangGraph Checkpointer Monkeypatch for Diagnostic Purposes
This module patches SqliteSaver.put() to ensure deep serialization of all args
before persistence, preventing TypeError from unserializable objects like HumanMessage.
"""

import json
import logging
from typing import Any
from backend.utils.message_utils import serialize_deep, deserialize_deep

log = logging.getLogger(__name__)

# Store original put method
_original_put = None

def _deep_serialize_for_json(obj: Any) -> Any:
    """
    Ensure 'obj' is JSON-serializable by converting any nested message objects
    using serialize_deep(). If obj is a mapping/list/tuple, walk recursively.
    Return the transformed object (a JSON-safe structure).
    """
    try:
        # Best-effort: try json.dumps directly
        json.dumps(obj)
        return obj
    except (TypeError, OverflowError):
        # Fallback: use serialize_deep if available for known message types
        try:
            return serialize_deep(obj)
        except Exception as e:
            # Last resort: convert to repr with marker so it's recoverable in logs
            log.warning("[CHECKPOINTER_MONKEYPATCH] serialize_deep() failed: %s. Using repr()", e)
            return {"__unserializable_repr__": repr(obj)}

def _prepare_args_for_put(args, kwargs):
    """
    Walk through args/kwargs and deep-serialize any items that would be JSON-dumped.
    This is conservative: transform dict/list/tuple and known metadata slots.
    """
    new_args = []
    for a in args:
        new_args.append(_deep_serialize_for_json(a))
    new_kwargs = {}
    for k, v in kwargs.items():
        new_kwargs[k] = _deep_serialize_for_json(v)
    return tuple(new_args), new_kwargs

def _safe_put(self, *args, **kwargs):
    """
    Monkeypatched wrapper around the original SqliteSaver.put().
    This function will:
      1. Pre-serialize args/kwargs to JSON-safe structures.
      2. Attempt to call the original put().
      3. If original still raises TypeError due to JSON serialization, try a second pass
         where we aggressively replace dict/list contents using serialize_deep() and retry.
      4. If still failing, log full context and re-raise.
    """
    try:
        # Step A: best-effort pre-serialize
        new_args, new_kwargs = _prepare_args_for_put(args, kwargs)
        return _original_put(self, *new_args, **new_kwargs)
    except TypeError as e_first:
        log.error("[CHECKPOINTER_MONKEYPATCH] TypeError in put(); attempting aggressive serialization. Error: %s", e_first)
        try:
            # Step B: aggressive serialization pass: run serialize_deep on each arg/kw
            aggressive_args = tuple(serialize_deep(a) for a in args)
            aggressive_kwargs = {k: serialize_deep(v) for k, v in kwargs.items()}
            return _original_put(self, *aggressive_args, **aggressive_kwargs)
        except Exception as e_second:
            # Final failure: dump debug info and re-raise original TypeError for traceability
            try:
                log.error("[CHECKPOINTER_MONKEYPATCH] Aggressive serialization also failed. Dumping args for debug.")
                log.error("ARGS (repr): %s", repr(args))
                log.error("KWARGS (repr): %s", repr(kwargs))
                # Also attempt to serialize to JSON for logs if possible
                try:
                    log.error("ARGS (json): %s", json.dumps(_deep_serialize_for_json(args)))
                    log.error("KWARGS (json): %s", json.dumps(_deep_serialize_for_json(kwargs)))
                except Exception:
                    log.debug("[CHECKPOINTER_MONKEYPATCH] Could not json-dump args after aggressive conversion.")
            except Exception:
                log.exception("[CHECKPOINTER_MONKEYPATCH] Failed while dumping debug info.")
            # Re-raise the original TypeError to preserve stack context
            raise

def install_patch():
    """Install the monkeypatch for SqliteSaver.put()."""
    global _original_put
    
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        
        if _original_put is None:
            _original_put = SqliteSaver.put
            
        SqliteSaver.put = _safe_put
        logging.info("LangGraph diagnostics patch installed successfully")
        
    except ImportError as e:
        logging.warning("Failed to install LangGraph diagnostics patch: %s", e)

def uninstall_patch():
    """Uninstall the monkeypatch to restore original behavior."""
    global _original_put
    
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        
        if _original_put is not None:
            SqliteSaver.put = _original_put
            logging.info("LangGraph diagnostics patch uninstalled")
            
    except ImportError as e:
        logging.warning("Failed to uninstall LangGraph diagnostics patch: %s")

# Auto-install when imported
install_patch()
