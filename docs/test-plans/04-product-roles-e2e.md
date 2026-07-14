# Test Plan 4 — Product Roles E2E (Live Per-Role Sessions)

> **⚠️ CURRENTLY DISABLED.** The `product-setup` and `product-authenticated`
> projects are commented out in `playwright.config.ts`, so this group does
> **not** run in the default suite. The spec files under `tests/product/flows/**`
> (and `tests/product/support/auth.setup.ts`) are retained — re-enable the group
> by uncommenting both projects in `playwright.config.ts`. The cases below still
> describe those specs.

| | |
|---|---|
| **Projects** | `product-setup` → `product-authenticated` |
| **Specs** | `tests/product/support/auth.setup.ts`, `tests/product/flows/roles.spec.ts` |
| **Target** | Dev calculator — `QA_TARGET_ENV` (default **dev**), per-role phone+OTP login |
| **Cases** | 13 (setup 3 + authenticated 10) |
| **Skips** | Per role — no credential (setup) or no saved session (authenticated) |
| **Skills** | `product-roles-e2e`, `organuz-product-roles` |

## Scope

Live, per-role coverage in a real browser. This group runs as two projects that
work together. `product-setup` signs each role in once, using phone number plus
a one-time passcode (OTP), and saves its login state to a `storageState` file.
`product-authenticated` then resumes that saved session and runs read-only
checks of each role's personal area. This is the live counterpart to Plan 3's
offline role contract. It stays dormant on CI until the per-role secrets exist,
so the suite stays green without them.

## Preconditions

- The live dev app plus its password gate (`PRODUCT_PLATFORM_PASSWORD`).
- Per-role credentials, stored in the gitignored `.env` file or as CI secrets:
  `<ROLE>_PHONE` / `<ROLE>_OTP_CODE` for `CUSTOMER`, `CONSULTANT`, and `COMPANY`.

## Gating (sanctioned skip)

- **`product-setup`:** a role is skipped when it has no `<ROLE>_PHONE`
  credential, or when the dev app or OTP is down. When a role is skipped, no
  session is written for it.
- **`product-authenticated`:** a role's specs skip when it has no saved session
  (`hasSavedSession(role)` is false) or when the session cannot resume.

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

- Keep skip and lifecycle logic at the test edge (the spec or fixture), not
  inside `ProductAppPage` or `ProductFlows`. Those two **throw** typed errors
  instead of deciding to skip.
- `product-authenticated` depends on `product-setup`. Run the dependent project
  and Playwright pulls the setup in automatically. Don't shard the setup
  separately, or each role logs in twice.
