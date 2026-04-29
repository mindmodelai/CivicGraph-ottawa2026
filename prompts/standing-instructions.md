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
