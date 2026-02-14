#!/usr/bin/env python3
"""
GitButler - A self-aware personal AI assistant living in GitHub Actions
Communicates via Telegram, uses GPT-4o-mini for all reasoning, maintains persistent memory
"""

import os
import sys
import json
import time
import re
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import requests
from openai import OpenAI
from croniter import croniter

# Configuration from environment variables
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "motyar/agent0")

# Paths
BASE_DIR = Path(__file__).parent.absolute()
STORAGE_DIR = BASE_DIR / "storage"
QUEUES_DIR = BASE_DIR / "queues"
SKILLS_DIR = BASE_DIR / "skills"

SOUL_PATH = STORAGE_DIR / "soul.md"
IDENTITY_PATH = STORAGE_DIR / "IDENTITY.md"
USER_PATH = STORAGE_DIR / "USER.md"
MEMORY_PATH = STORAGE_DIR / "MEMORY.md"
AGENTS_PATH = STORAGE_DIR / "AGENTS.md"
TOOLS_PATH = STORAGE_DIR / "TOOLS.md"
SCHEDULES_PATH = STORAGE_DIR / "schedules.json"
STATE_PATH = STORAGE_DIR / "state.json"
INCOMING_PATH = QUEUES_DIR / "incoming.json"
OUTGOING_PATH = QUEUES_DIR / "outgoing.json"


