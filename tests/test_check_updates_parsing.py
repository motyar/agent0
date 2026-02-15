"""
Tests for check_updates.sh to ensure it reads state correctly.
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path


def test_check_updates_uses_stored_update_id():
    """Ensure check_updates.sh reads last_update_id even with spaced JSON."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        storage = tmp_path / "storage"
        storage.mkdir()

        state_path = storage / "state.json"
        state_path.write_text(json.dumps({
            "last_update_id": 41,
            "last_run_time": "2026-02-15T08:00:00+00:00",
            "version": "1.0.0"
        }, indent=2))

        fake_args_path = tmp_path / "curl_args.txt"
        fake_curl = tmp_path / "curl"
        fake_curl.write_text(
            "#!/bin/bash\n"
            "args_file=${FAKE_CURL_ARGS:-/tmp/fake_curl_args.txt}\n"
            "printf '%s' \"$*\" > \"$args_file\"\n"
            "cat <<'JSON'\n"
            "{\"ok\":true,\"result\":[{\"update_id\":42,\"message\":{\"message_id\":1,\"chat\":{\"id\":1},\"text\":\"hi\"}}]}\n"
            "JSON\n"
        )
        fake_curl.chmod(0o755)

        env = os.environ.copy()
        env.update({
            "TELEGRAM_TOKEN": "token",
            "FAKE_CURL_ARGS": str(fake_args_path),
            "PATH": f"{tmp_path}:{env.get('PATH', '')}",
        })

        script_path = Path(__file__).parent.parent / "check_updates.sh"
        result = subprocess.run(
            ["bash", str(script_path)],
            cwd=tmp_path,
            env=env,
            capture_output=True,
            text=True,
        )

        assert result.returncode == 0, result.stderr
        assert fake_args_path.exists(), "Fake curl did not record arguments"
        args_used = fake_args_path.read_text()
        assert "offset=42" in args_used, f"Expected offset to use stored update_id, got: {args_used}"

        cache_file = Path("/tmp/gitbutler/telegram_updates.json")
        if cache_file.exists():
            cache_file.unlink()


def run_tests():
    print("Running check_updates parsing tests...\n")
    try:
        test_check_updates_uses_stored_update_id()
        print("\n✅ check_updates parsing tests passed!")
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
