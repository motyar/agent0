"""
Test for outgoing queue message processing
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

from bot import GitButler

def test_multiple_outgoing_messages():
    """Test that multiple outgoing messages are sent in one run"""
    bot = GitButler()
    
    # Create test messages in outgoing queue
    test_messages = [
        {"chat_id": "123", "text": "Message 1", "reply_to_message_id": 1},
        {"chat_id": "123", "text": "Message 2", "reply_to_message_id": 2},
        {"chat_id": "123", "text": "Message 3", "reply_to_message_id": 3}
    ]
    
    outgoing_path = Path("queues/outgoing.json")
    bot.write_json(outgoing_path, test_messages)
    
    # Verify messages were written
    outgoing = bot.read_json(outgoing_path)
    assert len(outgoing) == 3, f"Expected 3 messages, got {len(outgoing)}"
    print(f"✓ Created {len(outgoing)} test messages in outgoing queue")
    
    # Mock the actual Telegram sending to avoid real API calls
    with patch('requests.post') as mock_post:
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        # Mock git operations to avoid actual commits
        with patch('subprocess.run') as mock_git:
            mock_git.return_value = Mock(returncode=0)
            
            # Simulate the run loop's outgoing message processing
            print("\nSimulating message sending loop...")
            sent_count = 0
            while bot.read_json(outgoing_path, []):
                bot.send_outgoing_messages()
                sent_count += 1
                print(f"  Sent message {sent_count}")
                
                # Safety check to prevent infinite loop
                if sent_count > 10:
                    break
            
            # Verify all messages were sent
            remaining = bot.read_json(outgoing_path)
            assert len(remaining) == 0, f"Expected 0 remaining messages, got {len(remaining)}"
            assert sent_count == 3, f"Expected to send 3 messages, sent {sent_count}"
    
    print(f"✓ Successfully sent all {sent_count} messages from queue")
    print("✓ Multiple outgoing messages test passed")
    return True

def test_empty_outgoing_queue():
    """Test that bot handles empty outgoing queue gracefully"""
    bot = GitButler()
    
    # Clear outgoing queue
    outgoing_path = Path("queues/outgoing.json")
    bot.write_json(outgoing_path, [])
    
    # This should not raise any errors
    outgoing = bot.read_json(outgoing_path)
    assert len(outgoing) == 0
    
    print("✓ Empty outgoing queue test passed")
    return True

def run_tests():
    """Run all outgoing queue tests"""
    print("Running outgoing queue tests...\n")
    
    try:
        test_empty_outgoing_queue()
        test_multiple_outgoing_messages()
        
        print("\n✅ All outgoing queue tests passed!")
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
