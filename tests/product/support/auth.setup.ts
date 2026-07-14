import * as fs from 'fs';
import * as path from 'path';
import { test as setup } from './fixtures';
import { AUTH_ROLES, authFile } from './auth';
import { OtpUnavailableError, AppUnavailableError } from './ProductAppPage';

/**
 * `product-setup` project — authenticates each sign-in role once and saves its
 * storageState, so the per-role `product-authenticated` specs resume the session
 * instead of each re-logging in (the dev app rate-limits OTP per phone).
 *
 * Skip-safe by design: a role is skipped when its phone credential is absent
 * (`<ROLE>_PHONE` in the gitignored .env / CI secrets) or when the dev app/OTP is
 * unavailable. No session file is written for a skipped role, so the dependent
 * specs skip too — the suite stays green on CI without per-role secrets.
 */
for (const role of AUTH_ROLES) {
  setup(`authenticate ${role}`, async ({ product, page }) => {
    // The login flow resends the OTP once and waits for the code step (~27s worst case);
    // on a dev OTP-cooldown that path must run to completion so it throws
    // OtpUnavailableError and this role skips cleanly — the default 30s would time out
    // (a hard failure) mid-retry instead.
    setup.setTimeout(120_000);
    const key = role.toUpperCase().replace(/-/g, '_');
    setup.skip(!process.env[`${key}_PHONE`], `no ${key}_PHONE credential — ${role} session not created`);

    try {
      await product.openCalculator();
      await product.loginAs(role);
    } catch (err) {
      if (err instanceof OtpUnavailableError || err instanceof AppUnavailableError) {
        setup.skip(true, `dev app/OTP unavailable for ${role} — ${err.message}`);
        return;
      }
      throw err;
    }

    await fs.promises.mkdir(path.dirname(authFile(role)), { recursive: true });
    await page.context().storageState({ path: authFile(role) });
  });
}
