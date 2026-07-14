import * as XLSX from 'xlsx';
import { CATEGORIES, TOTAL_PARAMETERS } from '../data/parameters';
import type { Assessment } from '../types';
import { assessedCount, classify, completionPct, totalScore } from './calc';

export function exportToExcel(assessment: Assessment): void {
  const wb = XLSX.utils.book_new();

  // --- Estimation sheet ---
  const rows: (string | number)[][] = [['Enterprise-Grade Project Assessment'], []];
  for (const cat of CATEGORIES) {
    rows.push([`${cat.id}. ${cat.name}`]);
    rows.push([
      'Parameter',
      'Description',
      'Baseline Complexity Points',
      'Weightage (0-5)',
      'Complexity Contribution',
    ]);
    for (const p of cat.parameters) {
      const w = assessment.weightages[p.id];
      rows.push([
        p.name,
        p.description,
        p.baselinePoints,
        w === undefined ? '' : w,
        w === undefined ? '' : p.baselinePoints * w,
      ]);
    }
    rows.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 34 }, { wch: 60 }, { wch: 26 }, { wch: 16 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Project Estimation');

  // --- Dashboard sheet ---
  const score = totalScore(assessment.weightages);
  const dash: (string | number)[][] = [
    ['Enterprise Project Complexity Dashboard'],
    [],
    ['Assessment', assessment.name],
    ['Project', assessment.projectName],
    ['Assessor', assessment.assessor],
    ['Date', new Date(assessment.updatedAt).toLocaleString()],
    [],
    ['Total Complexity Score', score],
    ['Project Category', classify(score)],
    ['Total Parameters', TOTAL_PARAMETERS],
    ['Parameters Assessed', assessedCount(assessment.weightages)],
    ['Completion', `${completionPct(assessment.weightages)}%`],
  ];
  const wsDash = XLSX.utils.aoa_to_sheet(dash);
  wsDash['!cols'] = [{ wch: 28 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsDash, 'Dashboard');

  XLSX.writeFile(wb, `${safeName(assessment.name)}_Assessment.xlsx`);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Project';
}
