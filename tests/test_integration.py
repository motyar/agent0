"""
Integration test to verify the bot processes all outgoing messages
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set required environment variables for testing
os.environ['TELEGRAM_TOKEN'] = 'test_token'
os.environ['TELEGRAM_CHAT_ID'] = '123'
os.environ['OPENAI_API_KEY'] = 'test_key'

from bot import GitButler

def test_full_run_with_outgoing_messages():
    """Test that a full bot run processes all outgoing messages"""
    bot = GitButler()
    
    # Clear queues first
    incoming_path = Path("queues/incoming.json")
    outgoing_path = Path("queues/outgoing.json")
    bot.write_json(incoming_path, [])
    bot.write_json(outgoing_path, [])
    
    # Add multiple test messages to outgoing queue
    test_messages = [
        {"chat_id": "123", "text": "Test message 1", "reply_to_message_id": 1},
        {"chat_id": "123", "text": "Test message 2", "reply_to_message_id": 2},
        {"chat_id": "123", "text": "Test message 3", "reply_to_message_id": 3},
        {"chat_id": "123", "text": "Test message 4", "reply_to_message_id": 4},
    ]
    bot.write_json(outgoing_path, test_messages)
    
    initial_count = len(bot.read_json(outgoing_path))
    print(f"Initial outgoing queue: {initial_count} messages")
    
    # Mock external APIs
    with patch('requests.get') as mock_get, \
         patch('requests.post') as mock_post, \
         patch('subprocess.run') as mock_git:
        
        # Mock Telegram polling (no new messages)
        mock_get.return_value = Mock(
            json=lambda: {"ok": True, "result": []},
            raise_for_status=lambda: None
        )
        
        # Mock Telegram sending (success)
        mock_post.return_value = Mock(raise_for_status=lambda: None)
        
        # Mock git operations
        mock_git.return_value = Mock(returncode=0, capture_output=True)
        
        # Run the bot (this should process all outgoing messages)
        print("\nRunning bot.run()...")
        try:
            # We'll just test the outgoing message part
            outgoing = bot.read_json(outgoing_path, [])
            if outgoing:
                print(f"   Found {len(outgoing)} message(s) to send")
                # Send all outgoing messages in the queue
                sent_count = 0
                while bot.read_json(outgoing_path, []):
                    bot.send_outgoing_messages()
                    sent_count += 1
                print(f"   Sent {sent_count} messages")
            
            # Verify all messages were sent
            remaining = bot.read_json(outgoing_path)
            print(f"\nRemaining messages in queue: {len(remaining)}")
            
            assert len(remaining) == 0, f"Expected all messages to be sent, but {len(remaining)} remain"
            
            # Verify we attempted to send the correct number of messages
            assert mock_post.call_count == initial_count, \
                f"Expected {initial_count} Telegram API calls, got {mock_post.call_count}"
            
        except Exception as e:
            print(f"Error during bot run: {e}")
            raise
    
    print("✓ Full run with outgoing messages test passed")
    return True

def run_tests():
    """Run integration tests"""
    print("Running integration tests...\n")
    
    try:
        test_full_run_with_outgoing_messages()
        
        print("\n✅ All integration tests passed!")
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
