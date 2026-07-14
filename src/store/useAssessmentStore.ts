import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assessment } from '../types';

interface AssessmentState {
  assessments: Assessment[];
  createAssessment: (data: {
    name: string;
    projectName: string;
    assessor: string;
    notes: string;
  }) => string;
  deleteAssessment: (id: string) => void;
  renameAssessment: (id: string, name: string) => void;
  setWeightage: (assessmentId: string, parameterId: string, weightage: number | null) => void;
  applyWeightages: (assessmentId: string, entries: { parameterId: string; weightage: number }[]) => void;
  resetWeightages: (assessmentId: string) => void;
}

function newId(): string {
  return `epa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Persisted to localStorage (key: epa-assessments) — auto-saves on every change. */
export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set) => ({
      assessments: [],

      createAssessment: (data) => {
        const id = newId();
        const now = new Date().toISOString();
        const assessment: Assessment = {
          id,
          ...data,
          createdAt: now,
          updatedAt: now,
          weightages: {},
        };
        set((s) => ({ assessments: [assessment, ...s.assessments] }));
        return id;
      },

      deleteAssessment: (id) =>
        set((s) => ({ assessments: s.assessments.filter((a) => a.id !== id) })),

      renameAssessment: (id, name) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === id ? { ...a, name, updatedAt: new Date().toISOString() } : a,
          ),
        })),

      setWeightage: (assessmentId, parameterId, weightage) =>
        set((s) => ({
          assessments: s.assessments.map((a) => {
            if (a.id !== assessmentId) return a;
            const weightages = { ...a.weightages };
            if (weightage === null) {
              delete weightages[parameterId];
            } else {
              weightages[parameterId] = weightage;
            }
            return { ...a, weightages, updatedAt: new Date().toISOString() };
          }),
        })),

      applyWeightages: (assessmentId, entries) =>
        set((s) => ({
          assessments: s.assessments.map((a) => {
            if (a.id !== assessmentId) return a;
            const weightages = { ...a.weightages };
            for (const e of entries) {
              weightages[e.parameterId] = Math.max(0, Math.min(5, Math.round(e.weightage)));
            }
            return { ...a, weightages, updatedAt: new Date().toISOString() };
          }),
        })),

      resetWeightages: (assessmentId) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? { ...a, weightages: {}, updatedAt: new Date().toISOString() }
              : a,
          ),
        })),
    }),
    { name: 'epa-assessments' },
  ),
);

export function useAssessment(id: string | undefined): Assessment | undefined {
  return useAssessmentStore((s) => s.assessments.find((a) => a.id === id));
}
