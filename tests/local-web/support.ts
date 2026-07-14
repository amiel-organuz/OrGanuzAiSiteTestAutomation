import { test, expect } from '../ui/support/fixtures';

/**
 * Local-only marketing-site e2e support.
 *
 * These specs run against the live prod marketing site and are meant to run ONLY on a
 * developer machine — they are intentionally skipped on CI. Call `localOnly()` at the top
 * of each spec file: it registers a top-level guard that `test.skip`s every test in the
 * file when `process.env.CI` is set, so the suite stays green on CI while the tests still
 * run (and pass) locally. This is a sanctioned skip, like the credential-gated specs — see
 * the test-suite-parity skill.
 */
export function localOnly(): void {
  test.beforeEach(() => {
    test.skip(
      !!process.env.CI,
      'Local-only web e2e — intentionally skipped on CI (local-web project). Run it locally.',
    );
  });
}

export { test, expect };
