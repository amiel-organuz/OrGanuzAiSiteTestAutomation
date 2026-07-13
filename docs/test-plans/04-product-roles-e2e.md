# Test Plan 4 — Product Roles E2E (Live Per-Role Sessions)

| | |
|---|---|
| **Projects** | `product-setup` → `product-authenticated` |
| **Specs** | `tests/product/support/auth.setup.ts`, `tests/product/flows/roles.spec.ts` |
| **Target** | Dev calculator — `QA_TARGET_ENV` (default **dev**), per-role phone+OTP login |
| **Cases** | 13 (setup 3 + authenticated 10) |
| **Skips** | Per role — no credential (setup) or no saved session (authenticated) |
| **Skills** | `product-roles-e2e`, `organuz-product-roles` |

## Scope

Live, per-role browser coverage. `product-setup` signs each role in once via
phone+OTP and saves its `storageState`; `product-authenticated` resumes that
session and runs read-only checks of each role's personal area. This is the
live counterpart to Plan 3's offline role contract. Dormant on CI until per-role
secrets exist — the suite stays green without them.

## Preconditions

- Live dev app + gate (`PRODUCT_PLATFORM_PASSWORD`).
- Per-role credentials in the gitignored `.env` / CI secrets:
  `<ROLE>_PHONE` / `<ROLE>_OTP_CODE` for `CUSTOMER`, `CONSULTANT`, `COMPANY`.

## Gating (sanctioned skip)

- **`product-setup`:** a role with no `<ROLE>_PHONE` (or when the dev app/OTP is
  down) is skipped — no session is written for it.
- **`product-authenticated`:** each role's specs skip when it has no saved
  session (`hasSavedSession(role)` false) or the session cannot resume.

## Cases

### `auth.setup.ts` — per-role sign-in (project `product-setup`)

| ID | Case | Asserts |
|----|------|---------|
| SET-01 | Authenticate **customer** and save storageState | Customer phone+OTP login succeeds; session persisted |
| SET-02 | Authenticate **consultant** and save storageState | Consultant phone+OTP login succeeds; session persisted |
| SET-03 | Authenticate **company** and save storageState | Company phone+OTP login succeeds; session persisted |

### `roles.spec.ts` — live role sessions (project `product-authenticated`, `@product @roles @e2e`)

| ID | Case | Asserts |
|----|------|---------|
| CUS-01 | Customer resumes its saved session into the calculator shell | Session resumes; shell authenticated |
| CUS-02 | Customer can open its personal area | Customer personal area opens |
| CUS-03 | Customer session persists across a reload | Session survives a page reload |
| CON-01 | Consultant resumes its saved session into the calculator shell | Session resumes; shell authenticated |
| CON-02 | Consultant can open its personal area | Consultant personal area opens |
| CON-03 | Consultant session persists across a reload | Session survives a page reload |
| COM-01 | Company resumes its saved session into the calculator shell | Session resumes; shell authenticated |
| COM-02 | Company can open its personal area | Company personal area opens |
| COM-03 | Company session persists across a reload | Session survives a page reload |
| COM-04 | Company can open the contractor pricing area | Company-only pricing area opens |

## Run

```bash
# Runs product-setup first (its dependency), then the authenticated flows:
QA_TARGET_ENV=dev npx playwright test --project=product-authenticated
```

## Notes

- Keep skip/lifecycle logic at the test edge (spec/fixture), not in
  `ProductAppPage` or `ProductFlows` — those **throw** typed errors.
- `product-authenticated` depends on `product-setup`; run the dependent project
  and Playwright pulls the setup in. Don't shard the setup separately (double login).
