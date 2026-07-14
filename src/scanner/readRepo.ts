/* GitHub repository ingestion — runs entirely in the browser.
   Note: GitHub's zipball/tarball downloads redirect to codeload.github.com,
   which does NOT send CORS headers for third-party origins, so archives
   can't be fetched from a browser. Instead we:
     1. list the repo tree via api.github.com (CORS-enabled),
     2. fetch each relevant text file individually —
        - public repos: raw.githubusercontent.com (CORS *, no API rate limit)
        - with a token:  api.github.com blob endpoint (5000 req/hr authed)
   Public repos need no token; private repos need a fine-grained PAT with
   read access (used only for these requests, never stored). */
import { isReadable, isRelevantPath, type FileEntry } from './signals';

export interface RepoRef {
  owner: string;
  repo: string;
  branch?: string;
}

const MAX_FILES = 8000; // entries kept for path-based signals
const MAX_CONTENT_FILES = 1500; // files whose text we download
const MAX_TOTAL_BYTES = 150 * 1024 * 1024; // 150 MB repo cap
const CONCURRENCY = 16;

export function parseRepoUrl(input: string): RepoRef {
  const s = input.trim();
  // git@github.com:owner/repo.git
  const ssh = s.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  // https://github.com/owner/repo[/tree/branch[/...]]
  const web = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:\/tree\/([^/#?]+))?(?:[/#?].*)?$/,
  );
  if (web) return { owner: web[1], repo: web[2], branch: web[3] };
  // owner/repo shorthand
  const short = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  throw new Error(
    'Could not parse that as a GitHub repository. Use https://github.com/owner/repo or owner/repo.',
  );
}

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) h.Authorization = `Bearer ${token.trim()}`;
  return h;
}

interface TreeItem {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
}

export async function fetchRepoEntries(
  input: string,
  token: string | undefined,
  onStatus: (status: string) => void,
): Promise<{ entries: FileEntry[]; label: string }> {
  const ref = parseRepoUrl(input);
  const tok = token?.trim() || undefined;

  onStatus('Looking up repository…');
  const infoRes = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, {
    headers: ghHeaders(tok),
  });
  if (infoRes.status === 404) {
    throw new Error(
      'Repository not found. Check the URL — for private repos, add a GitHub token with read access.',
    );
  }
  if (infoRes.status === 403 || infoRes.status === 429) {
    throw new Error(
      'GitHub API rate limit reached. Add a GitHub token to raise the limit, or try again later.',
    );
  }
  if (!infoRes.ok) throw new Error(`GitHub API error (${infoRes.status}).`);
  const info = (await infoRes.json()) as {
    default_branch: string;
    size: number;
    private: boolean;
  };
  const branch = ref.branch ?? info.default_branch;

  if (info.size * 1024 > MAX_TOTAL_BYTES) {
    throw new Error(
      'Repository is larger than 150 MB — too big to analyze in the browser. Clone it locally and use "Local Folder" instead.',
    );
  }

  onStatus('Listing repository files…');
  const treeRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders(tok) },
  );
  if (!treeRes.ok) {
    throw new Error(
      treeRes.status === 404
        ? `Branch "${branch}" not found.`
        : `Failed to list repository files (${treeRes.status}).`,
    );
  }
  const tree = (await treeRes.json()) as { tree: TreeItem[]; truncated?: boolean };

  // Keep every relevant path for path-based signals; mark which get content.
  const blobs = tree.tree.filter((t) => t.type === 'blob' && isRelevantPath(t.path));
  const entries: FileEntry[] = [];
  const toFetch: { entry: FileEntry; sha: string }[] = [];
  for (const b of blobs) {
    if (entries.length >= MAX_FILES) break;
    const entry: FileEntry = { path: b.path, size: b.size ?? 0 };
    entries.push(entry);
    if (toFetch.length < MAX_CONTENT_FILES && isReadable(b.path, b.size ?? 0)) {
      toFetch.push({ entry, sha: b.sha });
    }
  }

  // Private repos (or user-supplied token): use the authenticated blob API.
  // Public repos without a token: raw.githubusercontent.com — CORS-enabled
  // and not subject to the 60 req/hr anonymous API limit.
  const useBlobApi = Boolean(tok);
  const rawBase = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${encodeURIComponent(branch)}/`;

  let done = 0;
  const total = toFetch.length;
  const fetchOne = async (item: { entry: FileEntry; sha: string }): Promise<void> => {
    try {
      const res = useBlobApi
        ? await fetch(
            `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/blobs/${item.sha}`,
            { headers: { ...ghHeaders(tok), Accept: 'application/vnd.github.raw+json' } },
          )
        : await fetch(rawBase + item.entry.path.split('/').map(encodeURIComponent).join('/'));
      if (res.ok) item.entry.text = await res.text();
    } catch {
      /* skip unreadable file — path-based signals still count it */
    }
    done += 1;
    if (done % 25 === 0 || done === total) {
      onStatus(`Downloading files… ${done}/${total}`);
    }
  };

  onStatus(`Downloading files… 0/${total}`);
  const queue = [...toFetch];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      await fetchOne(item);
    }
  });
  await Promise.all(workers);

  const suffix = tree.truncated ? ' (large repo — partial listing)' : '';
  return {
    entries,
    label: `${ref.owner}/${ref.repo}@${branch}${suffix}`,
  };
}
