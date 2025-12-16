# howold

Find the latest examples, templates, and starters in GitHub repos.

## The Problem

Large repos (Next.js, Vercel templates, etc.) have hundreds of example projects. GitHub shows "last updated" but that's usually just dependabot or package bumps. You can't tell which examples are genuinely new vs. old code that's been maintained for years.

This matters because newer examples use modern patterns, newer runtime versions, and current best practices. Old examples work, but you'll spend time migrating outdated code. When learning from framework maintainers, you want their *latest* thinking, not 2019 patterns with 2024 dependency updates.

## The Solution

`howold` finds the first commit that touched each project. That's the real creation date. Sort by that and you instantly see which examples are fresh.

## Usage

```bash
howold <repo> [path]
```

```bash
howold vercel/next.js examples/
howold get-convex/templates -y 2024
howold https://github.com/vercel/next.js/tree/canary/examples
```

## Options

```
-y, --year YYYY[-YYYY]  Filter by creation year (e.g., 2024 or 2020-2024)
-l, --limit N           Limit output
-v, --version           Version
-h, --help              Help
```

## Install

```bash
# Run directly
bun cli.ts vercel/next.js examples/

# Or build a binary
bun run build
./howold vercel/next.js examples/
```

## Auth

Set `GITHUB_TOKEN` for 5000 req/hr (60/hr without).

```bash
# Option 1: Export directly
export GITHUB_TOKEN=$(gh auth token)

# Option 2: Copy and edit .env.example
cp .env.example .env
```

## Output

```
2019-03-15 14:23:01  a1b2c3d  examples/blog
2021-07-22 09:15:44  e4f5g6h  examples/with-tailwindcss
2024-11-03 16:42:18  i7j8k9l  examples/next-15-app-router
```

Sorted oldest to newest. The bottom of the list is what you want.
