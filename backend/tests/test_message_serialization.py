def test_roundtrip_messages():
    from backend.utils.message_utils import serialize_messages, deserialize_messages
    from langchain_core.messages import HumanMessage, AIMessage
    
    msgs = [HumanMessage(content="hi"), AIMessage(content="hello")]
    restored = deserialize_messages(serialize_messages(msgs))
    
    assert restored[0].content == "hi"
    assert restored[1].content == "hello"
    assert isinstance(restored[0], HumanMessage)
    assert isinstance(restored[1], AIMessage)
    print("✅ Message serialization roundtrip test passed")

def test_serialize_deep_roundtrip():
    from backend.utils.message_utils import serialize_deep, deserialize_deep
    from langchain_core.messages import HumanMessage
    
    original = {"conversation_history": [HumanMessage(content="test")]}
    serialized = serialize_deep(original)
    
    # Verify serialization produces dict
    assert isinstance(serialized["conversation_history"][0], dict)
    assert serialized["conversation_history"][0]["type"] == "human"
    assert serialized["conversation_history"][0]["data"]["content"] == "test"
    
    # Verify deserialization reconstructs BaseMessage
    deserialized = deserialize_deep(serialized)
    assert isinstance(deserialized["conversation_history"][0], HumanMessage)
    assert deserialized["conversation_history"][0].content == "test"
    
    print("✅ Deep serialization roundtrip test passed")

def test_serialize_deep_complex_structure():
    from backend.utils.message_utils import serialize_deep, deserialize_deep
    from langchain_core.messages import HumanMessage, AIMessage
    
    # Test nested structure with various types
    original = {
        "conversation_history": [HumanMessage(content="hello"), AIMessage(content="hi there")],
        "nested": {
            "messages": [HumanMessage(content="nested message")],
            "simple_list": [1, 2, 3],
            "simple_dict": {"key": "value"}
        },
        "simple_value": "test"
    }
    
    serialized = serialize_deep(original)
    
    # Verify all BaseMessage objects are serialized to dicts
    assert isinstance(serialized["conversation_history"][0], dict)
    assert isinstance(serialized["conversation_history"][1], dict)
    assert isinstance(serialized["nested"]["messages"][0], dict)
    
    # Verify simple types are preserved
    assert serialized["nested"]["simple_list"] == [1, 2, 3]
    assert serialized["nested"]["simple_dict"] == {"key": "value"}
    assert serialized["simple_value"] == "test"
    
    # Verify roundtrip
    deserialized = deserialize_deep(serialized)
    assert isinstance(deserialized["conversation_history"][0], HumanMessage)
    assert isinstance(deserialized["conversation_history"][1], AIMessage)
    assert isinstance(deserialized["nested"]["messages"][0], HumanMessage)
    assert deserialized["nested"]["simple_list"] == [1, 2, 3]
    assert deserialized["nested"]["simple_dict"] == {"key": "value"}
    assert deserialized["simple_value"] == "test"
    
    print("✅ Deep serialization complex structure test passed")

if __name__ == "__main__":
    test_roundtrip_messages()
    test_serialize_deep_roundtrip()
    test_serialize_deep_complex_structure()
