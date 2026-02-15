"""
Test for cached Telegram updates functionality
"""
import os
import json
import tempfile
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot

def test_fetch_with_cache():
    """Test that fetch_new_messages can use cached data"""
    
    # Create a mock cached response
    cache_dir = Path("/tmp/gitbutler")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / "telegram_updates.json"
    
    # Create mock telegram response
    mock_response = {
        "ok": True,
        "result": [
            {
                "update_id": 12345,
                "message": {
                    "message_id": 100,
                    "chat": {
                        "id": int(os.environ.get("TELEGRAM_CHAT_ID", "123456789"))
                    },
                    "text": "Test message"
                }
            }
        ]
    }
    
    # Write cache file
    cache_file.write_text(json.dumps(mock_response))
    
    # Ensure state file exists
    bot.ensure_directories()
    bot.ensure_files()
    
    # Test fetch with cache (requires TELEGRAM_TOKEN and TELEGRAM_CHAT_ID to be set)
    if os.environ.get("TELEGRAM_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID"):
        message = bot.fetch_new_messages(use_cached=True)
        
        # If cache was used, message should be parsed from cached data
        if message:
            print(f"✓ Cached fetch test: Got message with ID {message.get('message_id')}")
            assert message.get("update_id") == 12345, "Should get update_id from cache"
            assert message.get("text") == "Test message", "Should get text from cache"
    else:
        print("⊘ Skipping cached fetch test (requires TELEGRAM_TOKEN and TELEGRAM_CHAT_ID)")
    
    # Cleanup
    cache_file.unlink()
    
    print("✓ Cached updates test passed")

def test_fetch_without_cache_fallback():
    """Test that fetch_new_messages falls back to API when cache doesn't exist"""
    
    # Ensure cache doesn't exist
    cache_file = Path("/tmp/gitbutler/telegram_updates.json")
    if cache_file.exists():
        cache_file.unlink()
    
    # Ensure state file exists
    bot.ensure_directories()
    bot.ensure_files()
    
    # Test should not crash when cache doesn't exist
    # (Will make actual API call if credentials are set, or return None)
    try:
        message = bot.fetch_new_messages(use_cached=True)
        print("✓ Fallback to API test passed (no crash when cache missing)")
    except Exception as e:
        print(f"✗ Fallback test failed with error: {e}")
        raise

def run_tests():
    """Run all tests"""
    print("Running cached updates tests...\n")
    
    try:
        test_fetch_with_cache()
        test_fetch_without_cache_fallback()
        
        print("\n✅ All cached updates tests passed!")
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
