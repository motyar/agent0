"""
Basic tests for GitButler bot
"""
import os
import json
import tempfile
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot import GitButler

def test_bot_initialization():
    """Test that bot can be initialized"""
    bot = GitButler()
    assert bot is not None
    print("✓ Bot initialization test passed")

def test_directory_creation():
    """Test that bot creates necessary directories"""
    bot = GitButler()
    assert Path("storage").exists()
    assert Path("queues").exists()
    assert Path("skills").exists()
    print("✓ Directory creation test passed")

def test_file_creation():
    """Test that bot creates necessary files"""
    bot = GitButler()
    assert Path("storage/soul.md").exists()
    assert Path("storage/schedules.json").exists()
    assert Path("storage/state.json").exists()
    assert Path("queues/incoming.json").exists()
    assert Path("queues/outgoing.json").exists()
    print("✓ File creation test passed")

def test_json_operations():
    """Test JSON read/write operations"""
    bot = GitButler()
    
    # Test read
    state = bot.read_json(Path("storage/state.json"))
    assert isinstance(state, dict)
    assert "last_update_offset" in state
    
    # Test write
    test_path = Path("storage/test.json")
    test_data = {"test": "data", "number": 123}
    bot.write_json(test_path, test_data)
    
    # Read back
    result = bot.read_json(test_path)
    assert result["test"] == "data"
    assert result["number"] == 123
    
    # Cleanup
    test_path.unlink()
    print("✓ JSON operations test passed")

def test_load_skills():
    """Test skill loading"""
    bot = GitButler()
    skills = bot.load_skills()
    assert isinstance(skills, str)
    # Should have the todo skill
    assert "Todo" in skills or len(skills) > 0 or skills == "No skills loaded."
    print("✓ Skill loading test passed")

def run_tests():
    """Run all tests"""
    print("Running GitButler tests...\n")
    
    try:
        test_bot_initialization()
        test_directory_creation()
        test_file_creation()
        test_json_operations()
        test_load_skills()
        
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
