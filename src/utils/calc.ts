import { CATEGORIES, TOTAL_PARAMETERS } from '../data/parameters';
import type {
  CategorySummary,
  ProjectCategory,
  TopContributor,
  WeightageMap,
} from '../types';

export const WEIGHTAGE_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export function contribution(baseline: number, weightage: number | undefined): number {
  return weightage === undefined ? 0 : baseline * weightage;
}

export function totalScore(weightages: WeightageMap): number {
  let sum = 0;
  for (const cat of CATEGORIES) {
    for (const p of cat.parameters) {
      sum += contribution(p.baselinePoints, weightages[p.id]);
    }
  }
  return sum;
}

/** Mirrors the Excel dashboard formula:
 *  <2000 Small, <5000 Medium, <10000 Large, <20000 Enterprise, else Very Large Enterprise */
export function classify(score: number): ProjectCategory {
  if (score < 2000) return 'Small';
  if (score < 5000) return 'Medium';
  if (score < 10000) return 'Large';
  if (score < 20000) return 'Enterprise';
  return 'Very Large Enterprise';
}

export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  Small: '#2e7d32',
  Medium: '#0288d1',
  Large: '#ed6c02',
  Enterprise: '#9c27b0',
  'Very Large Enterprise': '#d32f2f',
};

export function assessedCount(weightages: WeightageMap): number {
  return Object.keys(weightages).length;
}

export function completionPct(weightages: WeightageMap): number {
  return TOTAL_PARAMETERS === 0
    ? 0
    : Math.round((assessedCount(weightages) / TOTAL_PARAMETERS) * 100);
}

export function categorySummaries(weightages: WeightageMap): CategorySummary[] {
  return CATEGORIES.map((cat) => {
    let score = 0;
    let assessed = 0;
    for (const p of cat.parameters) {
      const w = weightages[p.id];
      if (w !== undefined) {
        assessed += 1;
        score += p.baselinePoints * w;
      }
    }
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      score,
      assessed,
      total: cat.parameters.length,
    };
  });
}

export function topContributors(weightages: WeightageMap, limit = 10): TopContributor[] {
  const rows: TopContributor[] = [];
  for (const cat of CATEGORIES) {
    for (const p of cat.parameters) {
      const w = weightages[p.id];
      if (w !== undefined && w > 0) {
        rows.push({ parameter: p, weightage: w, contribution: p.baselinePoints * w });
      }
    }
  }
  rows.sort((a, b) => b.contribution - a.contribution);
  return rows.slice(0, limit);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
