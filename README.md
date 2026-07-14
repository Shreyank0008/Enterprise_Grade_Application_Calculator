# Enterprise Project Assessment

React application replacing the Excel-based Enterprise Project Assessment Framework.
22 categories (A–V), 205 parameters, extracted from `Enterprise_Project_Assessment_Calculator.xlsx`.

## Quick start (no install)

Open `dist/index.html` in a browser — a pre-built copy is included.

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build → dist/
```

## Stack

React 19 · TypeScript · Vite · Material UI · Zustand (localStorage persistence) ·
React Hook Form · TanStack Table · Recharts · SheetJS (Excel export) · jsPDF (PDF export)

## How it works

1. Create an assessment (multiple assessments supported).
2. Each parameter has fixed, read-only Baseline Complexity Points.
3. Set Weightage (0–5) per parameter — the only editable field.
4. Complexity Contribution = Baseline × Weightage; totals and dashboard update live.
5. Classification: <2,000 Small · <5,000 Medium · <10,000 Large · <20,000 Enterprise · ≥20,000 Very Large Enterprise.

All data is stored in browser localStorage (no backend). Export via Excel, PDF, or Print.

## Auto-fill from code

Open an assessment → **Auto-Fill from Code** → select a project folder.
The folder is analyzed locally in the browser (nothing is uploaded): file
tree, manifests, and code patterns are turned into signals, and a rules
engine (`src/scanner/rules.ts`) maps them to proposed weightages (0–5)
with evidence. You review and adjust every value before applying. ~150 of
the 205 parameters can be scored this way; subjective ones (business,
delivery, migration context) are left for manual entry. Thresholds are
tunable in `rules.ts`.
