# howold

Find the newest examples, templates, and starters in GitHub repos.

## The Problem

Large repos (Next.js, Vercel templates, etc.) have hundreds of example projects. GitHub shows "last updated" but that's usually just dependabot or package bumps. You can't tell which examples are genuinely new vs. old code that's been maintained for years.

This matters because newer examples use modern patterns, newer runtime versions, and current best practices. Old examples work, but you'll spend time migrating outdated code. When learning from framework maintainers, you want their *latest* thinking, not 2019 patterns with 2024 dependency updates.

## The Solution

`howold` finds the first commit that touched each project. That's the real creation date. Sort by that and you instantly see which examples are fresh.

## Usage

```bash
# Scan all projects in a repo
howold get-convex/templates

# Show only the 5 newest projects
howold get-convex/templates -l 5

# Filter by year
howold get-convex/templates -y 2024

# Combine limit and year filter
howold get-convex/templates -y 2024 -l 10

# Use a full GitHub URL
howold https://github.com/get-convex/templates

# Scan a specific path in a larger repo
howold vercel/next.js examples/

# Full URL with branch and path
howold https://github.com/vercel/next.js/tree/canary/examples
```

## Options

```
-y, --year <range>   Filter by year (2024 or 2020-2024)
-l, --limit <n>      Show n newest projects
-v, --version        Show version
-h, --help           Show help
```

## Install

```bash
# Run directly with bun
bun cli.ts get-convex/templates

# Or build a standalone binary
bun run build
./howold get-convex/templates
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

  ◇ Found 22 projects

╭────────────┬──────────┬─────────┬─────────────────────────────────╮
│ date       │ time     │ sha     │ project                         │
├────────────┼──────────┼─────────┼─────────────────────────────────┤
│ 2025-02-10 │ 21:48:52 │ a8cb99c │ template-react-vite-clerk       │
│ 2025-02-10 │ 21:48:52 │ a8cb99c │ template-react-vite-convexauth  │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-nextjs-authkit         │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-react-vite-authkit     │
│ 2025-10-18 │ 00:08:51 │ 0a61d3c │ template-tanstack-start-authkit │
╰────────────┴──────────┴─────────┴─────────────────────────────────╯

  Showing 5 of 22 projects · ▲ newest last
```

Sorted oldest to newest. The bottom of the list is what you want.
