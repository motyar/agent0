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

import bot

def test_directory_creation():
    """Test that bot creates necessary directories"""
    bot.ensure_directories()
    assert Path("storage").exists()
    assert Path("skills").exists()
    print("✓ Directory creation test passed")

def test_file_creation():
    """Test that bot creates necessary files"""
    bot.ensure_files()
    assert Path("storage/soul.md").exists()
    assert Path("storage/state.json").exists()
    print("✓ File creation test passed")

def test_json_operations():
    """Test JSON read/write operations"""
    from bot import read_json, write_json
    
    # Test read
    state = read_json(Path("storage/state.json"))
    assert isinstance(state, dict)
    assert "last_update_id" in state
    
    # Test write
    test_path = Path("storage/test.json")
    test_data = {"test": "data", "number": 123}
    write_json(test_path, test_data)
    
    # Read back
    result = read_json(test_path)
    assert result["test"] == "data"
    assert result["number"] == 123
    
    # Cleanup
    test_path.unlink()
    print("✓ JSON operations test passed")

def test_load_skills():
    """Test skill loading"""
    from bot import load_skills
    
    skills = load_skills()
    assert isinstance(skills, str), "Skills should be returned as a string"
    # Check if skills were loaded (either has content or explicit "no skills" message)
    has_content = len(skills) > 0
    assert has_content, "Skills loading should return content or a message"
    print("✓ Skill loading test passed")

def test_context_files_exist():
    """Test that all OpenClaw-style context files exist"""
    bot.ensure_files()
    
    # Check all context files
    assert Path("storage/soul.md").exists(), "soul.md should exist"
    
    print("✓ Context files existence test passed")

def test_context_files_readable():
    """Test that context files can be read"""
    from bot import SOUL_PATH
    
    # Read soul file
    soul_content = SOUL_PATH.read_text() if SOUL_PATH.exists() else ""
    
    # Verify they have content
    assert len(soul_content) > 0, "soul.md should have content"
    
    # Verify key sections exist
    assert "GitButler" in soul_content, "soul.md should mention GitButler"
    
    print("✓ Context files readability test passed")

def run_tests():
    """Run all tests"""
    print("Running GitButler tests...\n")
    
    try:
        test_directory_creation()
        test_file_creation()
        test_json_operations()
        test_load_skills()
        test_context_files_exist()
        test_context_files_readable()
        
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
