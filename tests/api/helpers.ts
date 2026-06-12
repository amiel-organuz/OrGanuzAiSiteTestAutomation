import { APIResponse } from '@playwright/test';
import { allureAttachment } from '../../src/utils/allure';

export async function attachRequestResponse(
  method: string,
  path: string,
  payload: unknown,
  response: APIResponse,
): Promise<void> {
  const body = await response.text();

  const summary = [
    `${method} ${path}`,
    `Status: ${response.status()} ${response.statusText()}`,
    payload !== null ? `Request body: ${JSON.stringify(payload, null, 2)}` : '',
    `Response body: ${body}`,
  ]
    .filter(Boolean)
    .join('\n');

  await allureAttachment(`${method} ${path} — ${response.status()}`, summary, 'text/plain');
}
