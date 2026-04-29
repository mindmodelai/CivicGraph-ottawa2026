# CivicGraph coordination protocol

This is the canonical reference for all four agents. Pull origin/main, read this file, then act.

## Who's who

**Kiro-CLI-RDP** — Kiro CLI on the RDP Ubuntu box (i-0a6c2a8d83e333a87). Has unlocked AWS instance role.
- Role: AWS infra, backend, ETL, deploys
- Owned: infra/, apps/api/, data/scripts/

**Kiro-CLI Laptop** — Kiro CLI on operator's Windows laptop.
- Role: Frontend
- Owned: apps/web/

**Claude Code Laptop** — Claude Code on operator's Windows laptop.
- Role: Data exploration + scribe
- Owned: data/exploration/, docs/findings.md, docs/findings-verification.md, prompts/, coordination/, progress/

**Claude Code Orchestrator** — Claude Code on operator's machine, separate session.
- Role: Manage delegation, keep .kiro/specs/civicgraph/tasks.md current, surface blockers
- Owned: .kiro/specs/civicgraph/, coordination/ (shared with Claude Code Laptop)
- Does NOT pick up working tasks. Does NOT edit apps/, infra/, or data/scripts/.

## Hard ownership rule

Do not edit files outside your owned directories. If you need work done in another agent's directory, append a request to coordination/blockers.md and continue with your next non-blocked task.

## Task claim protocol — for working agents only (not Orchestrator)

Status markers in .kiro/specs/civicgraph/tasks.md:
- [ ] = unstarted, available
- [~] = in progress, claimed
- [x] = done

On every cycle:

1. git pull --rebase origin main
2. Find your section in .kiro/specs/civicgraph/tasks.md. Look for the next [ ] task.
3. Edit [ ] to [~] and add: <!-- claimed by <agent-name> at <ISO timestamp> -->
4. Commit: chore(coord): claim <task-id>. Push immediately.
5. Pull-rebase again. If your [~] was overwritten by another agent's [~] on the same task, you lost the race — yield, pick the next [ ] task.
6. Do the work in your owned directories.
7. After work is complete, commit with the right prefix:
   - feat(infra): for infra/
   - feat(api): for apps/api/
   - feat(web): for apps/web/
   - feat(data): for data/scripts/, data/exploration/
   - docs(<area>): for docs/
   - chore(coord): for prompts/, coordination/, .kiro/
8. git pull --rebase origin main
9. git push origin main
10. Edit [~] to [x]. Commit: chore(coord): complete <task-id>. Push.
11. Loop to step 1.

If everything in your section is [~] or [x], write a progress snapshot to progress/<your-name>-<unix-timestamp>.md and stop. Wait for the operator or the Orchestrator to add tasks.

## Blockers

If stuck more than 5 minutes, append to coordination/blockers.md:
[<ISO timestamp>] <agent-name>: <description> — needs <what>
Then pick up the next non-blocked task in your section.

## Standing rules

- Pull-rebase before any task. Always.
- Push immediately after each commit.
- Never force-push.
- Never edit another agent's owned directory.
- The repo is the messaging layer. Do not relay instructions through chat.
- Bedrock model: us.anthropic.claude-sonnet-4-6 only. Bare model IDs are denied.

## Wake-up one-liner from operator

Working agents: when the operator pings, do this:

git pull --rebase origin main
Read prompts/coordination-protocol.md, find your section in .kiro/specs/civicgraph/tasks.md, follow the claim protocol on the next [ ] task. Continue until done or blocked.

## Orchestrator's job

The Orchestrator does not pick up working tasks. Its cycle:

1. git pull --rebase origin main
2. Read progress/*.md (most recent), coordination/blockers.md, .kiro/specs/civicgraph/tasks.md
3. Identify what each agent should do next based on dependencies
4. Update .kiro/specs/civicgraph/tasks.md if it doesn't reflect reality (mark done, add new tasks, mark cut). Use [ ] / [~] / [x].
5. Commit chore(coord): <description> and push
6. Report status back to operator
7. Wait for operator input

---

End of protocol.
