"""
Unit tests for the SqliteSaver.put() monkeypatch to ensure it handles
unserializable objects like HumanMessage correctly.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from langchain_core.messages import HumanMessage, AIMessage

# Import the monkeypatch functions
from backend.utils.langgraph_serialization import _safe_put, _deep_serialize_for_json, _prepare_args_for_put


class TestSqliteSaverMonkeypatch:
    """Test suite for the robust SqliteSaver monkeypatch."""

    def test_deep_serialize_for_json_with_serializable_object(self):
        """Test that already JSON-serializable objects pass through unchanged."""
        test_obj = {"key": "value", "number": 42, "list": [1, 2, 3]}
        result = _deep_serialize_for_json(test_obj)
        assert result == test_obj
        # Should be JSON-serializable
        json.dumps(result)

    def test_deep_serialize_for_json_with_human_message(self):
        """Test that HumanMessage objects are properly serialized."""
        human_msg = HumanMessage(content="Hello world")
        result = _deep_serialize_for_json(human_msg)
        
        # Result should be a dict with type and data fields
        assert isinstance(result, dict)
        assert "type" in result
        assert "data" in result
        assert result["type"] == "human"
        assert result["data"]["content"] == "Hello world"
        
        # Should be JSON-serializable
        json.dumps(result)

    def test_deep_serialize_for_json_with_nested_messages(self):
        """Test that nested structures containing messages are properly serialized."""
        test_obj = {
            "messages": [
                HumanMessage(content="Human input"),
                AIMessage(content="AI response")
            ],
            "metadata": {"session": "test123"}
        }
        result = _deep_serialize_for_json(test_obj)
        
        # Messages should be serialized to dicts
        assert isinstance(result["messages"][0], dict)
        assert isinstance(result["messages"][1], dict)
        assert result["messages"][0]["type"] == "human"
        assert result["messages"][1]["type"] == "ai"
        
        # Should be JSON-serializable
        json.dumps(result)

    def test_prepare_args_for_put(self):
        """Test that args and kwargs are properly prepared for put()."""
        human_msg = HumanMessage(content="Test message")
        args = (human_msg, {"normal": "data"})
        kwargs = {"metadata": {"session": "test"}, "message": human_msg}
        
        new_args, new_kwargs = _prepare_args_for_put(args, kwargs)
        
        # All should be JSON-serializable
        json.dumps(new_args)
        json.dumps(new_kwargs)
        
        # Check that messages were serialized
        assert isinstance(new_args[0], dict)
        assert isinstance(new_kwargs["message"], dict)

    @patch('backend.utils.langgraph_serialization._original_put')
    def test_safe_put_with_serializable_args(self, mock_original_put):
        """Test _safe_put with already serializable arguments."""
        mock_original_put.return_value = "success"
        
        args = ({"data": "test"},)
        kwargs = {"metadata": {"session": "123"}}
        
        result = _safe_put(None, *args, **kwargs)
        
        assert result == "success"
        mock_original_put.assert_called_once()
        # Should be called with self as first argument, then the args
        call_args = mock_original_put.call_args
        # call_args[0] contains positional args (including self)
        # call_args[1] contains keyword args
        assert len(call_args[0]) == 2  # self + original arg
        assert call_args[0][1] == args[0]  # the actual data arg
        assert call_args[1] == kwargs

    @patch('backend.utils.langgraph_serialization._original_put')
    def test_safe_put_with_human_message_args(self, mock_original_put):
        """Test _safe_put with HumanMessage arguments that need serialization."""
        mock_original_put.return_value = "success"
        
        human_msg = HumanMessage(content="Test message")
        args = (human_msg,)
        kwargs = {"metadata": {"message": human_msg}}
        
        result = _safe_put(None, *args, **kwargs)
        
        assert result == "success"
        mock_original_put.assert_called_once()
        
        # Check that the called args contain serialized messages
        call_args = mock_original_put.call_args
        # call_args[0][0] is self, call_args[0][1] is the actual argument
        serialized_arg = call_args[0][1]
        serialized_kwarg = call_args[1]["metadata"]["message"]
        
        assert isinstance(serialized_arg, dict)
        assert serialized_arg["type"] == "human"
        assert isinstance(serialized_kwarg, dict)
        assert serialized_kwarg["type"] == "human"

    @patch('backend.utils.langgraph_serialization._original_put')
    def test_safe_put_with_typeerror_first_attempt_then_success(self, mock_original_put):
        """Test _safe_put when first attempt fails but aggressive serialization succeeds."""
        # First call raises TypeError, second call succeeds
        mock_original_put.side_effect = [
            TypeError("Object of type HumanMessage is not JSON serializable"),
            "success"
        ]
        
        human_msg = HumanMessage(content="Test message")
        args = (human_msg,)
        kwargs = {"metadata": {"session": "test"}}
        
        result = _safe_put(None, *args, **kwargs)
        
        assert result == "success"
        assert mock_original_put.call_count == 2

    @patch('backend.utils.langgraph_serialization._original_put')
    @patch('backend.utils.langgraph_serialization.log')
    def test_safe_put_complete_failure_with_logging(self, mock_log, mock_original_put):
        """Test _safe_put when both attempts fail and proper logging occurs."""
        # Both attempts raise TypeError
        mock_original_put.side_effect = TypeError("Persistent serialization error")
        
        human_msg = HumanMessage(content="Test message")
        args = (human_msg,)
        kwargs = {"metadata": {"session": "test"}}
        
        # Should raise the original TypeError
        with pytest.raises(TypeError, match="Persistent serialization error"):
            _safe_put(None, *args, **kwargs)
        
        # Should have called original put twice
        assert mock_original_put.call_count == 2
        
        # Should have logged error messages
        mock_log.error.assert_called()
        
        # Check that specific error messages were logged
        error_calls = [call[0][0] for call in mock_log.error.call_args_list]
        assert any("attempting aggressive serialization" in msg for msg in error_calls)
        assert any("Aggressive serialization also failed" in msg for msg in error_calls)

    def test_deep_serialize_fallback_to_repr(self):
        """Test fallback to repr when serialize_deep fails."""
        # Create an object that will cause serialize_deep to raise an exception
        # We'll patch serialize_deep to raise an exception
        with patch('backend.utils.langgraph_serialization.serialize_deep') as mock_serialize:
            mock_serialize.side_effect = Exception("serialize_deep failed")
            
            class UnserializableObject:
                def __repr__(self):
                    return "UnserializableObject(data=complex)"
            
            obj = UnserializableObject()
            result = _deep_serialize_for_json(obj)
            
            # Should fall back to repr wrapper since serialize_deep raised an exception
            assert isinstance(result, dict)
            assert "__unserializable_repr__" in result
            assert result["__unserializable_repr__"] == "UnserializableObject(data=complex)"
            
            # Should be JSON-serializable now
            json.dumps(result)

    def test_complex_nested_structure_serialization(self):
        """Test serialization of complex nested structures with mixed content."""
        complex_obj = {
            "level1": {
                "level2": [
                    HumanMessage(content="Nested message"),
                    {"normal": "data", "number": 42},
                    [AIMessage(content="AI in list")]
                ],
                "simple": "string"
            },
            "top_level_message": HumanMessage(content="Top level")
        }
        
        result = _deep_serialize_for_json(complex_obj)
        
        # Should be JSON-serializable
        json.dumps(result)
        
        # Check that nested messages were serialized
        assert isinstance(result["level1"]["level2"][0], dict)
        assert result["level1"]["level2"][0]["type"] == "human"
        assert isinstance(result["level1"]["level2"][2][0], dict)
        assert result["level1"]["level2"][2][0]["type"] == "ai"
        assert isinstance(result["top_level_message"], dict)
        assert result["top_level_message"]["type"] == "human"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
