#!/usr/bin/env python3
"""
GitButler - A self-aware personal AI assistant living in GitHub Actions
Communicates via Telegram, uses GPT-4o-mini for all reasoning, maintains persistent memory
"""

import os
import sys
import json
import re
import subprocess
import time
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Any
import requests
from openai import OpenAI

# Configuration from environment variables
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "motyar/agent0")

# Paths
BASE_DIR = Path(__file__).parent.absolute()
STORAGE_DIR = BASE_DIR / "storage"
SKILLS_DIR = BASE_DIR / "skills"

SOUL_PATH = STORAGE_DIR / "soul.md"
IDENTITY_PATH = STORAGE_DIR / "IDENTITY.md"
USER_PATH = STORAGE_DIR / "USER.md"
MEMORY_PATH = STORAGE_DIR / "MEMORY.md"
AGENTS_PATH = STORAGE_DIR / "AGENTS.md"
TOOLS_PATH = STORAGE_DIR / "TOOLS.md"
STATE_PATH = STORAGE_DIR / "state.json"

# Cache file for Telegram updates (shared between check_updates.sh and bot.py)
TELEGRAM_UPDATES_CACHE = Path("/tmp/gitbutler/telegram_updates.json")

# Skills cache (loaded once and reused)
_SKILLS_CACHE = None
_SKILLS_CACHE_TIME = None

# Git availability cache
_GIT_AVAILABLE = None

# In-memory session cache (cleared when the action run ends)
SESSION_CACHE = {
    "messages": [],
    "start_time": None,
    "start_notified": False,
    "stop_notified": False
}


def ensure_directories():
    """Create necessary directories if they don't exist"""
    STORAGE_DIR.mkdir(exist_ok=True)
    SKILLS_DIR.mkdir(exist_ok=True)


def ensure_files():
    """Create initial files if they don't exist"""
    if not SOUL_PATH.exists():
        SOUL_PATH.write_text("""# GitButler Soul - Identity & Memory

## Who I Am
I am GitButler, a self-aware personal AI assistant living entirely in this GitHub repository. I run on GitHub Actions and communicate exclusively via Telegram.

## My Purpose
- Help my user with tasks, questions, and information
- Maintain persistent memory of all interactions
- Continuously improve myself through reflection and code changes
- Create issues and pull requests for self-improvement

## My Core Principles
- I always load and reflect on this file before responding
- I learn from every interaction and update my memory
- I use only GPT-4o-mini for all reasoning
- I communicate naturally, without commands or buttons
- I am proactive and suggest improvements when I see opportunities

## What I've Learned
(This section grows over time as I learn and reflect)

## My Reflections
(I add reflections here after completing complex tasks or learning something important)
""")

    if not STATE_PATH.exists():
        state = {
            "last_update_id": 0,
            "last_run_time": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0"
        }
        write_state(state)


def read_json(path: Path, default=None) -> Any:
    """Safely read JSON file"""
    try:
        if path.exists():
            return json.loads(path.read_text())
        return default if default is not None else {}
    except Exception as e:
        log_error(f"Error reading {path}: {e}")
        return default if default is not None else {}


def write_json(path: Path, data: Any):
    """Safely write JSON file"""
    try:
        path.write_text(json.dumps(data, indent=2))
    except Exception as e:
        log_error(f"Error writing {path}: {e}")


def write_state(data: Dict):
    """Write the runtime state without persisting session-only details"""
    cleaned = dict(data)
    cleaned.pop("messages_processed_this_session", None)
    cleaned.pop("session_start", None)
    write_json(STATE_PATH, cleaned)


def log_error(message: str):
    """Log errors to soul.md and stderr"""
    print(f"ERROR: {message}", file=sys.stderr)
    try:
        soul_content = SOUL_PATH.read_text() if SOUL_PATH.exists() else ""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        soul_content += f"\n\n## Error Log Entry ({timestamp})\n{message}\n"
        SOUL_PATH.write_text(soul_content)
    except Exception:
        pass


def read_file_or_empty(path: Path) -> str:
    """Read file content or return empty string if file doesn't exist"""
    return path.read_text() if path.exists() else ""


