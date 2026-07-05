import { stat, readdir, readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { logger } from '../../utils/logger';
import type { TestCase, RequirementsFileSummary } from '../types';

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
import * as XLSX from 'xlsx';

export interface ParsedRequirementFile {
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'unknown';
  text: string;
  excelData?: Array<{ sheetName: string; rows: any[] }>;
}

export class RequirementsReader {
  private files: ParsedRequirementFile[] = [];

  constructor(
    private readonly path: string,
    private readonly preloadedFiles?: Array<{ name: string; content: Buffer }>
  ) {}

  /**
   * Load and parse all requirements files in the configured path.
   * If path is a file, parse it. If directory, parse all matching files.
   */
  async load(): Promise<RequirementsFileSummary[]> {
    const summaries: RequirementsFileSummary[] = [];

    // If preloadedFiles is provided (e.g. from OneDrive), parse them directly
    if (this.preloadedFiles && this.preloadedFiles.length > 0) {
      for (const file of this.preloadedFiles) {
        try {
          const parsed = await this.parseFileFromBuffer(file.name, file.content);
          if (parsed) {
            this.files.push(parsed);
            summaries.push({
              name: parsed.name,
              type: parsed.type,
              characterCount: parsed.text.length,
              matchedCases: [], // To be populated during matching
            });
          }
        } catch (err) {
          logger.fail(`Failed to parse preloaded requirements file: ${file.name}`, err);
        }
      }
      return summaries;
    }

    if (!this.path) {
      return [];
    }

    try {
      const stats = await stat(this.path);
      let filesToParse: string[] = [];

      if (stats.isFile()) {
        filesToParse.push(this.path);
      } else if (stats.isDirectory()) {
        const children = await readdir(this.path);
        filesToParse = children
          .map((child) => join(this.path, child))
          .filter((fullPath) => {
            const ext = extname(fullPath).toLowerCase();
            return ext === '.pdf' || ext === '.docx' || ext === '.xlsx';
          });
      }

      for (const filePath of filesToParse) {
        try {
          const parsed = await this.parseFile(filePath);
          if (parsed) {
            this.files.push(parsed);
            summaries.push({
              name: parsed.name,
              type: parsed.type,
              characterCount: parsed.text.length,
              matchedCases: [], // To be populated during matching
            });
          }
        } catch (err) {
          logger.fail(`Failed to parse requirements file: ${filePath}`, err);
        }
      }

      return summaries;
    } catch (err) {
      logger.fail(`Failed to read requirements path: ${this.path}`, err);
      return [];
    }
  }

  /**
   * Matches parsed requirements with the test cases, appending matched criteria
   * to case.acceptanceCriteria.
   */
  matchAndEnrich(cases: TestCase[], summaries: RequirementsFileSummary[]): void {
    const fileSummaryMap = new Map(summaries.map((s) => [s.name, s]));

    for (const testCase of cases) {
      const caseId = testCase.id;
      const caseIdLower = caseId.toLowerCase();

      for (const parsedFile of this.files) {
        const fileSummary = fileSummaryMap.get(parsedFile.name);
        let matched = false;

        // 1. Excel parsing & matching (structural search)
        if (parsedFile.type === 'xlsx' && parsedFile.excelData) {
          for (const sheet of parsedFile.excelData) {
            for (const row of sheet.rows) {
              // Search for a column indicating case ID
              const idKey = Object.keys(row).find((k) =>
                /case\s*id|test\s*case|tc\s*id|id/i.test(k)
              );

              if (idKey && String(row[idKey]).toLowerCase() === caseIdLower) {
                // Find criteria column
                const criteriaKey = Object.keys(row).find((k) =>
                  /criteria|requirement|acceptance|description|text/i.test(k)
                );

                const criteriaText = criteriaKey
                  ? String(row[criteriaKey]).trim()
                  : Object.entries(row)
                      .filter(([k]) => k !== idKey)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');

                if (criteriaText) {
                  this.addAcceptanceCriterion(testCase, parsedFile.name, criteriaText);
                  matched = true;
                }
              }
            }
          }
        }

        // 2. PDF/DOCX (Text) parsing & matching
        if (parsedFile.type === 'pdf' || parsedFile.type === 'docx') {
          // Look for direct match like [caseId] or caseId: or just caseId in text
          const escapedId = caseId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regexPatterns = [
            // Matches e.g. [TC-1] or [1001] followed by criteria
            new RegExp(`\\[${escapedId}\\]\\s*([^\\n]+)`, 'i'),
            // Matches e.g. TC-1: or 1001: followed by criteria
            new RegExp(`\\b${escapedId}\\s*:\\s*([^\\n]+)`, 'i'),
            // Matches e.g. Requirement TC-1: followed by criteria
            new RegExp(`\\b${escapedId}\\s*-\\s*([^\\n]+)`, 'i'),
          ];

          for (const regex of regexPatterns) {
            const match = parsedFile.text.match(regex);
            if (match && match[1]) {
              const criteriaText = match[1].trim();
              if (criteriaText) {
                this.addAcceptanceCriterion(testCase, parsedFile.name, criteriaText);
                matched = true;
              }
            }
          }

          // Fallback: If caseId is mentioned but no specific regex matched, check if caseId exists in text
          // and log it or link it as general matching
          if (!matched && parsedFile.text.toLowerCase().includes(caseIdLower)) {
            // Find the sentence containing the case ID
            const sentences = parsedFile.text.split(/[.!\r\n]+/);
            const matchingSentence = sentences.find((s) => s.toLowerCase().includes(caseIdLower));
            if (matchingSentence) {
              const cleanSentence = matchingSentence.trim();
              this.addAcceptanceCriterion(testCase, parsedFile.name, cleanSentence);
              matched = true;
            }
          }
        }

        if (matched && fileSummary) {
          if (!fileSummary.matchedCases.includes(caseId)) {
            fileSummary.matchedCases.push(caseId);
          }
        }
      }
    }
  }

  private addAcceptanceCriterion(testCase: TestCase, source: string, description: string): void {
    const cleanSource = source.replace(/\.[^/.]+$/, ''); // remove extension
    const id = `${cleanSource}-REQ-${testCase.acceptanceCriteria.length + 1}`;
    
    // Avoid duplicates
    if (!testCase.acceptanceCriteria.some((c) => c.description === description)) {
      testCase.acceptanceCriteria.push({
        id,
        description,
      });
      logger.info(`Matched requirement from ${source} for TestCase ${testCase.id}: "${description}"`);
    }
  }

  private async parseFile(filePath: string): Promise<ParsedRequirementFile | null> {
    const name = basename(filePath);
    const buffer = await readFile(filePath);
    return this.parseFileFromBuffer(name, buffer);
  }

  private async parseFileFromBuffer(name: string, buffer: Buffer): Promise<ParsedRequirementFile | null> {
    const ext = extname(name).toLowerCase();

    if (ext === '.pdf') {
      let text = '';
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      try {
        if (pdfParse && typeof pdfParse.PDFParse === 'function') {
          const parser = new pdfParse.PDFParse(uint8);
          const res = await parser.getText();
          text = res.text || '';
        } else if (typeof pdfParse === 'function') {
          const res = await pdfParse(buffer);
          text = res.text || '';
        } else {
          const pdfLib = require('pdf-parse');
          if (pdfLib.PDFParse) {
            const parser = new pdfLib.PDFParse(uint8);
            const res = await parser.getText();
            text = res.text || '';
          }
        }
      } catch (err) {
        logger.fail(`pdf-parse execution failed for ${name}`, err);
      }
      return {
        name,
        type: 'pdf',
        text,
      };
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return {
        name,
        type: 'docx',
        text: result.value || '',
      };
    }

    if (ext === '.xlsx') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const excelData: Array<{ sheetName: string; rows: any[] }> = [];
      let fullText = '';

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        excelData.push({ sheetName, rows });
        
        // Build a text representation of XLSX rows for text matching fallbacks
        fullText += `Sheet: ${sheetName}\n` + rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
      }

      return {
        name,
        type: 'xlsx',
        text: fullText,
        excelData,
      };
    }

    return null;
  }
}
