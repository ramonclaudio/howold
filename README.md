# howold

Find the latest examples, templates, and starters in GitHub repos.

## The Problem

Large repos like Next.js or Vercel templates have hundreds of examples. GitHub shows "last updated" but that's usually just dependabot or package bumps. You can't tell which examples are genuinely new vs old code that's been maintained for years.

This matters because newer examples use modern patterns, current runtime versions, and best practices. Old examples work but you'll spend time migrating outdated code. When learning from framework maintainers you want their latest thinking, not 2019 patterns with 2025 dependency updates.

## The Solution

`howold` finds the first commit that touched each example. That's the real creation date. Sort by that and you instantly see which examples are fresh.

## Usage

```bash
# Scan a repo for templates
bun cli.ts get-convex/templates

# Show only the 5 latest templates
bun cli.ts get-convex/templates -l 5

# Filter by year
bun cli.ts get-convex/templates -y 2025

# Combine limit and year filter
bun cli.ts get-convex/templates -y 2025 -l 10

# Use a full GitHub URL
bun cli.ts https://github.com/get-convex/templates

# Scan a specific path in a larger repo
bun cli.ts vercel/next.js examples/

# Full URL with branch and path
bun cli.ts https://github.com/vercel/next.js/tree/canary/examples
```

## Options

```
-y, --year <range>   Filter by year (2025 or 2020-2025)
-l, --limit <n>      Show n latest results
-v, --version        Show version
-h, --help           Show help
```

## Requirements

- [Bun](https://bun.sh) runtime

No other dependencies. Uses the GitHub REST API directly (no `gh` CLI needed).

## Install

```bash
git clone https://github.com/ramonclaudio/howold.git
cd howold
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
╭───────────────────────────────────╮
│ ◆ get-convex/templates            │
│ Branch   main                     │
│ Created  2023-10-28 (2 years ago) │
╰───────────────────────────────────╯

  ◇ Found 22 templates

╭────────────┬──────────┬─────────┬─────────────────────────────────╮
│ date       │ time     │ sha     │ project                         │
├────────────┼──────────┼─────────┼─────────────────────────────────┤
│ 2025-02-10 │ 21:48:52 │ a8cb99c │ template-react-vite-clerk       │
│ 2025-02-10 │ 21:48:52 │ a8cb99c │ template-react-vite-convexauth  │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-nextjs-authkit         │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-react-vite-authkit     │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-tanstack-start-authkit │
╰────────────┴──────────┴─────────┴─────────────────────────────────╯

  Showing 5 of 22 templates · ▲ latest last
```
