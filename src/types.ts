export interface Parameter {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  baselinePoints: number;
}

export interface Category {
  id: string;
  name: string;
  parameters: Parameter[];
}

/** Weightage keyed by parameter id. Presence of a key = parameter assessed. */
export type WeightageMap = Record<string, number>;

export interface Assessment {
  id: string;
  name: string;
  projectName: string;
  assessor: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  weightages: WeightageMap;
}

export type ProjectCategory =
  | 'Small'
  | 'Medium'
  | 'Large'
  | 'Enterprise'
  | 'Very Large Enterprise';

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  score: number;
  assessed: number;
  total: number;
}

export interface TopContributor {
  parameter: Parameter;
  weightage: number;
  contribution: number;
}
