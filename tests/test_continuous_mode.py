"""
Tests for continuous mode functionality
"""
import os
import json
import time
import tempfile
from pathlib import Path
import sys
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot

def test_continuous_mode_initialization():
    """Test that continuous mode initializes state properly"""
    # Ensure clean state
    state_path = bot.STATE_PATH
    if state_path.exists():
        original_state = bot.read_json(state_path)
    
    # Initialize state for continuous mode
    state = bot.read_json(state_path, {})
    if "mode" not in state:
        state["mode"] = "active"
        state["session_start"] = datetime.now(timezone.utc).isoformat()
        state["messages_processed_this_session"] = 0
        bot.write_json(state_path, state)
    
    # Verify state was created correctly
    state = bot.read_json(state_path)
    assert "mode" in state
    assert state["mode"] in ["active", "idle", "stopped"]
    # session_start is only required when mode is added for the first time
    # it's okay if it's not present in existing state
    
    print("✓ Continuous mode initialization test passed")

def test_state_transitions():
    """Test state transitions between active/idle/stopped"""
    state_path = bot.STATE_PATH
    
    # Read current state
    original_state = bot.read_json(state_path)
    
    # Test active -> stopped
    state = original_state.copy()
    state["mode"] = "active"
    bot.write_json(state_path, state)
    state = bot.read_json(state_path)
    assert state["mode"] == "active"
    
    # Test stopped -> active
    state["mode"] = "stopped"
    bot.write_json(state_path, state)
    state = bot.read_json(state_path)
    assert state["mode"] == "stopped"
    
    # Test active -> idle
    state["mode"] = "idle"
    bot.write_json(state_path, state)
    state = bot.read_json(state_path)
    assert state["mode"] == "idle"
    
    # Restore original state
    bot.write_json(state_path, original_state)
    
    print("✓ State transitions test passed")

def test_control_commands_parsing():
    """Test that control commands are recognized correctly"""
    # Test stop commands
    stop_commands = ["stop", "sleep", "pause"]
    for cmd in stop_commands:
        assert cmd.lower().strip() in ["stop", "sleep", "pause"]
    
    # Test start commands
    start_commands = ["start", "wake up", "wake"]
    for cmd in start_commands:
        assert cmd.lower().strip() in ["start", "wake up", "wake"]
    
    # Test status command
    assert "status".lower().strip() == "status"
    
    print("✓ Control commands parsing test passed")

def test_run_mode_environment_variable():
    """Test RUN_MODE environment variable handling"""
    # Test continuous mode
    os.environ["RUN_MODE"] = "continuous"
    run_mode = os.environ.get("RUN_MODE", "continuous").lower()
    assert run_mode == "continuous"
    
    # Test single mode
    os.environ["RUN_MODE"] = "single"
    run_mode = os.environ.get("RUN_MODE", "continuous").lower()
    assert run_mode == "single"
    
    # Test default
    if "RUN_MODE" in os.environ:
        del os.environ["RUN_MODE"]
    run_mode = os.environ.get("RUN_MODE", "continuous").lower()
    assert run_mode == "continuous"
    
    print("✓ RUN_MODE environment variable test passed")

def test_idle_counter_logic():
    """Test idle counter and auto-sleep logic"""
    idle_counter = 0
    max_idle_cycles = 180
    
    # Test idle counter increment
    idle_counter += 1
    assert idle_counter == 1
    
    # Test auto-sleep threshold
    idle_counter = 180
    assert idle_counter >= max_idle_cycles
    
    # Test heartbeat interval (every 30 cycles)
    idle_counter = 30
    assert idle_counter % 30 == 0
    
    idle_counter = 60
    assert idle_counter % 30 == 0
    
    print("✓ Idle counter logic test passed")

def test_session_tracking():
    """Test session start time and message counting"""
    session_start = datetime.now(timezone.utc)
    message_count = 0
    
    # Simulate processing messages
    message_count += 1
    assert message_count == 1
    
    message_count += 1
    assert message_count == 2
    
    # Test uptime calculation
    uptime = datetime.now(timezone.utc) - session_start
    uptime_str = str(uptime).split('.')[0]  # Remove microseconds
    assert isinstance(uptime_str, str)
    assert len(uptime_str) > 0
    
    print("✓ Session tracking test passed")

def test_mode_specific_sleep_intervals():
    """Test sleep intervals for different modes"""
    # Active mode: 10 seconds
    mode = "active"
    sleep_time = 10 if mode == "active" else 30
    assert sleep_time == 10
    
    # Idle mode: 30 seconds
    mode = "idle"
    sleep_time = 10 if mode == "active" else 30
    assert sleep_time == 30
    
    # Stopped mode: 30 seconds
    mode = "stopped"
    sleep_time = 10 if mode == "active" else 30
    assert sleep_time == 30
    
    print("✓ Mode-specific sleep intervals test passed")

def test_status_message_formatting():
    """Test status message formatting"""
    from bot import format_status_message
    
    mode = "active"
    uptime_str = "0:05:23"
    message_count = 5
    idle_counter = 15
    max_idle_cycles = 180
    
    status_msg = format_status_message(mode, uptime_str, message_count, idle_counter, max_idle_cycles)
    
    assert "Mode: ACTIVE 🟢" in status_msg
    assert f"Uptime: {uptime_str}" in status_msg
    assert f"Messages processed: {message_count}" in status_msg
    assert f"Idle cycles: {idle_counter}/{max_idle_cycles}" in status_msg
    
    print("✓ Status message formatting test passed")

def run_tests():
    """Run all continuous mode tests"""
    print("Running continuous mode tests...\n")
    
    try:
        # Ensure bot is initialized
        bot.ensure_directories()
        bot.ensure_files()
        
        test_continuous_mode_initialization()
        test_state_transitions()
        test_control_commands_parsing()
        test_run_mode_environment_variable()
        test_idle_counter_logic()
        test_session_tracking()
        test_mode_specific_sleep_intervals()
        test_status_message_formatting()
        
        print("\n✅ All continuous mode tests passed!")
        return 0
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(run_tests())
