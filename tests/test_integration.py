"""
Integration test to verify session notifications and in-memory message caching
"""
import os
import sys
from pathlib import Path
from unittest.mock import patch

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot


def test_session_cache_lifecycle():
    """Ensure the session cache is in-memory and cleared after stop notification"""
    # Ensure credentials are present for notifications
    os.environ["TELEGRAM_TOKEN"] = "test_token"
    os.environ["TELEGRAM_CHAT_ID"] = "123"
    bot.TELEGRAM_TOKEN = "test_token"
    bot.TELEGRAM_CHAT_ID = "123"

    # Reset cache
    bot.SESSION_CACHE["messages"].clear()
    bot.SESSION_CACHE["start_notified"] = False
    bot.SESSION_CACHE["stop_notified"] = False
    bot.SESSION_CACHE["start_time"] = None

    with patch("bot.send_telegram_message") as mock_send:
        mock_send.return_value = True

        bot.start_session()
        # Add two messages to the in-memory cache
        bot.record_session_message({"message_id": 1, "text": "Hello"})
        bot.record_session_message({"message_id": 2, "text": "World"})

        assert len(bot.SESSION_CACHE["messages"]) == 2, "Messages should stay in memory during the run"

        bot.end_session("completed")
        bot.end_session("completed")  # second call should not send again

        # Start + stop notifications only once each
        assert mock_send.call_count == 2, "Notifications should be sent exactly once at start and stop"
        assert bot.SESSION_CACHE["messages"] == [], "Cache should be cleared after the session ends"
        assert bot.SESSION_CACHE["start_time"] is None, "Session timing should reset after stopping"


def run_tests():
    """Run integration tests"""
    print("Running integration tests...\n")
    
    try:
        test_session_cache_lifecycle()
        
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