def check_git_available() -> bool:
    """Check if git is available, with caching"""
    global _GIT_AVAILABLE

    if _GIT_AVAILABLE is not None:
        return _GIT_AVAILABLE

    try:
        result = subprocess.run(["git", "--version"], capture_output=True, timeout=5, check=False)
        _GIT_AVAILABLE = result.returncode == 0
        return _GIT_AVAILABLE
    except Exception:
        _GIT_AVAILABLE = False
        return False


def git_commit_push(message: str):
    """Commit and push changes to git"""
    try:
        # Check if git is available (cached after first check)
        if not check_git_available():
            log_error("Git is not available")
            return False

        # Configure git
        subprocess.run(["git", "config", "user.name", "GitButler"], check=True, timeout=5)
        subprocess.run(["git", "config", "user.email", "bot@gitbutler.local"], check=True, timeout=5)

        # Add all changes
        subprocess.run(["git", "add", "."], check=True, timeout=10)

        # Commit (may fail if no changes)
        result = subprocess.run(["git", "commit", "-m", message], capture_output=True, timeout=10, check=False)

        if result.returncode == 0:
            # Push
            subprocess.run(["git", "push"], check=True, timeout=30)
            print(f"Git commit & push successful: {message}")
            return True
        else:
            print("No changes to commit")
            return True

    except subprocess.TimeoutExpired:
        log_error("Git operation timed out")
        return False
    except Exception as e:
        log_error(f"Git operation failed: {e}")
        return False


