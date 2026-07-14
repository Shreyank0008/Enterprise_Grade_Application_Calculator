import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CATEGORIES, TOTAL_PARAMETERS } from '../data/parameters';
import type { Assessment } from '../types';
import {
  assessedCount,
  classify,
  completionPct,
  formatNumber,
  totalScore,
} from './calc';

const NAVY: [number, number, number] = [26, 58, 92];

export function exportToPdf(assessment: Assessment): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const score = totalScore(assessment.weightages);

  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text('Enterprise Project Assessment Report', 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `${assessment.name}  |  Project: ${assessment.projectName || '-'}  |  Assessor: ${assessment.assessor || '-'}  |  ${new Date(assessment.updatedAt).toLocaleString()}`,
    40,
    68,
  );

  autoTable(doc, {
    startY: 90,
    head: [['Total Complexity Score', 'Project Category', 'Parameters Assessed', 'Completion']],
    body: [
      [
        formatNumber(score),
        classify(score),
        `${assessedCount(assessment.weightages)} / ${TOTAL_PARAMETERS}`,
        `${completionPct(assessment.weightages)}%`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, fontSize: 9 },
    bodyStyles: { fontSize: 11, fontStyle: 'bold' },
  });

  for (const cat of CATEGORIES) {
    const body = cat.parameters.map((p) => {
      const w = assessment.weightages[p.id];
      return [
        p.name,
        String(p.baselinePoints),
        w === undefined ? '—' : String(w),
        w === undefined ? '—' : formatNumber(p.baselinePoints * w),
      ];
    });
    const catScore = cat.parameters.reduce(
      (sum, p) =>
        sum +
        (assessment.weightages[p.id] === undefined
          ? 0
          : p.baselinePoints * assessment.weightages[p.id]),
      0,
    );
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18
        : 90,
      head: [
        [
          {
            content: `${cat.id}. ${cat.name}   (Category Score: ${formatNumber(catScore)})`,
            colSpan: 4,
          },
        ],
        ['Parameter', 'Baseline Points', 'Weightage', 'Contribution'],
      ],
      body,
      theme: 'striped',
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'right', cellWidth: 90 },
        2: { halign: 'right', cellWidth: 70 },
        3: { halign: 'right', cellWidth: 90 },
      },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`${assessment.name.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Project'}_Assessment.pdf`);
}
