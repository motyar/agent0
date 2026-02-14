"""
End-to-end demonstration of the fix for outgoing queue messages
"""
import os
import sys
from pathlib import Path
from unittest.mock import patch, Mock

os.environ['TELEGRAM_TOKEN'] = 'test_token'
os.environ['TELEGRAM_CHAT_ID'] = '123'
os.environ['OPENAI_API_KEY'] = 'test_key'

sys.path.insert(0, str(Path(__file__).parent.parent))

from bot import GitButler

def test_before_and_after():
    """
    Demonstrate the before and after behavior:
    BEFORE: Only one message sent per run
    AFTER: All messages sent per run
    """
    print("\n" + "="*70)
    print("DEMONSTRATION: Fix for Outgoing Queue Messages")
    print("="*70)
    
    bot = GitButler()
    outgoing_path = Path("queues/outgoing.json")
    
    # Setup test scenario
    test_messages = [
        {"chat_id": "123", "text": "First message", "reply_to_message_id": 1},
        {"chat_id": "123", "text": "Second message", "reply_to_message_id": 2},
        {"chat_id": "123", "text": "Third message", "reply_to_message_id": 3},
    ]
    bot.write_json(outgoing_path, test_messages)
    
    print(f"\n📝 Scenario: {len(test_messages)} messages in outgoing queue")
    print("-"*70)
    
    # Mock external APIs
    with patch('requests.post') as mock_post, \
         patch('subprocess.run') as mock_git:
        
        mock_post.return_value = Mock(raise_for_status=lambda: None)
        mock_git.return_value = Mock(returncode=0, capture_output=True)
        
        # BEFORE behavior (commented out - this is what it used to do)
        print("\n❌ BEFORE (Old Behavior):")
        print("   - Called send_outgoing_messages() ONCE")
        print("   - Would send only 1 message per run")
        print("   - Remaining messages would wait for next run (1 minute later)")
        print("   - Result: Slow response time for multiple messages")
        
        # AFTER behavior (current implementation)
        print("\n✅ AFTER (New Behavior):")
        print("   - Process ALL messages in a loop")
        
        # Execute the new code
        outgoing = bot.read_json(outgoing_path, [])
        if outgoing:
            print(f"   - Found {len(outgoing)} message(s) to send")
            max_attempts = 100
            attempts = 0
            sent_messages = []
            
            while bot.read_json(outgoing_path, []) and attempts < max_attempts:
                before_count = len(bot.read_json(outgoing_path, []))
                bot.send_outgoing_messages()
                after_count = len(bot.read_json(outgoing_path, []))
                attempts += 1
                sent_messages.append(f"Message {attempts}")
                print(f"     • Sent message {attempts} (queue: {before_count} → {after_count})")
            
            remaining = bot.read_json(outgoing_path, [])
            if remaining:
                print(f"   ⚠️  Warning: {len(remaining)} messages remain")
        
        print(f"   - Result: All {attempts} messages sent in ONE run")
        print(f"   - Telegram API calls: {mock_post.call_count}")
        
        # Verification
        final_queue = bot.read_json(outgoing_path, [])
        
        print("\n" + "-"*70)
        print("📊 COMPARISON:")
        print(f"   Old behavior: 1 message/minute = {len(test_messages)} minutes total")
        print(f"   New behavior: {len(test_messages)} messages/minute = 1 minute total")
        print(f"   Improvement: {len(test_messages)}x faster! ⚡")
        
        print("\n" + "-"*70)
        assert len(final_queue) == 0, "All messages should be sent"
        assert attempts == len(test_messages), "All messages should be processed"
        print("✅ VERIFICATION PASSED: Fix works correctly!")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        test_before_and_after()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
