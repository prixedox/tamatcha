---
name: deploy
description: Use when asked to deploy, publish, ship, or update the live production site at tamatcha.cz, or when changes need to appear on the real web. Pushing to GitHub does NOT update tamatcha.cz — that requires this manual deploy.
---

# Deploy to tamatcha.cz

## Overview

tamatcha.cz runs on Český hosting (shared hosting, rsync over SSH). A deploy publishes the **current working tree** — whatever is on disk right now, committed or not.

## Before deploying (required)

1. Run `git status --short` and `git log -1 --oneline`. If the tree is dirty or HEAD contains work-in-progress (redesign specs, half-done features), STOP and tell the user exactly what state would go live; deploy only after they confirm. Urgency is not a reason to skip this — shipping half-finished work to production is worse than a 30-second question.
2. Check the SSH key exists: `ls ~/.ssh/tamatcha_cz` (see Troubleshooting if missing).

## Deploy

```bash
bash scripts/deploy-ceskyhosting.sh
```

The script builds with `VITE_BASE=/` (the default `/tamatcha/` base is only for GitHub Pages) and rsyncs `dist/` to `tamatcha_cz@www.tamatcha.cz:tamatcha.cz/` with `--delete`.

## Verify (required)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://tamatcha.cz/   # expect 200
curl -s https://tamatcha.cz/ | grep -o 'assets/index-[^"]*\.js'
grep -o 'assets/index-[^"]*\.js' dist/index.html                 # hashes must match
```

## Deploying a specific commit (dirty tree)

To ship a known-good commit while keeping work-in-progress untouched, build from a temporary worktree. Note: `scripts/deploy-ceskyhosting.sh` may not exist in older commits, so run the commands inline:

```bash
git worktree add /tmp/tamatcha-deploy <commit>
cd /tmp/tamatcha-deploy && npm ci && VITE_BASE=/ npm run build
rsync -az --delete -e "ssh -i ~/.ssh/tamatcha_cz" dist/ tamatcha_cz@www.tamatcha.cz:tamatcha.cz/
cd - && git worktree remove --force /tmp/tamatcha-deploy
```

## Quick reference

| Deployment | Trigger | Base path |
|---|---|---|
| tamatcha.cz (production) | this skill — manual | `/` |
| prixedox.github.io/tamatcha (preview) | push to main, GitHub Actions | `/tamatcha/` |

## Troubleshooting

- **Permission denied (publickey)** — key `~/.ssh/tamatcha_cz` missing or not authorized. Regenerate: `ssh-keygen -t ed25519 -f ~/.ssh/tamatcha_cz -N ""`, then place the `.pub` content as `.ssh/authorized_keys` on the server via FTP (user `tamatcha_cz`; password in admin panel muj.cesky-hosting.cz → tamatcha.cz → FTP) or https://webftp.cesky-hosting.cz.
- **Build fails** — run `npm install` first; the build runs `tsc --noEmit`, so type errors block deploys.
- **Site shows old content** — assets are content-hashed, only `index.html` can be cached; hard refresh.
- **HTTPS/redirect problems** — managed in the admin panel (Let's Encrypt auto-renews; http→https and www→apex redirects are configured there, not in this repo).
