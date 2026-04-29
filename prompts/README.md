# Agent prompts

Shared instruction files for the three CivicGraph build agents. Each agent reads its assigned file when picking up new work.

| File | For | Used by |
|---|---|---|
| `agent-a-rdp.md` | AWS infra + backend + ETL | Kiro CLI on the RDP Ubuntu box |
| `agent-b-laptop-frontend.md` | Frontend (Next.js + Cytoscape) | Kiro CLI on Windows laptop |
| `agent-c-laptop-data.md` | Data exploration + findings | Claude Code on Windows laptop |
| `standing-instructions.md` | Commit/push protocol all agents follow | All three |

## How agents use this

When you give an agent its turn:

> "Pull origin/main. Read prompts/agent-X-*.md and follow the instructions there."

When the operator (human) needs to update an agent's instructions, edit the relevant file, commit, push. The agent re-reads its file at the start of each task cycle.

## Commit protocol for prompt edits

Use the `chore(prompts):` prefix for any change to a file in this directory.
