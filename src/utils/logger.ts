const RESET  = '\x1b[0m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GRAY   = '\x1b[90m';

export const logger = {
  step: (msg: string) => console.log(`${CYAN}  ▶ ${msg}${RESET}`),
  pass: (msg: string) => console.log(`${GREEN}  ✓ ${msg}${RESET}`),
  fail: (msg: string, err?: unknown) => console.error(`${RED}  ✗ ${msg}${err ? `\n    ${err}` : ''}${RESET}`),
  info: (msg: string) => console.log(`${GRAY}  ℹ ${msg}${RESET}`),
  warn: (msg: string) => console.warn(`${YELLOW}  ⚠ ${msg}${RESET}`),
};
