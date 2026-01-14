def test_state_isolation():
    """Verify that each user has independent state"""
    from src.speech_state import SpeechState
    
    # Create two users
    state1 = SpeechState()
    state2 = SpeechState()
    
    # Modify user 1
    state1.speech_frame_count = 100
    state1.is_speaking = True
    
    # Verify user 2 is unaffected
    assert state2.speech_frame_count == 0, "State leaked between users!"
    assert state2.is_speaking == False, "State leaked between users!"
    
    print("✅ State isolation working correctly!")

if __name__ == "__main__":
    test_state_isolation()