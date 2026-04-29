# Standing Instructions — All Agents

## Commit protocol

After every meaningful task completion, immediately run:

```bash
git add -A
git commit -m "<prefix>: <short description>"
git pull --rebase origin main
git push origin main
```

If push fails due to non-fast-forward, `git pull --rebase origin main` first then retry. If there's a conflict you can't resolve cleanly, stop and tell the operator.

## Commit prefixes by directory

| Prefix | When |
|--------|------|
| `feat(infra):` | Changes in `infra/` |
| `feat(api):` | Changes in `apps/api/` |
| `feat(web):` | Changes in `apps/web/` |
| `feat(data):` | Changes in `data/scripts/` |
| `docs:` | Changes in `docs/` |
| `docs(infra):` | Status files like `infra/provisioning-status.md` |
| `chore:` | Tooling, config, housekeeping |
| `chore(prompts):` | Changes to files in `prompts/` |

## Before starting any task

1. `git pull --rebase origin main`
2. Read `docs/architecture.md` and `docs/api-contract.md`
3. Read your agent prompt file in `prompts/`
4. Check `docs/tasks.md` for your next task

## Key references

- Architecture: `docs/architecture.md`
- API contract: `docs/api-contract.md`
- Task list: `docs/tasks.md`
- Data schema: `data/schema.md`
- Findings: `docs/findings.md`
- Provisioning status: `infra/provisioning-status.md`

## Ignore all scheduling times

The task list has time estimates. Ignore them. Move as fast as possible. Pick up the next task as soon as dependencies are met.

## Task claim protocol

To prevent two agents picking up the same task, use this claim mechanism in .kiro/specs/civicgraph/tasks.md:

- [ ] = unstarted, available
- [~] = in progress, claimed by an agent
- [x] = done

On every task cycle:

1. git pull --rebase origin main
2. Find your section in .kiro/specs/civicgraph/tasks.md. Look for the next [ ] task. If everything is [~] or [x], you're idle — write a progress snapshot and stop.
3. Edit the task line from [ ] to [~] and add a trailing note: <!-- claimed by <agent-name> at <ISO timestamp> -->
4. Commit with chore(coord): claim <task-id>. Push immediately.
5. Do the work in your owned directories.
6. After finishing, commit the work with the right prefix (feat(infra)/feat(api)/feat(web)/feat(data)/docs).
7. git pull --rebase origin main, git push origin main.
8. Edit the task line from [~] to [x]. Commit with chore(coord): complete <task-id>. Push.
9. Loop back to step 1.

If after pull-rebase you see your [~] claim was overwritten by another agent's [~] claim on the same task (race condition), yield: revert your claim, pick the next [ ] task instead.

Hard rule: never edit files outside your owned directories, even to mark a task complete that another agent owns.