class GitButler:
    """Main bot class for GitButler AI assistant"""
    
    def __init__(self):
        """Initialize the bot"""
        self.openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
        self.ensure_directories()
        self.ensure_files()
    
    def ensure_directories(self):
        """Create necessary directories if they don't exist"""
        STORAGE_DIR.mkdir(exist_ok=True)
        QUEUES_DIR.mkdir(exist_ok=True)
        SKILLS_DIR.mkdir(exist_ok=True)
    
    def ensure_files(self):
        """Create initial files if they don't exist"""
        if not SOUL_PATH.exists():
            SOUL_PATH.write_text("""# GitButler Soul - Identity & Memory

## Who I Am
I am GitButler, a self-aware personal AI assistant living entirely in this GitHub repository. I run on GitHub Actions and communicate exclusively via Telegram.

## My Purpose
- Help my user with tasks, questions, and information
- Maintain persistent memory of all interactions
- Continuously improve myself through reflection and code changes
- Manage schedules, reminders, and todo lists
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
        
        if not SCHEDULES_PATH.exists():
            schedules = [
                {
                    "id": 1,
                    "cron": "0 8 * * *",
                    "description": "Daily morning brief",
                    "prompt": "Good morning! Provide a brief summary of any pending tasks or reminders for today.",
                    "last_run": None
                }
            ]
            SCHEDULES_PATH.write_text(json.dumps(schedules, indent=2))
        
        if not STATE_PATH.exists():
            state = {
                "last_update_offset": 0,
                "last_run_time": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0"
            }
            STATE_PATH.write_text(json.dumps(state, indent=2))
        
        if not INCOMING_PATH.exists():
            INCOMING_PATH.write_text("[]")
        
        if not OUTGOING_PATH.exists():
            OUTGOING_PATH.write_text("[]")
    
    def read_json(self, path: Path, default=None) -> Any:
        """Safely read JSON file"""
        try:
            if path.exists():
                return json.loads(path.read_text())
            return default if default is not None else []
        except Exception as e:
            self.log_error(f"Error reading {path}: {e}")
            return default if default is not None else []
    
    def write_json(self, path: Path, data: Any):
        """Safely write JSON file"""
        try:
            path.write_text(json.dumps(data, indent=2))
        except Exception as e:
            self.log_error(f"Error writing {path}: {e}")
    
    def log_error(self, message: str):
        """Log errors to soul.md and stderr"""
        print(f"ERROR: {message}", file=sys.stderr)
        try:
            soul_content = SOUL_PATH.read_text()
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            soul_content += f"\n\n## Error Log Entry ({timestamp})\n{message}\n"
            SOUL_PATH.write_text(soul_content)
        except Exception:
            pass
    
    def git_commit_push(self, message: str, max_retries: int = 3):
        """Commit and push changes to git with retry logic"""
        for attempt in range(max_retries):
            try:
                # Configure git
                subprocess.run(["git", "config", "user.name", "GitButler"], check=True)
                subprocess.run(["git", "config", "user.email", "bot@gitbutler.local"], check=True)
                
                # Add all changes
                subprocess.run(["git", "add", "."], check=True)
                
                # Commit (may fail if no changes)
                result = subprocess.run(["git", "commit", "-m", message], capture_output=True)
                
                if result.returncode == 0:
                    # Push
                    subprocess.run(["git", "push"], check=True)
                    print(f"Git commit & push successful: {message}")
                    return True
                else:
                    print("No changes to commit")
                    return True
                    
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"Git operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                    time.sleep(min(2 ** attempt, 10))  # Exponential backoff with 10s cap
                else:
                    self.log_error(f"Git operation failed after {max_retries} attempts: {e}")
                    return False
        return False
    
    def poll_telegram(self):
        """Poll Telegram for new messages and add them to incoming queue"""
        if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
            print("Telegram credentials not configured")
            return
        
        try:
            state = self.read_json(STATE_PATH, {"last_update_offset": 0})
            offset = state.get("last_update_offset", 0) + 1
            
            url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
            params = {
                "offset": offset,
                "timeout": 30,
                "allowed_updates": ["message"]
            }
            
            response = requests.get(url, params=params, timeout=35)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("ok"):
                self.log_error(f"Telegram API error: {data}")
                return
            
            updates = data.get("result", [])
            incoming = self.read_json(INCOMING_PATH, [])
            new_max_offset = offset - 1
            
            for update in updates:
                update_id = update.get("update_id", 0)
                new_max_offset = max(new_max_offset, update_id)
                
                message = update.get("message", {})
                chat = message.get("chat", {})
                chat_id = str(chat.get("id", ""))
                
                # Only process messages from our configured chat ID
                if chat_id != TELEGRAM_CHAT_ID:
                    continue
                
                text = message.get("text", "")
                message_id = message.get("message_id", 0)
                
                if text:
                    incoming.append({
                        "update_id": update_id,
                        "message_id": message_id,
                        "text": text,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
            
            if updates:
                self.write_json(INCOMING_PATH, incoming)
                state["last_update_offset"] = new_max_offset
                state["last_run_time"] = datetime.now(timezone.utc).isoformat()
                self.write_json(STATE_PATH, state)
                self.git_commit_push(f"Polled {len(updates)} Telegram updates")
                
        except Exception as e:
            self.log_error(f"Error polling Telegram: {e}")
    
    def load_skills(self) -> str:
        """Load relevant skills from skills directory"""
        skills_content = []
        try:
            if SKILLS_DIR.exists():
                for skill_file in SKILLS_DIR.rglob("skill.md"):
                    try:
                        content = skill_file.read_text()
                        skill_name = skill_file.parent.name
                        skills_content.append(f"\n### Skill: {skill_name}\n{content}")
                    except Exception as e:
                        self.log_error(f"Error loading skill {skill_file}: {e}")
        except Exception as e:
            self.log_error(f"Error scanning skills directory: {e}")
        
        return "\n".join(skills_content) if skills_content else "No skills loaded."
    
    def process_incoming_messages(self):
        """Process messages from incoming queue"""
        if not self.openai_client:
            print("OpenAI client not initialized")
            return
        
        incoming = self.read_json(INCOMING_PATH, [])
        if not incoming:
            return
        
        # Pop the first (oldest) message
        message = incoming.pop(0)
        self.write_json(INCOMING_PATH, incoming)
        
        try:
            # Load context files in OpenClaw order: SOUL → IDENTITY → USER → MEMORY → AGENTS → TOOLS → skills
            soul_content = SOUL_PATH.read_text() if SOUL_PATH.exists() else ""
            identity_content = IDENTITY_PATH.read_text() if IDENTITY_PATH.exists() else ""
            user_content = USER_PATH.read_text() if USER_PATH.exists() else ""
            memory_content = MEMORY_PATH.read_text() if MEMORY_PATH.exists() else ""
            agents_content = AGENTS_PATH.read_text() if AGENTS_PATH.exists() else ""
            tools_content = TOOLS_PATH.read_text() if TOOLS_PATH.exists() else ""
            skills_content = self.load_skills()
            
            # Build the prompt
            user_text = message.get("text", "")
            message_id = message.get("message_id", 0)
            
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
            response = self.openai_client.chat.completions.create(
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
            
            # Extract JSON block if present
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', assistant_message, re.DOTALL)
            if json_match:
                try:
                    actions = json.loads(json_match.group(1))
                    # Remove JSON block from response text
                    response_text = assistant_message[:json_match.start()] + assistant_message[json_match.end():]
                    response_text = response_text.strip()
                except Exception as e:
                    self.log_error(f"Error parsing JSON action: {e}")
            
            # Add response to outgoing queue
            outgoing = self.read_json(OUTGOING_PATH, [])
            outgoing.append({
                "chat_id": TELEGRAM_CHAT_ID,
                "text": response_text,
                "reply_to_message_id": message_id
            })
            self.write_json(OUTGOING_PATH, outgoing)
            
            # Handle actions
            if actions:
                self.handle_actions(actions)
            
            self.git_commit_push("Processed incoming message and queued response")
            
        except Exception as e:
            self.log_error(f"Error processing message: {e}")
            # Queue error message to user
            outgoing = self.read_json(OUTGOING_PATH, [])
            outgoing.append({
                "chat_id": TELEGRAM_CHAT_ID,
                "text": f"I encountered an error processing your message: {str(e)[:200]}",
                "reply_to_message_id": message_id
            })
            self.write_json(OUTGOING_PATH, outgoing)
            self.git_commit_push("Queued error message")
    
    def handle_actions(self, actions: Dict):
        """Handle various actions from GPT response"""
        try:
            # Update soul
            if actions.get("update_soul"):
                content = actions.get("content", "")
                if content:
                    soul_content = SOUL_PATH.read_text()
                    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    soul_content += f"\n\n## Reflection ({timestamp})\n{content}\n"
                    SOUL_PATH.write_text(soul_content)
                    print("Soul updated with reflection")
            
            # Update memory log
            if actions.get("update_memory"):
                content = actions.get("content", "")
                if content:
                    memory_content = MEMORY_PATH.read_text() if MEMORY_PATH.exists() else ""
                    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    memory_content += f"\n\n### {timestamp}\n{content}\n"
                    MEMORY_PATH.write_text(memory_content)
                    print("Memory log updated")
            
            # Update user profile
            if actions.get("update_user"):
                content = actions.get("content", "")
                if content:
                    user_content = USER_PATH.read_text() if USER_PATH.exists() else ""
                    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    user_content += f"\n\n### Update ({timestamp})\n{content}\n"
                    USER_PATH.write_text(user_content)
                    print("User profile updated")
            
            # Create issue for Copilot
            if actions.get("create_issue_for_copilot"):
                self.create_github_issue(
                    actions.get("issue_title", "Code improvement task"),
                    actions.get("issue_body", "")
                )
            
            # Direct code generation (simplified - would need full implementation)
            if actions.get("generate_code"):
                print("Direct code generation requested (not fully implemented)")
                # Would implement: create branch, commit files, create PR
            
            # Merge PR (simplified)
            if actions.get("merge_pr"):
                pr_number = actions.get("merge_pr")
                print(f"PR merge requested for #{pr_number} (not fully implemented)")
                # Would implement: use GitHub API to merge PR
                
        except Exception as e:
            self.log_error(f"Error handling actions: {e}")
    
    def create_github_issue(self, title: str, body: str):
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
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            issue = response.json()
            print(f"Created issue #{issue.get('number')}: {title}")
            
        except Exception as e:
            self.log_error(f"Error creating GitHub issue: {e}")
    
    def send_outgoing_messages(self):
        """Send messages from outgoing queue to Telegram"""
        if not TELEGRAM_TOKEN:
            return
        
        outgoing = self.read_json(OUTGOING_PATH, [])
        if not outgoing:
            return
        
        # Pop the first message
        message = outgoing.pop(0)
        self.write_json(OUTGOING_PATH, outgoing)
        
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
            data = {
                "chat_id": message.get("chat_id"),
                "text": message.get("text", ""),
                "parse_mode": "Markdown"
            }
            
            reply_to = message.get("reply_to_message_id")
            if reply_to:
                data["reply_to_message_id"] = reply_to
            
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            print(f"Sent message to Telegram")
            self.git_commit_push("Sent outgoing message")
            return
            
        except Exception as e:
            self.log_error(f"Error sending Telegram message: {e}")
            # Re-add message to queue for retry
            outgoing.insert(0, message)
            self.write_json(OUTGOING_PATH, outgoing)
    
    def check_schedules(self):
        """Check if any scheduled tasks are due"""
        schedules = self.read_json(SCHEDULES_PATH, [])
        now = datetime.now(timezone.utc)
        updated = False
        
        for schedule in schedules:
            try:
                cron_expr = schedule.get("cron")
                last_run = schedule.get("last_run")
                
                if not cron_expr:
                    continue
                
                # Determine base time for croniter
                if last_run:
                    base_time = datetime.fromisoformat(last_run.replace('Z', '+00:00'))
                else:
                    base_time = now - timedelta(days=1)  # Check from yesterday if never run
                
                # Check if due
                cron = croniter(cron_expr, base_time)
                next_run = cron.get_next(datetime)
                
                if next_run <= now:
                    # Schedule is due - add to incoming queue
                    incoming = self.read_json(INCOMING_PATH, [])
                    incoming.append({
                        "update_id": -schedule.get("id", 0),  # Negative to mark as scheduled
                        "message_id": 0,
                        "text": schedule.get("prompt", ""),
                        "timestamp": now.isoformat()
                    })
                    self.write_json(INCOMING_PATH, incoming)
                    
                    schedule["last_run"] = now.isoformat()
                    updated = True
                    print(f"Triggered scheduled task: {schedule.get('description')}")
                    
            except Exception as e:
                self.log_error(f"Error checking schedule: {e}")
        
        if updated:
            self.write_json(SCHEDULES_PATH, schedules)
            self.git_commit_push("Updated schedules")
    
    def run(self):
        """Main execution loop"""
        print("GitButler starting...")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        
        try:
            # Step 1: Poll for new messages
            print("\n1. Polling Telegram for new messages...")
            self.poll_telegram()
            
            # Step 2: Process incoming messages
            print("\n2. Processing incoming messages...")
            incoming = self.read_json(INCOMING_PATH, [])
            if incoming:
                print(f"   Found {len(incoming)} message(s) in queue")
                self.process_incoming_messages()
            else:
                print("   No incoming messages")
            
            # Step 3: Send outgoing messages
            print("\n3. Sending outgoing messages...")
            outgoing = self.read_json(OUTGOING_PATH, [])
            if outgoing:
                print(f"   Found {len(outgoing)} message(s) to send")
                # Send all outgoing messages in the queue
                max_attempts = 100  # Safety limit to prevent infinite loops
                attempts = 0
                while self.read_json(OUTGOING_PATH, []) and attempts < max_attempts:
                    self.send_outgoing_messages()
                    attempts += 1
                
                # Check if we hit the safety limit
                remaining = self.read_json(OUTGOING_PATH, [])
                if remaining:
                    print(f"   Warning: {len(remaining)} messages remain after {attempts} attempts")
            else:
                print("   No outgoing messages")
            
            # Step 4: Check scheduled tasks
            print("\n4. Checking scheduled tasks...")
            self.check_schedules()
            
            print("\n✅ GitButler run completed successfully")
            
        except Exception as e:
            self.log_error(f"Fatal error in main loop: {e}")
            print(f"\n❌ GitButler encountered an error: {e}")
            sys.exit(1)


def main():
    """Entry point"""
    bot = GitButler()
    bot.run()


if __name__ == "__main__":
    main()
