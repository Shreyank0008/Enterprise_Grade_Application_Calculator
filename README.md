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