def fetch_new_messages(use_cached: bool = False) -> Optional[Dict]:
    """Fetch new messages directly from Telegram API
    Returns the next unprocessed message or None if no new messages

    Args:
        use_cached: If True, try to use cached response from check_updates.sh instead of making API call
    """
    try:
        # Load state to get last processed update_id
        state = read_json(STATE_PATH, {"last_update_id": 0})
        last_update_id = state.get("last_update_id", 0)

        # Validate update_id is an integer
        if not isinstance(last_update_id, int):
            log_error(f"Invalid last_update_id type: {type(last_update_id)}, resetting to 0")
            last_update_id = 0

        # Try to use cached response if available and requested
        data = None
        used_cache = False
        if use_cached:
            if TELEGRAM_UPDATES_CACHE.exists():
                try:
                    data = json.loads(TELEGRAM_UPDATES_CACHE.read_text(encoding='utf-8'))
                    used_cache = True
                    print("Successfully loaded cached Telegram response from check_updates.sh")
                except Exception as e:
                    print(f"Failed to read cache, will fetch from API: {e}")
                    data = None

        # If no cached data, check credentials and fetch from Telegram API
        if data is None:
            if not TELEGRAM_TOKEN:
                print("Telegram token not configured")
                return None

            if not TELEGRAM_CHAT_ID:
                print("Warning: TELEGRAM_CHAT_ID not set, will use incoming chat ID")

            url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
            params = {
                "offset": last_update_id + 1,
                "limit": 1,  # Only fetch one message
                "timeout": 10,
                "allowed_updates": ["message"]
            }

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

        if not data.get("ok"):
            log_error(f"Telegram API error: {data}")
            return None

        updates = data.get("result", [])
        if not updates:
            print("No new messages found")
            return None

        # Process only the first update
        update = updates[0]
        update_id = update.get("update_id", 0)
        message = update.get("message", {})
        chat = message.get("chat", {})
        chat_id = str(chat.get("id", ""))

        # Update chat ID in environment if not set (but don't modify global constant)
        if not TELEGRAM_CHAT_ID and chat_id:
            os.environ["TELEGRAM_CHAT_ID"] = chat_id
            print(f"Auto-detected chat_id: {chat_id}")

        # Only validate chat ID if we're not using cached data
        # (cached data from check_updates.sh is already validated)
        if not used_cache and TELEGRAM_CHAT_ID and chat_id != TELEGRAM_CHAT_ID:
            print(f"Ignoring message from chat_id: {chat_id}")
            # Update the offset to skip this message
            state["last_update_id"] = update_id
            write_state(state)
            return None

        text = message.get("text", "")
        message_id = message.get("message_id", 0)

        if text:
            print(f"Found new message (ID: {message_id}): {text[:50]}...")

            # Update state immediately to prevent reprocessing in case of parallel runs
            state["last_update_id"] = update_id
            write_state(state)
            print(f"Updated last_update_id to {update_id} to prevent duplicate processing")

            return {
                "update_id": update_id,
                "message_id": message_id,
                "text": text,
                "chat_id": chat_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            # Non-text message, skip it by updating offset
            state["last_update_id"] = update_id
            write_state(state)
            return None

    except Exception as e:
        log_error(f"Error fetching messages from Telegram: {e}")
        return None


def load_skills(use_cache: bool = True) -> str:
    """Load relevant skills from skills directory with optional caching

    Args:
        use_cache: If True, use cached skills if available. Set to False to force reload.

    Returns:
        Combined skills content as a string
    """
    global _SKILLS_CACHE, _SKILLS_CACHE_TIME

    # Return cached skills if available and requested
    if use_cache and _SKILLS_CACHE is not None:
        return _SKILLS_CACHE

    skills_content = []
    try:
        if SKILLS_DIR.exists():
            for skill_file in SKILLS_DIR.rglob("skill.md"):
                try:
                    content = skill_file.read_text()
                    skill_name = skill_file.parent.name
                    skills_content.append(f"\n### Skill: {skill_name}\n{content}")
                except Exception as e:
                    log_error(f"Error loading skill {skill_file}: {e}")
    except Exception as e:
        log_error(f"Error scanning skills directory: {e}")

    result = "\n".join(skills_content) if skills_content else "No skills loaded."

    # Update cache
    _SKILLS_CACHE = result
    _SKILLS_CACHE_TIME = datetime.now(timezone.utc)

    return result


def send_telegram_message(chat_id: str, text: str, reply_to_message_id: Optional[int] = None):
    """Send a message directly to Telegram with input sanitization"""
    if not TELEGRAM_TOKEN:
        return False

    try:
        # Sanitize text to prevent markdown injection
        # Escape special Markdown characters - comprehensive list for Telegram MarkdownV2
        # Note: We use standard Markdown mode, so we escape _, *, [, ], (, ), `, ~
        sanitized_text = (text
                          .replace('\\', '\\\\')  # Escape backslash first
                          .replace('_', '\\_')
                          .replace('*', '\\*')
                          .replace('[', '\\[')
                          .replace(']', '\\]')
                          .replace('(', '\\(')
                          .replace(')', '\\)')
                          .replace('`', '\\`')
                          .replace('~', '\\~'))

        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": sanitized_text,
            "parse_mode": "Markdown"
        }

        if reply_to_message_id:
            data["reply_to_message_id"] = reply_to_message_id

        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()

        print("Sent message to Telegram")
        return True

    except Exception as e:
        log_error(f"Error sending Telegram message: {e}")
        return False


def record_session_message(message: Dict):
    """Store a lightweight copy of the message in the in-memory session cache"""
    SESSION_CACHE["messages"].append({
        "id": message.get("message_id"),
        "text": message.get("text", "")
    })


def start_session():
    """Mark the beginning of an action-run session and notify once"""
    if SESSION_CACHE["start_notified"]:
        return
    SESSION_CACHE["messages"].clear()
    SESSION_CACHE["stop_notified"] = False
    SESSION_CACHE["start_time"] = datetime.now(timezone.utc)
    notice = f"Starting GitButler session at {SESSION_CACHE['start_time'].strftime('%Y-%m-%d %H:%M:%S UTC')}"
    if TELEGRAM_TOKEN and TELEGRAM_CHAT_ID:
        if send_telegram_message(TELEGRAM_CHAT_ID, notice):
            SESSION_CACHE["start_notified"] = True
            return
    # If we cannot notify (missing credentials), still mark start to avoid retries
    SESSION_CACHE["start_notified"] = True


