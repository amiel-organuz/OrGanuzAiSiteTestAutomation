# `env/` — per-target environment files

Local overrides + Restricted credentials, split by target environment. The active
file is selected by **`QA_TARGET_ENV`** (default `dev`):

| `QA_TARGET_ENV` | File loaded          | Product target                    | Password gate |
| --------------- | -------------------- | --------------------------------- | ------------- |
| `dev` (default) | `env/.dev.env`       | `dev1.app.organize.organuz.com`   | yes           |
| `prod`          | `env/.prod.env`      | `energy.organuz.com`              | no            |

## Names are unprefixed

Inside each file the variables are **unprefixed** (`CUSTOMER_PHONE`, not
`DEV_CUSTOMER_PHONE`) — the file itself scopes them. `playwright.config.ts` and
`scripts/run-all-tests.sh` load `env/.${QA_TARGET_ENV}.env`; an optional root
`.env` is a shared fallback (the env-specific file wins).

Per-role login uses `<ROLE>_PHONE` / `<ROLE>_OTP_CODE` for `CUSTOMER`,
`CONSULTANT`, `COMPANY` (resolved env-aware in `tests/product/support/roleCredentials.ts`,
which also accepts a legacy `<ENV>_<ROLE>_PHONE` fallback). Dev uses the fixed OTP `7777`.

## Setup

```bash
cp env/.dev.env.example  env/.dev.env    # fill in Restricted values
cp env/.prod.env.example env/.prod.env   # prod creds (optional locally)
```

The real `env/.dev.env` / `env/.prod.env` are **gitignored** (Restricted — never
commit). Only the `*.example` templates are committed. On CI the prod pipeline
materializes `env/.prod.env` from the `DOTENV_PROD` repo secret.
