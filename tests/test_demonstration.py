"""
Demonstration test to ensure state writes drop session-only fields
"""
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import bot


def test_state_write_strips_session_data():
    """write_state should not persist in-run message counters"""
    with TemporaryDirectory() as tmpdir:
        temp_state = Path(tmpdir) / "state.json"
        with patch("bot.STATE_PATH", temp_state):
            state = {
                "last_update_id": 5,
                "mode": "active",
                "messages_processed_this_session": 10,
                "session_start": "now"
            }
            bot.write_state(state)

            saved = json.loads(temp_state.read_text())
            assert "messages_processed_this_session" not in saved, "Session counters must stay in memory only"
            assert "session_start" not in saved, "Session start time should not be persisted"
            assert saved["last_update_id"] == 5
            assert saved["mode"] == "active"


if __name__ == "__main__":
    try:
        test_state_write_strips_session_data()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
