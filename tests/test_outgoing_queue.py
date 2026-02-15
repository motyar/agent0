"""
Test for direct message sending (no queue)
"""
import json
import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set required environment variables for testing
os.environ['TELEGRAM_TOKEN'] = 'test_token'
os.environ['TELEGRAM_CHAT_ID'] = '123'

import bot

def test_send_telegram_message():
    """Test sending a message directly to Telegram"""
    # Mock the actual Telegram sending to avoid real API calls
    with patch('requests.post') as mock_post:
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        # Send a test message
        result = bot.send_telegram_message("123", "Test message", 1)
        
        # Verify it was called
        assert result == True, "Message sending should succeed"
        assert mock_post.called, "requests.post should be called"
        
        # Verify the API was called with correct parameters
        call_args = mock_post.call_args
        assert call_args is not None
        json_data = call_args[1]['json']
        assert json_data['chat_id'] == "123"
        assert json_data['text'] == "Test message"
        assert json_data['reply_to_message_id'] == 1
    
    print("✓ Direct message sending test passed")
    return True

def test_send_telegram_message_without_reply():
    """Test sending a message without reply_to"""
    # Mock the actual Telegram sending to avoid real API calls
    with patch('requests.post') as mock_post:
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        # Send a test message without reply_to
        result = bot.send_telegram_message("123", "Test message")
        
        # Verify it was called
        assert result == True, "Message sending should succeed"
        assert mock_post.called, "requests.post should be called"
        
        # Verify the API was called with correct parameters
        call_args = mock_post.call_args
        assert call_args is not None
        json_data = call_args[1]['json']
        assert json_data['chat_id'] == "123"
        assert json_data['text'] == "Test message"
        assert 'reply_to_message_id' not in json_data or json_data['reply_to_message_id'] is None
    
    print("✓ Direct message sending without reply test passed")
    return True

def run_tests():
    """Run all message sending tests"""
    print("Running direct message sending tests...\n")
    
    try:
        test_send_telegram_message()
        test_send_telegram_message_without_reply()
        
        print("\n✅ All direct message sending tests passed!")
        return 0
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(run_tests())
