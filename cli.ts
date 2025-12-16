#!/usr/bin/env bun

import { parseArgs } from "util";
import { color, dns, stringWidth } from "bun";

dns.prefetch("api.github.com");

interface Project { path: string; date: Date; sha: string }
interface Commit { sha: string; commit: { author: { date: string } } }
interface GitTree { tree: Array<{ path: string }> }
interface RepoInfo { default_branch: string; created_at: string }
interface RepoUrl { owner: string; repo: string; path?: string; branch?: string }

const VERSION = "1.0.0";
const API_VERSION = "2022-11-28";
const token = Bun.env.GITHUB_TOKEN || Bun.env.GH_TOKEN;
const isTTY = process.stderr.isTTY;

const s = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  cyan: color("cyan", "ansi") || "",
  yellow: color("yellow", "ansi") || "",
  green: color("lime", "ansi") || "",
  red: color("red", "ansi") || "",
  blue: color("dodgerblue", "ansi") || "",
  magenta: color("magenta", "ansi") || "",
  gray: color("gray", "ansi") || "",
  white: color("white", "ansi") || "",
};

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": `howold/${VERSION}`,
  "X-GitHub-Api-Version": API_VERSION,
  ...(token && { Authorization: `Bearer ${token}` }),
};

const stderr = Bun.stderr.writer();
const stdout = Bun.stdout.writer();
const log = (msg: string) => { stderr.write(msg + "\n"); stderr.flush(); };
const out = (msg: string) => { stdout.write(msg); stdout.flush(); };

let rateRemaining = Infinity;
let rateLimit = 0;
let rateReset = 0;

function updateRateLimit(res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining) rateRemaining = Number(remaining);
  if (limit) rateLimit = Number(limit);
  if (reset) rateReset = Number(reset);
}

async function gh<T>(path: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`https://api.github.com/${path}`, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    updateRateLimit(res);
    if (res.ok) return Bun.readableStreamToJSON(res.body!) as Promise<T>;
    if (res.status === 403 || res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const waitSec = retryAfter ? Number(retryAfter) : Math.pow(2, attempt + 1);
      if (attempt < retries - 1) {
        log(`${s.yellow}⏳${s.reset} ${s.dim}Rate limited, waiting ${waitSec}s...${s.reset}`);
        await Bun.sleep(waitSec * 1000);
        continue;
      }
    }
    throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
  }
  throw new Error("Max retries exceeded");
}

async function ghPaginate<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `https://api.github.com/${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  while (url) {
    const res: Response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    updateRateLimit(res);
    if (res.status === 403 || res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const waitSec = retryAfter ? Number(retryAfter) : 60;
      log(`${s.yellow}⏳${s.reset} ${s.dim}Rate limited, waiting ${waitSec}s...${s.reset}`);
      await Bun.sleep(waitSec * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
    const data = await Bun.readableStreamToJSON(res.body!) as T[];
    results.push(...data);
    url = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return results;
}

function parseRepoUrl(url: string): RepoUrl {
  let m: RegExpMatchArray | null;
  if ((m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/)))
    return { owner: m[1]!, repo: m[2]!, branch: m[3]!, path: m[4]! };
  if ((m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)$/)))
    return { owner: m[1]!, repo: m[2]!, branch: m[3]! };
  if ((m = url.match(/github\.com[\/:]+([^\/]+)\/([^\/]+?)(\.git)?$/)))
    return { owner: m[1]!, repo: m[2]! };
  if ((m = url.match(/^([^\/]+)\/([^\/]+)$/)))
    return { owner: m[1]!, repo: m[2]! };
  throw new Error("Invalid repo format");
}

async function findProjects(owner: string, repo: string, branch: string, pathFilter?: string): Promise<string[]> {
  const tree = await gh<GitTree>(`repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  return tree.tree
    .filter((f) => f.path.endsWith("package.json") && (!pathFilter || f.path.startsWith(pathFilter)))
    .map((f) => (f.path === "package.json" ? "." : f.path.replace("/package.json", "")))
    .sort();
}

async function getFirstCommit(owner: string, repo: string, path: string): Promise<{ date: Date; sha: string } | null> {
  try {
    const commits = await ghPaginate<Commit>(`repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}`);
    if (!commits.length) return null;
    const first = commits.at(-1)!;
    return { date: new Date(first.commit.author.date), sha: first.sha };
  } catch {
    return null;
  }
}

