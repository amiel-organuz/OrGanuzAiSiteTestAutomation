# Test Plan 3 — Product Matrix & Role Data Contracts (Offline)

| | |
|---|---|
| **Project** | `product` |
| **Specs** | `tests/product/matrix/product-matrix-data-contract.spec.ts`, `tests/product/matrix/product-roles-contract.spec.ts` |
| **Target** | **Offline** — assertions over checked-in fixtures behind the `e2e-matrix.data` barrel |
| **Cases** | 23 (13 matrix + 10 roles) |
| **Skips** | None — network-free, always runs |
| **Skill** | `product-matrix-contract` |

## Scope

Data-contract guards that run with no network access. "Data contract" means the
tests assert the shape and rules of checked-in fixture data rather than any live
behavior. They cover two things: the property-characterization **matrix** (a grid
of scenarios × personas) and the three sign-in **roles**. The tests encode the
rules from the source document, so any drift in the fixtures fails fast. They
also keep runtime-only values — live tokens, computed prices — out of the
committed data. No browser and no dev app are involved.

## Preconditions

- None beyond a typecheck. The data lives in the `e2e-matrix.data` files, and no
  secrets are required.

## Cases

### `product-matrix-data-contract.spec.ts` — "Product matrix data contract" (`@product`)

| ID | Case | Asserts |
|----|------|---------|
| MTX-01 | Keeps runtime-only values out of checked-in matrix data | No live/computed runtime values committed |
| MTX-02 | Keeps the scenario × persona matrix at its expected size | Matrix dimensions match the documented size |
| MTX-03 | Matches the required CALC-ROOF main scenario ids from the document | All required CALC-ROOF ids present |
| MTX-04 | Covers every calculator property type from the document | Every property type represented |
| MTX-05 | Covers building, parking, and sports-court polygon behavior | Each polygon behavior covered |
| MTX-06 | Covers all roof and surface types from the document | Every roof/surface type present |
| MTX-07 | Keeps roof payload placeholders empty in checked-in data | Roof payload placeholders remain empty pre-run |
| MTX-08 | Marks no-panel scenario as UI-only and keeps it out of API/JSON E2E flows | No-panel scenario flagged UI-only, excluded from API flows |
| MTX-09 | Assigns a unique id to every matrix scenario | Scenario ids are unique |
| MTX-10 | Keeps arena type consistent with each scenario group | Arena type matches scenario group |
| MTX-11 | Keeps the negative scenario below the quotable panel minimum | Negative scenario sits under the quotable minimum |
| MTX-12 | Grants elevated company privileges to exactly one persona | Exactly one persona has elevated company rights |
| MTX-13 | Aligns panel counts with each scenario panel mode | Panel counts consistent with panel mode |

### `product-roles-contract.spec.ts` — "Product role contract" (`@product`)

| ID | Case | Asserts |
|----|------|---------|
| ROL-01 | Models all three sign-in roles as distinct personas | customer / consultant / company are distinct |
| ROL-02 | Every sign-in role has a human-readable name and role description | Name + description present per role |
| ROL-03 | Post-funding destination is a known value for every sign-in role | Destination is an allowed enum value |
| ROL-04 | Customer is the only sign-in role that lands on quotations after funding | Only customer → quotations post-funding |
| ROL-05 | Customer can open quotations from the results screen | Customer has quotations access from results |
| ROL-06 | Consultant reaches results but can still open quotations | Consultant result flow + quotations access |
| ROL-07 | Company downloads its own quotation from results, not the quotations list | Company downloads own quotation from results |
| ROL-08 | Only company can open company pricing | Company-only pricing access |
| ROL-09 | Only company can open company management | Company-only management access |
| ROL-10 | Company is the only role with any elevated company rights | Elevated rights are exclusive to company |

## Run

```bash
npx playwright test --project=product tests/product/matrix
```

## Notes

- This group is the offline counterpart to Plan 4 (live role e2e). The role
  contract here asserts the *rules*; Plan 4 confirms that a live session actually
  *behaves* by those rules.
- When the source document changes, edit the data in the `e2e-matrix.data`
  files, not the specs. The contract then re-validates the new data.
