import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_ROOT = path.join(ROOT, '.snapshots');
const INDEX_FILE = path.join(SNAPSHOT_ROOT, 'index.json');

const EXCLUDED_SEGMENTS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.snapshots',
  '.tmp_video_frames',
  '.tmp_video_keyframes',
  '.venv',
  '__pycache__',
  '.pytest_cache',
  'dist',
  'build',
  '.git',
]);

const PRESERVE_ON_RESTORE = new Set(['.snapshots', 'node_modules', '.turbo', '.tmp_video_frames', '.tmp_video_keyframes']);

function sanitizeKeyword(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
}

function isExcludedPath(absolutePath) {
  const rel = path.relative(ROOT, absolutePath);
  if (!rel || rel === '.') return false;
  const parts = rel.split(path.sep);
  return parts.some((part) => EXCLUDED_SEGMENTS.has(part));
}

async function ensureSnapshotRoot() {
  await fs.mkdir(SNAPSHOT_ROOT, { recursive: true });
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { snapshots: {} };
  }
}

async function writeIndex(data) {
  await ensureSnapshotRoot();
  await fs.writeFile(INDEX_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function copyEntry(src, dest) {
  await fs.cp(src, dest, {
    recursive: true,
    force: true,
    filter: (candidate) => !isExcludedPath(candidate),
  });
}

async function saveSnapshot(keywordRaw) {
  if (!keywordRaw) {
    throw new Error('Provide a keyword: pnpm run snapshot:save -- <keyword>');
  }

  const keyword = sanitizeKeyword(keywordRaw);
  if (!keyword) {
    throw new Error('Invalid keyword.');
  }

  await ensureSnapshotRoot();
  const snapshotDir = path.join(SNAPSHOT_ROOT, keyword);
  await fs.rm(snapshotDir, { recursive: true, force: true });
  await fs.mkdir(snapshotDir, { recursive: true });

  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
    const src = path.join(ROOT, entry.name);
    const dest = path.join(snapshotDir, entry.name);
    await copyEntry(src, dest);
  }

  const index = await readIndex();
  const createdAt = new Date().toISOString();
  index.snapshots[keyword] = {
    keyword,
    folder: keyword,
    createdAt,
  };
  await writeIndex(index);

  console.log(`Saved snapshot "${keyword}" at ${createdAt}`);
}

async function restoreSnapshot(keywordRaw) {
  if (!keywordRaw) {
    throw new Error('Provide a keyword: pnpm run snapshot:restore -- <keyword>');
  }

  const keyword = sanitizeKeyword(keywordRaw);
  const snapshotDir = path.join(SNAPSHOT_ROOT, keyword);

  try {
    const stat = await fs.stat(snapshotDir);
    if (!stat.isDirectory()) throw new Error();
  } catch {
    throw new Error(`Snapshot "${keyword}" not found.`);
  }

  const rootEntries = await fs.readdir(ROOT, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (PRESERVE_ON_RESTORE.has(entry.name)) continue;
    const target = path.join(ROOT, entry.name);
    await fs.rm(target, { recursive: true, force: true });
  }

  const snapshotEntries = await fs.readdir(snapshotDir, { withFileTypes: true });
  for (const entry of snapshotEntries) {
    const src = path.join(snapshotDir, entry.name);
    const dest = path.join(ROOT, entry.name);
    await fs.cp(src, dest, { recursive: true, force: true });
  }

  console.log(`Restored snapshot "${keyword}".`);
}

async function listSnapshots() {
  const index = await readIndex();
  const snapshots = Object.values(index.snapshots ?? {});
  if (!snapshots.length) {
    console.log('No snapshots saved yet.');
    return;
  }
  snapshots
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .forEach((item) => {
      console.log(`${item.keyword}  ${item.createdAt}`);
    });
}

async function main() {
  const [, , mode, ...rest] = process.argv;
  const keyword = rest.join(' ').trim();

  if (mode === 'save') {
    await saveSnapshot(keyword);
    return;
  }

  if (mode === 'restore') {
    await restoreSnapshot(keyword);
    return;
  }

  if (mode === 'list') {
    await listSnapshots();
    return;
  }

  throw new Error('Usage: snapshot-manager.mjs <save|restore|list> [keyword]');
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
