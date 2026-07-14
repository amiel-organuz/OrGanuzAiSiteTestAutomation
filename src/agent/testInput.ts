import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { TestPlanInput } from './types';

/** Image extensions treated as page screenshots in the input folder. */
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Candidate URL-list filenames, in priority order. */
const URL_FILES = ['urls.txt', 'urls.json', 'url.txt'];

/**
 * Read the {@link TestPlanInput} the {@link TestPlanAgent} consumes from a folder
 * (default `test_input/`):
 *
 * - **URLs** come from the first present of `urls.txt` / `urls.json` / `url.txt`.
 *   A `.txt` file is one URL per line (blank lines and `#` comments ignored); a
 *   `.json` file is a JSON array of strings **or** `{ "urls": [...] }`.
 * - **Images** are every `*.png|jpg|jpeg|webp|gif` in the folder and in its
 *   optional `images/` subfolder — the reference screenshots of the pages.
 *
 * Missing folder / files degrade gracefully to empty arrays rather than throwing,
 * so a partially-populated `test_input/` still yields a usable input.
 */
export function readTestInput(dir = 'test_input'): TestPlanInput {
  const root = resolve(dir);
  if (!existsSync(root)) return { urls: [], images: [] };

  return { urls: readUrls(root), images: readImages(root) };
}

function readUrls(root: string): string[] {
  for (const name of URL_FILES) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, 'utf8');
    return name.endsWith('.json') ? parseJsonUrls(raw) : parseLineUrls(raw);
  }
  return [];
}

function parseLineUrls(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function parseJsonUrls(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.urls) ? parsed.urls : [];
    return list.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0);
  } catch {
    return [];
  }
}

function readImages(root: string): string[] {
  const dirs = [root, join(root, 'images')];
  const images: string[] = [];
  for (const d of dirs) {
    if (!existsSync(d) || !statSync(d).isDirectory()) continue;
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (IMAGE_EXT.test(entry) && statSync(full).isFile()) images.push(full);
    }
  }
  return images;
}
