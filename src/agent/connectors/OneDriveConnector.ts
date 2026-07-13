import { stat, readdir, readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { logger } from '../../utils/logger';
import type { Artifact, LocalArtifact, OneDriveConnector } from '../../types/agent.types';

/** In-memory stub that mints deterministic fake share links. */
export class StubOneDriveConnector implements OneDriveConnector {
  /** Base for synthesised share links; swap for a real tenant URL later. */
  constructor(private readonly shareBase = 'https://onedrive.example/qa-evidence') {}

  async upload(folder: string, artifact: LocalArtifact): Promise<Artifact> {
    const url = `${this.shareBase}/${folder}/${encodeURIComponent(artifact.name)}`;
    logger.info(`OneDrive: uploaded ${artifact.kind} "${artifact.name}"`);
    return { kind: artifact.kind, name: artifact.name, url };
  }

  async uploadAll(folder: string, artifacts: LocalArtifact[]): Promise<Artifact[]> {
    return Promise.all(artifacts.map((a) => this.upload(folder, a)));
  }

  async downloadFiles(path: string): Promise<Array<{ name: string; content: Buffer }>> {
    logger.info(`OneDrive: downloading files from "${path}"`);
    try {
      const stats = await stat(path);
      let filesToRead: string[] = [];

      if (stats.isFile()) {
        filesToRead.push(path);
      } else if (stats.isDirectory()) {
        const children = await readdir(path);
        filesToRead = children
          .map((child) => join(path, child))
          .filter((fullPath) => {
            const ext = extname(fullPath).toLowerCase();
            return ext === '.pdf' || ext === '.docx' || ext === '.xlsx';
          });
      }

      const results: Array<{ name: string; content: Buffer }> = [];
      for (const f of filesToRead) {
        const name = basename(f);
        const content = await readFile(f);
        results.push({ name, content });
      }
      return results;
    } catch (err) {
      logger.fail(`OneDrive download failed from "${path}"`, err);
      return [];
    }
  }
}
