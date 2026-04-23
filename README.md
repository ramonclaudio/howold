# howold

Large repos like Next.js or Vercel templates have hundreds of examples. GitHub shows "last updated" but that's usually dependabot or package bumps, you can't tell which examples are genuinely new vs old code that's been maintained for years. I wanted to learn from framework maintainers' latest thinking, not 2019 patterns with 2025 dependency updates. So I built this: find the first commit that touched each example, sort by real creation date, see what's actually fresh.

Find the latest examples, templates, and starters in GitHub repos.

## Install

```bash
git clone https://github.com/ramonclaudio/howold.git
cd howold
```

Requires [Bun](https://bun.sh). No other dependencies. Uses the GitHub REST API directly (no `gh` CLI needed).

## Auth

Set `GITHUB_TOKEN` for 5000 req/hr (60/hr without).

```bash
# Option 1: export directly
export GITHUB_TOKEN=$(gh auth token)

# Option 2: copy and edit .env.example
cp .env.example .env
```

## Usage

```bash
# Scan a repo for templates
bun cli.ts get-convex/templates

# Show only the 5 latest templates
bun cli.ts get-convex/templates -l 5

# Filter by year
bun cli.ts get-convex/templates -y 2025

# Combine limit and year
bun cli.ts get-convex/templates -y 2025 -l 10

# Full GitHub URL
bun cli.ts https://github.com/get-convex/templates

# Specific path in a larger repo
bun cli.ts vercel/next.js examples/

# Full URL with branch and path
bun cli.ts https://github.com/vercel/next.js/tree/canary/examples
```

## Options

```
-y, --year <range>   filter by year (2025 or 2020-2025)
-l, --limit <n>      show n latest results
-v, --version        show version
-h, --help           show help
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

## License

MIT
