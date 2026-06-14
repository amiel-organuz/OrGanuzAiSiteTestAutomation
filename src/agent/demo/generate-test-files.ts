import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as XLSX from 'xlsx';

const execAsync = promisify(exec);

async function main() {
  const targetDir = join(process.cwd(), 'test-requirements-docs');
  await mkdir(targetDir, { recursive: true });

  console.log(`Generating test requirements documents in: ${targetDir}`);

  // 1. Generate Excel (.xlsx) file
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Case ID', 'Requirement Description'],
    ['TC-101', 'Verify the home page hero section renders correctly and contains matching title'],
    ['TC-102', 'Form submissions toast must show a valid message upon success'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Requirements');
  
  const excelPath = join(targetDir, 'requirements.xlsx');
  XLSX.writeFile(wb, excelPath);
  console.log(`Generated Excel: ${excelPath}`);

  // 2. Generate Word (.docx) file
  // We'll create the directory structure, write the XMLs, and zip them.
  const tempDocxDir = join(targetDir, 'temp-docx');
  const relsDir = join(tempDocxDir, '_rels');
  const wordDir = join(tempDocxDir, 'word');
  
  await mkdir(relsDir, { recursive: true });
  await mkdir(wordDir, { recursive: true });

  const relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const contentTypesContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Requirements for OrGanuz QA Automation</w:t></w:r></w:p>
    <w:p><w:r><w:t>Contact Form Requirements:</w:t></w:r></w:p>
    <w:p><w:r><w:t>[TC-102] - Ensure contact form submissions show a success toast notification.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Blog Requirements:</w:t></w:r></w:p>
    <w:p><w:r><w:t>[TC-103]: The first post card on the blog page must be visible.</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  await writeFile(join(relsDir, '.rels'), relsContent, 'utf8');
  await writeFile(join(tempDocxDir, '[Content_Types].xml'), contentTypesContent, 'utf8');
  await writeFile(join(wordDir, 'document.xml'), documentXmlContent, 'utf8');

  const docxPath = join(targetDir, 'requirements.docx');
  
  // Zip the contents using macOS native zip command
  await execAsync(`zip -r "${docxPath}" .rels "[Content_Types].xml" word`, { cwd: tempDocxDir });
  console.log(`Generated Word: ${docxPath}`);

  // Clean up temp docx folder
  await rm(tempDocxDir, { recursive: true, force: true });

  // 3. Generate PDF (.pdf) file
  // We'll write a simple valid PDF structure that pdf-parse can parse.
  // We define font dictionary /F1, which is good practice.
  const pdfPath = join(targetDir, 'requirements.pdf');
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
70 700 Td
(OrGanuz QA Requirements PDF) Tj
0 -20 Td
(This document outlines acceptance criteria:) Tj
0 -20 Td
([TC-101] - Hero headline is visible and matches product branding) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000232 00000 n 
0000000431 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
503
%%EOF
`;

  await writeFile(pdfPath, pdfContent, 'binary');
  console.log(`Generated PDF: ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
