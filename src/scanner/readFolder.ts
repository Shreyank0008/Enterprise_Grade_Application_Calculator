/* Browser-side folder reading. Files never leave the machine — everything
   is read locally via the File API. */
import { isReadable, isRelevantPath, type FileEntry } from './signals';

const MAX_FILES = 8000;

export async function readFolder(
  fileList: FileList,
  onProgress: (done: number, total: number) => void,
): Promise<FileEntry[]> {
  const all = Array.from(fileList)
    .map((f) => ({
      file: f,
      path: ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(/\\/g, '/'),
    }))
    // strip the root folder name so paths are project-relative
    .map((x) => ({ ...x, path: x.path.split('/').slice(1).join('/') || x.path }))
    .filter((x) => isRelevantPath(x.path))
    .slice(0, MAX_FILES);

  const entries: FileEntry[] = [];
  let done = 0;
  for (const { file, path } of all) {
    const entry: FileEntry = { path, size: file.size };
    if (isReadable(path, file.size)) {
      try {
        entry.text = await file.text();
      } catch {
        /* unreadable — treat as binary */
      }
    }
    entries.push(entry);
    done += 1;
    if (done % 25 === 0 || done === all.length) {
      onProgress(done, all.length);
      // yield to the UI thread
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return entries;
}
