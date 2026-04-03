import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Active job
  activeJobId: null,
  setActiveJob: (id) => set({ activeJobId: id }),

  // Sourcing progress
  sourcingJob: null,      // { jobId, status, progress, steps, candidates }
  setSourcingJob: (s) => set({ sourcingJob: s }),
  clearSourcing: () => set({ sourcingJob: null }),

  // Candidate detail panel
  selectedCandidate: null,
  setSelectedCandidate: (c) => set({ selectedCandidate: c }),

  // Pipeline filters
  pipelineStage: 'all',
  setPipelineStage: (s) => set({ pipelineStage: s }),

  // Model preference (overrides settings page for quick switch)
  modelOverride: null,
  setModelOverride: (m) => set({ modelOverride: m }),
}))
