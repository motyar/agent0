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
    assert isinstance(skills, str), "Skills should be returned as a string"
    # Check if skills were loaded (either has content or explicit "no skills" message)
    has_content = len(skills) > 0
    assert has_content, "Skills loading should return content or a message"
    print("✓ Skill loading test passed")

def test_context_files_exist():
    """Test that all OpenClaw-style context files exist"""
    bot = GitButler()
    
    # Check all context files
    assert Path("storage/soul.md").exists(), "soul.md should exist"
    assert Path("storage/IDENTITY.md").exists(), "IDENTITY.md should exist"
    assert Path("storage/USER.md").exists(), "USER.md should exist"
    assert Path("storage/MEMORY.md").exists(), "MEMORY.md should exist"
    assert Path("storage/AGENTS.md").exists(), "AGENTS.md should exist"
    assert Path("storage/TOOLS.md").exists(), "TOOLS.md should exist"
    
    print("✓ Context files existence test passed")

def test_context_files_readable():
    """Test that all context files can be read"""
    from bot import (SOUL_PATH, IDENTITY_PATH, USER_PATH, MEMORY_PATH, 
                     AGENTS_PATH, TOOLS_PATH)
    
    # Read all context files
    soul_content = SOUL_PATH.read_text()
    identity_content = IDENTITY_PATH.read_text()
    user_content = USER_PATH.read_text()
    memory_content = MEMORY_PATH.read_text()
    agents_content = AGENTS_PATH.read_text()
    tools_content = TOOLS_PATH.read_text()
    
    # Verify they have content
    assert len(soul_content) > 0, "soul.md should have content"
    assert len(identity_content) > 0, "IDENTITY.md should have content"
    assert len(user_content) > 0, "USER.md should have content"
    assert len(memory_content) > 0, "MEMORY.md should have content"
    assert len(agents_content) > 0, "AGENTS.md should have content"
    assert len(tools_content) > 0, "TOOLS.md should have content"
    
    # Verify key sections exist
    assert "GitButler" in soul_content, "soul.md should mention GitButler"
    assert "Identity Card" in identity_content, "IDENTITY.md should have Identity Card section"
    assert "User Profile" in user_content, "USER.md should have User Profile section"
    assert "Memory" in memory_content, "MEMORY.md should have Memory section"
    assert "Operating Instructions" in agents_content, "AGENTS.md should have Operating Instructions"
    assert "Tools" in tools_content, "TOOLS.md should have Tools section"
    
    print("✓ Context files readability test passed")

def run_tests():
    """Run all tests"""
    print("Running GitButler tests...\n")
    
    try:
        test_bot_initialization()
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
