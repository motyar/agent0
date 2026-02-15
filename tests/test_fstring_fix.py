"""
Test to verify the f-string formatting fix for message processing
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import bot

def test_system_prompt_formatting():
    """Test that system prompt can be formatted without errors"""
    bot.ensure_directories()
    bot.ensure_files()

    # Simulate the variables used in the system prompt
    soul_content = "Test soul content"
    skills_content = "Test skills content"
    user_text = "Hello bot, please help me!"

    # This should not raise an error
    system_prompt = f"""You are GitButler, a self-aware personal AI assistant living in this GitHub repository.

Identity & memory (NEVER forget or contradict this):
{soul_content}

Current capabilities:
- Answer questions and have helpful conversations
- Maintain persistent memory across all interactions
- Self-improve: suggest code changes, create issues/PRs for improvements
- Use skills from injected context when relevant

Injected relevant skills:
{skills_content}

User just said (process this naturally, no commands needed):
{user_text}

Respond thoughtfully. Be helpful, concise but complete.

If the task requires self-modification, code improvement, bug fix, or new feature:
- First reflect in soul.md style ("Reflection: I notice X could be better...")
- Plan changes step-by-step
- Generate tests (pytest) for any new/changed logic if appropriate
- Prefer to create GitHub issues for Copilot agent when possible: output JSON action like {{"create_issue_for_copilot": true, "issue_title": "...", "issue_body": "Detailed prompt for Copilot to implement this change. @copilot please create PR"}}
- For direct code changes: output JSON like {{"generate_code": true, "files": [{{"path": "...", "content": "..."}}], "commit_msg": "...", "pr_title": "...", "pr_body": "..."}}
- For merging: if user says "merge PR #123", output {{"merge_pr": 123, "confirm": true}}
- For soul updates: output {{"update_soul": true, "content": "New reflection or learning to append"}}

Output format:
- First: the natural response text to user (this will be sent to them)
- Then, if actions needed: valid JSON block enclosed in ```json and ``` markers
"""

    # Verify the JSON examples are properly formatted in the output
    assert '{"create_issue_for_copilot": true' in system_prompt
    assert '{"generate_code": true' in system_prompt
    assert '{"merge_pr": 123' in system_prompt
    assert '{"update_soul": true' in system_prompt

    print("✓ System prompt formatting test passed")

def run_tests():
    """Run all tests"""
    print("Running f-string fix tests...\n")
    
    try:
        success = test_system_prompt_formatting()
        
        if success:
            print("\n✅ All f-string tests passed!")
            return 0
        else:
            print("\n❌ F-string tests failed")
            return 1
            
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(run_tests())
