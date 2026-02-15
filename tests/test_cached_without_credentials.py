"""
Test that cached updates work without Telegram credentials
"""
import os
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot


def test_fetch_cached_without_credentials():
    """Test that fetch_new_messages works with cache but no credentials"""

    # Ensure no credentials are set
    original_token = os.environ.get("TELEGRAM_TOKEN")
    original_chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    try:
        # Unset credentials
        if "TELEGRAM_TOKEN" in os.environ:
            del os.environ["TELEGRAM_TOKEN"]
        if "TELEGRAM_CHAT_ID" in os.environ:
            del os.environ["TELEGRAM_CHAT_ID"]

        # Force bot to reload environment variables
        bot.TELEGRAM_TOKEN = None
        bot.TELEGRAM_CHAT_ID = None

        # Create cache directory and file
        cache_file = bot.TELEGRAM_UPDATES_CACHE
        cache_file.parent.mkdir(parents=True, exist_ok=True)

        mock_response = {
            "ok": True,
            "result": [
                {
                    "update_id": 1000,
                    "message": {
                        "message_id": 200,
                        "chat": {
                            "id": 123456789
                        },
                        "text": "Test message from cache"
                    }
                }
            ]
        }

        cache_file.write_text(json.dumps(mock_response))

        # Ensure storage exists
        bot.ensure_directories()
        bot.ensure_files()

        # Test: Should successfully fetch from cache despite no credentials
        message = bot.fetch_new_messages(use_cached=True)

        # Verify
        assert message is not None, "Should return message from cache"
        assert message.get("update_id") == 1000, "Should get correct update_id"
        assert message.get("text") == "Test message from cache", "Should get correct text"
        assert message.get("chat_id") == "123456789", "Should get correct chat_id"

        print("✓ Cached fetch without credentials test passed")

        # Cleanup
        cache_file.unlink()

    finally:
        # Restore original credentials
        if original_token:
            os.environ["TELEGRAM_TOKEN"] = original_token
            bot.TELEGRAM_TOKEN = original_token
        if original_chat_id:
            os.environ["TELEGRAM_CHAT_ID"] = original_chat_id
            bot.TELEGRAM_CHAT_ID = original_chat_id


def test_fetch_without_cache_and_without_credentials():
    """Test that fetch_new_messages properly handles missing credentials when cache is not available"""

    # Ensure no credentials are set
    original_token = os.environ.get("TELEGRAM_TOKEN")
    original_chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    try:
        # Unset credentials
        if "TELEGRAM_TOKEN" in os.environ:
            del os.environ["TELEGRAM_TOKEN"]
        if "TELEGRAM_CHAT_ID" in os.environ:
            del os.environ["TELEGRAM_CHAT_ID"]

        # Force bot to reload environment variables
        bot.TELEGRAM_TOKEN = None
        bot.TELEGRAM_CHAT_ID = None

        # Ensure cache doesn't exist
        cache_file = bot.TELEGRAM_UPDATES_CACHE
        if cache_file.exists():
            cache_file.unlink()

        # Ensure storage exists
        bot.ensure_directories()
        bot.ensure_files()

        # Test: Should return None and print credentials message
        message = bot.fetch_new_messages(use_cached=True)

        assert message is None, "Should return None when no cache and no credentials"

        print("✓ No cache and no credentials test passed")

    finally:
        # Restore original credentials
        if original_token:
            os.environ["TELEGRAM_TOKEN"] = original_token
            bot.TELEGRAM_TOKEN = original_token
        if original_chat_id:
            os.environ["TELEGRAM_CHAT_ID"] = original_chat_id
            bot.TELEGRAM_CHAT_ID = original_chat_id


def run_tests():
    """Run all tests"""
    print("Running tests for cached updates without credentials...\n")

    try:
        test_fetch_cached_without_credentials()
        test_fetch_without_cache_and_without_credentials()

        print("\n✅ All tests passed!")
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