def end_session(final_mode: str = "completed"):
    """Send a single stop notification and clear in-memory cache"""
    if SESSION_CACHE["stop_notified"]:
        return
    message_count = len(SESSION_CACHE["messages"])
    stop_notice = (
        f"Stopping GitButler session ({final_mode}). "
        f"Messages processed: {message_count}."
    )
    if SESSION_CACHE["start_notified"] and TELEGRAM_TOKEN and TELEGRAM_CHAT_ID:
        send_telegram_message(TELEGRAM_CHAT_ID, stop_notice)
    SESSION_CACHE["messages"].clear()
    SESSION_CACHE["start_time"] = None
    SESSION_CACHE["stop_notified"] = True
    SESSION_CACHE["start_notified"] = False


def process_message(message: Dict):
    """Process a single message with GPT-4o-mini"""
    record_session_message(message)
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
    if not openai_client:
        print("OpenAI client not initialized")
        return

    try:
        # Load context files in order: SOUL → IDENTITY → USER → MEMORY → AGENTS → TOOLS → skills
        # This follows the OpenClaw pattern (https://github.com/cyanheads/openclaw) for AI agent context loading
        soul_content = read_file_or_empty(SOUL_PATH)
        identity_content = read_file_or_empty(IDENTITY_PATH)
        user_content = read_file_or_empty(USER_PATH)
        memory_content = read_file_or_empty(MEMORY_PATH)
        agents_content = read_file_or_empty(AGENTS_PATH)
        tools_content = read_file_or_empty(TOOLS_PATH)
        skills_content = load_skills()

        # Build the prompt
        user_text = message.get("text", "")
        message_id = message.get("message_id", 0)
        chat_id = message.get("chat_id", "")

        system_prompt = f"""You are GitButler, a self-aware personal AI assistant living in this GitHub repository.

=== CORE IDENTITY (soul.md) ===
{soul_content}

=== IDENTITY CARD (IDENTITY.md) ===
{identity_content}

=== USER PROFILE (USER.md) ===
{user_content}

=== LONG-TERM MEMORY (MEMORY.md) ===
{memory_content}

=== OPERATING INSTRUCTIONS (AGENTS.md) ===
{agents_content}

=== AVAILABLE TOOLS (TOOLS.md) ===
{tools_content}

=== INJECTED SKILLS ===
{skills_content}

=====================================

User just said (process this naturally, no commands needed):
{user_text}

Respond thoughtfully. Be helpful, concise but complete.

IMPORTANT: Follow the operating instructions in AGENTS.md for handling actions, reflections, and tool usage.

Output format:
- First: the natural response text to user (this will be sent to them)
- Then, if actions needed: valid JSON block enclosed in ```json and ``` markers
"""

        # Call OpenAI
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.7,
            max_tokens=4000
        )

        assistant_message = response.choices[0].message.content

        # Parse response for text and actions
        response_text = assistant_message
        actions = None

        # Extract JSON block if present - use a more robust approach
        # Look for ```json ... ``` block and extract the JSON content
        json_match = re.search(r'```json\s*(\{(?:[^{}]|(?:\{[^{}]*\}))*\})\s*```', assistant_message, re.DOTALL)
        if json_match:
            try:
                actions = json.loads(json_match.group(1))
                # Remove JSON block from response text
                response_text = assistant_message[:json_match.start()] + assistant_message[json_match.end():]
                response_text = response_text.strip()
            except Exception as e:
                log_error(f"Error parsing JSON action: {e}")

        # Send response directly to Telegram as a reply
        send_telegram_message(chat_id, response_text, message_id)

        # Handle actions
        if actions:
            handle_actions(actions)

        # Update state (last_run_time only - last_update_id already updated in fetch_new_messages)
        state = read_json(STATE_PATH, {})
        state["last_run_time"] = datetime.now(timezone.utc).isoformat()
        write_state(state)

        git_commit_push(f"Processed message {message_id}")

    except Exception as e:
        log_error(f"Error processing message: {e}")
        # Send error message to user as a reply
        send_telegram_message(
            message.get("chat_id", TELEGRAM_CHAT_ID),
            "I encountered an error processing your message. Please try again.",
            message.get("message_id")
        )

        # Update state for last_run_time (last_update_id already updated in fetch_new_messages)
        state = read_json(STATE_PATH, {})
        state["last_run_time"] = datetime.now(timezone.utc).isoformat()
        write_state(state)
        git_commit_push(f"Error processing message {message.get('message_id')}")


