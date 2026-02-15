"""
Test that cached updates work without Telegram credentials
"""
import os
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

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


def test_live_fetch_without_chat_id():
    """Test that live polling works when chat ID is not configured"""

    original_token = os.environ.get("TELEGRAM_TOKEN")
    original_chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    try:
        os.environ["TELEGRAM_TOKEN"] = "test_token"
        if "TELEGRAM_CHAT_ID" in os.environ:
            del os.environ["TELEGRAM_CHAT_ID"]

        bot.TELEGRAM_TOKEN = "test_token"
        bot.TELEGRAM_CHAT_ID = None

        mock_response = {
            "ok": True,
            "result": [
                {
                    "update_id": 500,
                    "message": {
                        "message_id": 5,
                        "text": "Live message",
                        "chat": {"id": "999"}
                    }
                }
            ]
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            state_path = Path(tmpdir) / "state.json"
            state_path.write_text(json.dumps({
                "last_update_id": 0,
                "last_run_time": "2026-02-15T00:00:00+00:00",
                "version": "1.0.0"
            }))

            with patch("bot.STATE_PATH", state_path):
                    with patch("requests.get") as mock_get:
                        mock_get.return_value = Mock(
                            json=lambda: mock_response,
                            raise_for_status=lambda: None
                        )

                        message = bot.fetch_new_messages(use_cached=False)

        assert message is not None, "Should fetch message even without chat ID"
        # The chat ID should be stored in environment, but not in the global variable
        assert os.environ.get("TELEGRAM_CHAT_ID") == "999"
        assert message["update_id"] == 500
        assert message["message_id"] == 5
        assert message["text"] == "Live message"
        assert message["chat_id"] == "999"

        print("✓ Live fetch without chat ID test passed")

    finally:
        if original_token:
            os.environ["TELEGRAM_TOKEN"] = original_token
            bot.TELEGRAM_TOKEN = original_token
        else:
            if "TELEGRAM_TOKEN" in os.environ:
                del os.environ["TELEGRAM_TOKEN"]
            bot.TELEGRAM_TOKEN = None

        if original_chat_id:
            os.environ["TELEGRAM_CHAT_ID"] = original_chat_id
            bot.TELEGRAM_CHAT_ID = original_chat_id
        else:
            if "TELEGRAM_CHAT_ID" in os.environ:
                del os.environ["TELEGRAM_CHAT_ID"]
            bot.TELEGRAM_CHAT_ID = None


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
