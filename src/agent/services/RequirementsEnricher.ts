import type { AgentConfig } from '../config';
import type { OneDriveConnector } from '../connectors';
import type { RequirementsSummary, TestCase } from '../types';
import { RequirementsReader } from '../utils/RequirementsReader';

type RequirementsConfig = AgentConfig['requirements'];

export class RequirementsEnricher {
  constructor(
    private readonly oneDrive: OneDriveConnector,
    private readonly config: RequirementsConfig,
  ) {}

  async enrich(cases: TestCase[]): Promise<RequirementsSummary | undefined> {
    if (!this.config.path) return undefined;

    const preloadedFiles = this.config.source === 'onedrive'
      ? await this.oneDrive.downloadFiles(this.config.path)
      : undefined;

    const reader = new RequirementsReader(this.config.path, preloadedFiles);
    const files = await reader.load();
    if (files.length === 0) return undefined;

    reader.matchAndEnrich(cases, files);
    return {
      path: this.config.path,
      files,
    };
  }
}