function progress(current: number, total: number): void {
  if (!isTTY) return;
  const pct = Math.round((current / total) * 100);
  const width = 24;
  const filled = Math.round((current / total) * width);
  const bar = "━".repeat(filled) + "─".repeat(width - filled);
  stderr.write(`\r  ${s.dim}Scanning${s.reset} ${s.cyan}${bar}${s.reset} ${s.dim}${pct}%${s.reset}`);
  stderr.flush();
}

function clearLine(): void {
  if (!isTTY) return;
  stderr.write("\r\x1b[K");
  stderr.flush();
}

function box(title: string, items: string[]): string {
  const lines = [title, ...items];
  const maxLen = Math.max(...lines.map((l) => stringWidth(Bun.stripANSI(l))));
  const top = `${s.dim}╭${"─".repeat(maxLen + 2)}╮${s.reset}`;
  const bot = `${s.dim}╰${"─".repeat(maxLen + 2)}╯${s.reset}`;
  const pad = (str: string) => {
    const len = stringWidth(Bun.stripANSI(str));
    return str + " ".repeat(maxLen - len);
  };
  const content = lines.map((l) => `${s.dim}│${s.reset} ${pad(l)} ${s.dim}│${s.reset}`).join("\n");
  return `${top}\n${content}\n${bot}`;
}

function table(data: { date: string; time: string; sha: string; project: string }[]): string {
  const cols = { date: 10, time: 8, sha: 7, project: Math.max(...data.map((d) => stringWidth(d.project)), 7) };
  const pad = (str: string, len: number) => str + " ".repeat(len - stringWidth(str));
  const d = s.dim;
  const r = s.reset;

  const top = `${d}╭${"─".repeat(cols.date + 2)}┬${"─".repeat(cols.time + 2)}┬${"─".repeat(cols.sha + 2)}┬${"─".repeat(cols.project + 2)}╮${r}`;
  const hdr = `${d}│${r} ${s.bold}${pad("date", cols.date)}${r} ${d}│${r} ${s.bold}${pad("time", cols.time)}${r} ${d}│${r} ${s.bold}${pad("sha", cols.sha)}${r} ${d}│${r} ${s.bold}${pad("project", cols.project)}${r} ${d}│${r}`;
  const sep = `${d}├${"─".repeat(cols.date + 2)}┼${"─".repeat(cols.time + 2)}┼${"─".repeat(cols.sha + 2)}┼${"─".repeat(cols.project + 2)}┤${r}`;
  const bot = `${d}╰${"─".repeat(cols.date + 2)}┴${"─".repeat(cols.time + 2)}┴${"─".repeat(cols.sha + 2)}┴${"─".repeat(cols.project + 2)}╯${r}`;

  const rows = data.map((row) =>
    `${d}│${r} ${s.green}${pad(row.date, cols.date)}${r} ${d}│${r} ${s.dim}${pad(row.time, cols.time)}${r} ${d}│${r} ${s.cyan}${pad(row.sha, cols.sha)}${r} ${d}│${r} ${pad(row.project, cols.project)} ${d}│${r}`
  );

  return [top, hdr, sep, ...rows, bot].join("\n");
}

const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const formatTime = (d: Date) => d.toISOString().slice(11, 19);

function relativeTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      year: { type: "string", short: "y" },
      limit: { type: "string", short: "l" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (values.version) {
    log(`\n  ${s.cyan}◆${s.reset} ${s.bold}howold${s.reset} ${s.dim}v${VERSION}${s.reset} ${s.dim}· bun ${Bun.version}${s.reset}\n`);
    process.exit(0);
  }

  if (values.help || !positionals.length) {
    log(`
  ${s.cyan}◆${s.reset} ${s.bold}howold${s.reset} ${s.dim}v${VERSION}${s.reset}
  ${s.dim}Find the latest examples, templates, and starters in GitHub repos${s.reset}

  ${s.bold}Usage${s.reset}
    ${s.dim}$${s.reset} howold ${s.cyan}<repo>${s.reset} ${s.dim}[path] [options]${s.reset}

  ${s.bold}Options${s.reset}
    ${s.cyan}-y${s.reset}, ${s.cyan}--year${s.reset} ${s.dim}<range>${s.reset}   Filter by year ${s.dim}(2025 or 2020-2025)${s.reset}
    ${s.cyan}-l${s.reset}, ${s.cyan}--limit${s.reset} ${s.dim}<n>${s.reset}      Show n latest results
    ${s.cyan}-v${s.reset}, ${s.cyan}--version${s.reset}        Show version
    ${s.cyan}-h${s.reset}, ${s.cyan}--help${s.reset}           Show help

  ${s.bold}Environment${s.reset}
    ${s.cyan}GITHUB_TOKEN${s.reset}       ${s.dim}Higher rate limits${s.reset} ${s.dim}(5000/hr vs 60/hr)${s.reset}

  ${s.bold}Examples${s.reset}
    ${s.dim}$${s.reset} howold ${s.cyan}vercel/next.js${s.reset} examples/
    ${s.dim}$${s.reset} howold ${s.cyan}get-convex/templates${s.reset} -y 2024 -l 10
    ${s.dim}$${s.reset} howold ${s.cyan}https://github.com/vercel/next.js/tree/canary/examples${s.reset}
`);
    process.exit(values.help ? 0 : 1);
  }

  let yearFilter: { start: number; end: number } | null = null;
  if (values.year) {
    const parts = values.year.split("-").map(Number);
    yearFilter = { start: parts[0]!, end: parts[1] ?? parts[0]! };
  }
  const limit = values.limit ? Number(values.limit) : null;

  const { owner, repo, path, branch: urlBranch } = parseRepoUrl(positionals[0]!);
  const repoInfo = await gh<RepoInfo>(`repos/${owner}/${repo}`);
  const branch = urlBranch || repoInfo.default_branch;
  const created = new Date(repoInfo.created_at);

  const repoBox = box(
    `${s.cyan}◆${s.reset} ${s.bold}${owner}/${repo}${s.reset}`,
    [
      `${s.dim}Branch${s.reset}   ${branch}`,
      `${s.dim}Created${s.reset}  ${formatDate(created)} ${s.dim}(${relativeTime(created)})${s.reset}`,
      ...(path ? [`${s.dim}Path${s.reset}     ${path}`] : []),
      ...(yearFilter ? [`${s.dim}Filter${s.reset}   ${yearFilter.start}${yearFilter.end !== yearFilter.start ? `-${yearFilter.end}` : ""}`] : []),
    ]
  );
  log(`\n${repoBox}`);

  const dirs = await findProjects(owner, repo, branch, path);
  log(`\n  ${s.cyan}◇${s.reset} ${s.dim}Found${s.reset} ${s.bold}${dirs.length}${s.reset} ${s.dim}templates${s.reset}\n`);

  const projects: Project[] = [];
  const BATCH = 50;
  for (let i = 0; i < dirs.length; i += BATCH) {
    const batch = dirs.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (dir) => {
        const commit = await getFirstCommit(owner, repo, dir === "." ? "package.json" : `${dir}/package.json`);
        return commit ? { path: dir, date: commit.date, sha: commit.sha } : null;
      })
    );
    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const year = r.value.date.getFullYear();
      if (!yearFilter || (year >= yearFilter.start && year <= yearFilter.end)) {
        projects.push(r.value);
      }
    }
    progress(Math.min(i + BATCH, dirs.length), dirs.length);
  }
  clearLine();

  projects.sort((a, b) => a.date.getTime() - b.date.getTime());
  const final = limit ? projects.slice(-limit) : projects;

  if (final.length === 0) {
    log(`  ${s.yellow}⚠${s.reset} ${s.dim}No templates found${s.reset}\n`);
  } else {
    const tableData = final.map((p) => ({
      date: formatDate(p.date),
      time: formatTime(p.date),
      sha: p.sha.slice(0, 7),
      project: p.path,
    }));
    log(table(tableData));
    log(`\n  ${s.dim}Showing${s.reset} ${s.bold}${final.length}${s.reset}${projects.length > final.length ? `${s.dim} of ${s.reset}${s.bold}${projects.length}${s.reset}` : ""} ${s.dim}templates${s.reset} ${s.dim}·${s.reset} ${s.green}▲${s.reset} ${s.dim}latest last${s.reset}`);
  }

  if (!token) {
    log(`\n  ${s.yellow}⚠${s.reset} ${s.dim}Set${s.reset} ${s.cyan}GITHUB_TOKEN${s.reset} ${s.dim}for higher rate limits (60/hr → 5000/hr)${s.reset}`);
  } else if (rateRemaining < 100 && rateLimit > 0) {
    log(`\n  ${s.yellow}⚠${s.reset} ${s.dim}Low quota:${s.reset} ${rateRemaining}/${rateLimit} ${s.dim}(resets ${new Date(rateReset * 1000).toLocaleTimeString()})${s.reset}`);
  }
  log("");
}

if (import.meta.main) main().catch((e: Error) => { log(`\n  ${s.red}✖${s.reset} ${e.message}\n`); process.exit(1); });
