/* GitHub repository ingestion: downloads a repo zipball via the GitHub API
   directly from the browser (api.github.com sends CORS headers), unzips it
   in memory with fflate, and returns the same FileEntry[] shape the folder
   scanner uses. Public repos need no token; private repos need a
   fine-grained PAT with read access (used only for this request, never stored). */
import { unzipSync } from 'fflate';
import { isReadable, isRelevantPath, type FileEntry } from './signals';

export interface RepoRef {
  owner: string;
  repo: string;
  branch?: string;
}

const MAX_FILES = 8000;
const MAX_ZIP_BYTES = 150 * 1024 * 1024; // 150 MB

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

export async function fetchRepoEntries(
  input: string,
  token: string | undefined,
  onStatus: (status: string) => void,
): Promise<{ entries: FileEntry[]; label: string }> {
  const ref = parseRepoUrl(input);

  onStatus('Looking up repository…');
  const infoRes = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, {
    headers: ghHeaders(token),
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
  const info = (await infoRes.json()) as { default_branch: string; size: number };
  const branch = ref.branch ?? info.default_branch;

  if (info.size * 1024 > MAX_ZIP_BYTES) {
    throw new Error(
      'Repository is larger than 150 MB — too big to analyze in the browser. Clone it locally and use "Local Folder" instead.',
    );
  }

  onStatus(`Downloading ${ref.owner}/${ref.repo}@${branch}…`);
  const zipRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/zipball/${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) },
  );
  if (!zipRes.ok) {
    throw new Error(
      zipRes.status === 404
        ? `Branch "${branch}" not found.`
        : `Failed to download repository (${zipRes.status}).`,
    );
  }
  const buf = new Uint8Array(await zipRes.arrayBuffer());
  if (buf.byteLength > MAX_ZIP_BYTES) {
    throw new Error('Downloaded archive exceeds the 150 MB browser limit.');
  }

  onStatus('Extracting files…');
  // yield so the status renders before the synchronous unzip
  await new Promise((r) => setTimeout(r, 30));
  return {
    entries: zipToEntries(buf),
    label: `${ref.owner}/${ref.repo}@${branch}`,
  };
}

export function zipToEntries(zipBytes: Uint8Array): FileEntry[] {
  const unzipped = unzipSync(zipBytes, {
    filter: (f) => {
      const rel = stripRoot(f.name);
      return rel !== '' && !f.name.endsWith('/') && isRelevantPath(rel);
    },
  });
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const entries: FileEntry[] = [];
  for (const [name, data] of Object.entries(unzipped)) {
    if (entries.length >= MAX_FILES) break;
    const path = stripRoot(name);
    const entry: FileEntry = { path, size: data.byteLength };
    if (isReadable(path, data.byteLength)) {
      entry.text = decoder.decode(data);
    }
    entries.push(entry);
  }
  return entries;
}

/** Zipballs wrap everything in a "owner-repo-sha/" root folder — remove it. */
function stripRoot(zipPath: string): string {
  return zipPath.split('/').slice(1).join('/');
}
