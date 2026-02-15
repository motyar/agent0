"""
Test to verify that last_update_id is updated immediately when a message is fetched
This prevents duplicate message processing in case of parallel workflow runs
"""
import os
import json
import tempfile
from pathlib import Path
import sys
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot

def test_update_id_stored_immediately():
    """Test that update_id is stored immediately in fetch_new_messages"""
    
    # Mock the Telegram API response with a new message
    mock_response = {
        "ok": True,
        "result": [
            {
                "update_id": 12345,
                "message": {
                    "message_id": 999,
                    "text": "Hello, test message",
                    "chat": {"id": "123456789"}
                }
            }
        ]
    }
    
    # Create a temporary state file
    with tempfile.TemporaryDirectory() as tmpdir:
        state_path = Path(tmpdir) / "state.json"
        initial_state = {
            "last_update_id": 12344,
            "last_run_time": "2026-02-15T08:00:00+00:00",
            "version": "1.0.0"
        }
        state_path.write_text(json.dumps(initial_state))
        
        # Patch the STATE_PATH to use our temp file
        with patch('bot.STATE_PATH', state_path):
            # Patch module-level variables for credentials
            with patch('bot.TELEGRAM_TOKEN', 'test_token'):
                with patch('bot.TELEGRAM_CHAT_ID', '123456789'):
                    # Patch requests.get to return our mock response
                    with patch('requests.get') as mock_get:
                        mock_get.return_value = Mock(
                            status_code=200,
                            json=lambda: mock_response
                        )
                        mock_get.return_value.raise_for_status = Mock()
                        
                        # Call fetch_new_messages
                        message = bot.fetch_new_messages(use_cached=False)
                        
                        # Verify message was returned
                        assert message is not None
                        assert message["update_id"] == 12345
                        assert message["message_id"] == 999
                        assert message["text"] == "Hello, test message"
                        
                        # CRITICAL: Verify that state was updated IMMEDIATELY
                        # This should happen in fetch_new_messages, not later in process_message
                        state = json.loads(state_path.read_text())
                        assert state["last_update_id"] == 12345, \
                            "last_update_id should be updated immediately to prevent duplicate processing"
                        
                        print("✓ Update ID is stored immediately after fetch - race condition fixed!")

def test_update_id_for_non_text_messages():
    """Test that update_id is also stored for non-text messages that are skipped"""
    
    # Mock response with a non-text message (e.g., photo)
    mock_response = {
        "ok": True,
        "result": [
            {
                "update_id": 12346,
                "message": {
                    "message_id": 1000,
                    "photo": [],
                    "chat": {"id": "123456789"}
                }
            }
        ]
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        state_path = Path(tmpdir) / "state.json"
        initial_state = {
            "last_update_id": 12345,
            "last_run_time": "2026-02-15T08:00:00+00:00",
            "version": "1.0.0"
        }
        state_path.write_text(json.dumps(initial_state))
        
        with patch('bot.STATE_PATH', state_path):
            with patch('bot.TELEGRAM_TOKEN', 'test_token'):
                with patch('bot.TELEGRAM_CHAT_ID', '123456789'):
                    with patch('requests.get') as mock_get:
                        mock_get.return_value = Mock(
                            status_code=200,
                            json=lambda: mock_response
                        )
                        mock_get.return_value.raise_for_status = Mock()
                        
                        message = bot.fetch_new_messages(use_cached=False)
                        
                        # Non-text message should return None
                        assert message is None
                        
                        # But state should still be updated to skip this message
                        state = json.loads(state_path.read_text())
                        assert state["last_update_id"] == 12346, \
                            "last_update_id should be updated even for non-text messages"
                        
                        print("✓ Update ID is stored for non-text messages too!")

def run_tests():
    """Run all tests"""
    print("Running update_id fix tests...\n")
    
    try:
        test_update_id_stored_immediately()
        test_update_id_for_non_text_messages()
        
        print("\n✅ All update_id fix tests passed!")
        return 0
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(run_tests())
