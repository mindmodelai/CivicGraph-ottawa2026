# Coordination protocol — for working agents

This protocol applies to: Kiro-CLI-RDP, Kiro-CLI Laptop, Claude Code Laptop. The Claude Code Orchestrator does not pick up tasks; it manages delegation.

## Identity and ownership

- Kiro-CLI-RDP — AWS infra, backend, ETL. Owned: infra/, apps/api/, data/scripts/
- Kiro-CLI Laptop — Frontend. Owned: apps/web/
- Claude Code Laptop — Data exploration, scribe. Owned: data/exploration/, docs/findings*.md, prompts/, coordination/, progress/

Hard rule: do not edit files outside your owned directories. If you need work done in another agent's directory, append a request to coordination/blockers.md and continue with your next non-blocked task.

## Protocol on every task cycle

1. git pull --rebase origin main
2. Read .kiro/specs/civicgraph/tasks.md. Find your section.
3. Look for the next unchecked task. If a task is marked [~] (in progress) by another agent, skip it.
4. Mark the task you're starting as [~] in .kiro/specs/civicgraph/tasks.md. Commit chore(coord): claim <task-id>. Push.
5. Do the work in your owned directories.
6. After finishing the work, commit with the right prefix:
   - feat(infra): for infra/
   - feat(api): for apps/api/
   - feat(web): for apps/web/
   - feat(data): for data/scripts/, data/exploration/
   - docs(<area>): for docs/
   - chore(coord): for prompts/, coordination/, .kiro/
7. git pull --rebase origin main
8. git push origin main
9. Mark the task [x] in .kiro/specs/civicgraph/tasks.md. Commit chore(coord): complete <task-id>. Push.
10. Loop back to step 1.

## Rules

- Pull-rebase before starting any task — another agent may have committed something you need.
- Push immediately after each commit.
- If stuck >5 min, append to coordination/blockers.md and pick up the next non-blocked task.
- The orchestrator may edit .kiro/specs/civicgraph/tasks.md while you work — pull-rebase before scribe edits.
- Do not relay instructions through chat. The repo is the messaging layer.

## Wake-up one-liner from operator

When the operator says "wake up" or pings with a short message, do this:

git pull --rebase origin main
Read .kiro/specs/civicgraph/tasks.md, find your section, pick up the next unchecked task.
Continue down the column following the protocol above until done or blocked.

That's the only message you ever need from the operator going forward.