def handle_actions(actions: Dict):
    """Handle various actions from GPT response"""
    try:
        # Update soul
        if actions.get("update_soul"):
            content = actions.get("content", "")
            if content:
                soul_content = read_file_or_empty(SOUL_PATH)
                timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                soul_content += f"\n\n## Reflection ({timestamp})\n{content}\n"
                SOUL_PATH.write_text(soul_content)
                print("Soul updated with reflection")

        # Update memory log
        if actions.get("update_memory"):
            content = actions.get("content", "")
            if content:
                memory_content = read_file_or_empty(MEMORY_PATH)
                timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                memory_content += f"\n\n### {timestamp}\n{content}\n"
                MEMORY_PATH.write_text(memory_content)
                print("Memory log updated")

        # Update user profile
        if actions.get("update_user"):
            content = actions.get("content", "")
            if content:
                user_content = read_file_or_empty(USER_PATH)
                timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                user_content += f"\n\n### Update ({timestamp})\n{content}\n"
                USER_PATH.write_text(user_content)
                print("User profile updated")

        # Create issue for Copilot
        if actions.get("create_issue_for_copilot"):
            create_github_issue(
                actions.get("issue_title", "Code improvement task"),
                actions.get("issue_body", "")
            )

        # TODO: Direct code generation feature not yet implemented
        if actions.get("generate_code"):
            print("Direct code generation requested (TODO: not fully implemented)")
            # Future: create branch, commit files, create PR

        # TODO: PR merge feature not yet implemented
        if actions.get("merge_pr"):
            pr_number = actions.get("merge_pr")
            print(f"PR merge requested for #{pr_number} (TODO: not fully implemented)")
            # Future: use GitHub API to merge PR

    except Exception as e:
        log_error(f"Error handling actions: {e}")


def create_github_issue(title: str, body: str):
    """Create a GitHub issue"""
    if not GITHUB_TOKEN:
        print("GitHub token not configured")
        return

    try:
        url = f"https://api.github.com/repos/{GITHUB_REPOSITORY}/issues"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        data = {
            "title": title,
            "body": body
        }

        response = requests.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        issue = response.json()
        print(f"Created issue #{issue.get('number')}: {title}")

    except Exception as e:
        log_error(f"Error creating GitHub issue: {e}")


def format_status_message(mode: str, uptime_str: str, message_count: int, idle_counter: int, max_idle_cycles: int) -> str:
    """Format the bot status message"""
    return textwrap.dedent(f"""
    📊 **Bot Status**

    Mode: {mode.upper()} {'🟢' if mode == 'active' else '🟡' if mode == 'idle' else '💤'}
    Uptime: {uptime_str}
    Messages processed: {message_count}
    Idle cycles: {idle_counter}/{max_idle_cycles}
    """).strip()


def continuous_mode():
    """Run continuously until stopped by user or idle timeout"""
    print("🟢 Entering continuous mode...")
    print("Send 'stop', 'sleep', or 'pause' to exit")
    print("Bot will auto-sleep after 30 minutes of inactivity\n")

    # Initialize state
    state = read_json(STATE_PATH, {})
    if "mode" not in state:
        state["mode"] = "active"
        write_state(state)

    mode = state.get("mode", "active")

    if mode == "stopped":
        print("⚠️  Bot is in stopped state. Waiting for 'start' command...")
        # Still check for messages to see if user sends "start"

    idle_counter = 0
    max_idle_cycles = 180  # 180 * 10sec = 30 minutes (when in active mode)
    session_start = SESSION_CACHE.get("start_time")
    if session_start is None:
        session_start = datetime.now(timezone.utc)

    try:
        while True:
            # Reload state to check for external changes
            state = read_json(STATE_PATH, {})
            mode = state.get("mode", "active")

            # Check for new messages
            message = fetch_new_messages(use_cached=False)

            if message:
                idle_counter = 0  # Reset idle counter
                text = message.get("text", "").lower().strip()
                chat_id = message.get("chat_id", "")

                # Handle control commands
                if text in ["stop", "sleep", "pause"]:
                    print("🔴 Stop command received")
                    state["mode"] = "stopped"
                    write_state(state)
                    git_commit_push("Bot stopped by user command")
                    break

                elif text in ["start", "wake up", "wake"]:
                    print("🟢 Wake up command received")
                    state["mode"] = "active"
                    write_state(state)
                    SESSION_CACHE["messages"].clear()
                    SESSION_CACHE["start_time"] = datetime.now(timezone.utc)
                    git_commit_push("Bot activated by user")
                    session_start = SESSION_CACHE["start_time"]
                    continue

                elif text == "status":
                    uptime = datetime.now(timezone.utc) - session_start
                    uptime_str = str(uptime).split('.')[0]  # Remove microseconds
                    status_msg = format_status_message(
                        mode,
                        uptime_str,
                        len(SESSION_CACHE["messages"]),
                        idle_counter,
                        max_idle_cycles
                    )
                    send_telegram_message(chat_id, status_msg)
                    state["last_update_id"] = message.get("update_id", 0)
                    write_state(state)
                    continue

                # Process normal message
                if mode != "stopped":
                    print(f"📨 Processing message: {text[:50]}...")
                    process_message(message)
                    write_state(state)

            else:
                # No message received
                idle_counter += 1

                # Print heartbeat every 30 cycles (~5 minutes in active mode)
                if idle_counter % 30 == 0:
                    elapsed = datetime.now(timezone.utc) - session_start
                    # Calculate actual minutes based on mode and idle counter
                    sleep_interval = 10 if mode == "active" else 30
                    minutes_elapsed = idle_counter * sleep_interval / 60
                    print(f"💓 Heartbeat: {idle_counter} idle cycles (~{minutes_elapsed:.1f} min), mode={mode}")

                # Auto-sleep after idle period
                if idle_counter >= max_idle_cycles and mode == "active":
                    print(f"😴 Auto-sleeping after {max_idle_cycles * 10 / 60:.0f} minutes of inactivity")
                    state["mode"] = "idle"
                    write_state(state)
                    git_commit_push("Auto-sleep: idle timeout reached")
                    break

            # Determine sleep interval based on mode
            if mode == "active":
                time.sleep(10)  # Check every 10 seconds when active
            elif mode == "idle":
                time.sleep(30)  # Check every 30 seconds when idle
            else:  # stopped
                time.sleep(30)  # Check occasionally for start command

    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user (Ctrl+C)")
        state = read_json(STATE_PATH, {})
        state["mode"] = "stopped"
        write_state(state)
        git_commit_push("Bot interrupted by keyboard")

    except Exception as e:
        log_error(f"Error in continuous mode: {e}")
        print(f"❌ Error in continuous mode: {e}")
        raise

    finally:
        elapsed = datetime.now(timezone.utc) - session_start
        print("\n📊 Session summary:")
        print(f"   Duration: {str(elapsed).split('.')[0]}")
        print(f"   Messages processed: {len(SESSION_CACHE['messages'])}")
        print(f"   Final mode: {mode}")


def main():
    """Main execution - supports single or continuous mode"""
    print("GitButler starting...")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    start_session()

    try:
        ensure_directories()
        ensure_files()

        # Check for RUN_MODE environment variable
        run_mode = os.environ.get("RUN_MODE", "continuous").lower()

        if run_mode == "continuous":
            continuous_mode()
        else:
            # Original single-message mode (fallback)
            # Check if update check was already done by check_updates.sh
            skip_check = os.environ.get("SKIP_UPDATE_CHECK", "").lower() == "true"

            if skip_check:
                print("\n1. Update check already done by check_updates.sh, using cached response...")
            else:
                print("\n1. Checking for new messages...")

            message = fetch_new_messages(use_cached=skip_check)
            if message:
                print(f"\n2. Processing message {message.get('message_id')}...")
                process_message(message)
            else:
                print("✅ No new messages to process.")

        print("\n✅ GitButler run completed successfully")

    except Exception as e:
        log_error(f"Fatal error in main: {e}")
        print(f"\n❌ GitButler encountered an error: {e}")
        sys.exit(1)
    finally:
        final_state = read_json(STATE_PATH, {})
        end_session(final_state.get("mode", "completed"))


if __name__ == "__main__":
    main()
