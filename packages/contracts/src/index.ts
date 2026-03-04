import { z } from 'zod';

export const ProblemTypeSchema = z.enum(['CVRP', 'SCHEDULING', 'PORTFOLIO', 'ROUTING']);
export type ProblemType = z.infer<typeof ProblemTypeSchema>;

export const CustomerNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  demand: z.number().nonnegative(),
});
export type CustomerNode = z.infer<typeof CustomerNodeSchema>;

export const CvrpSolveRequestSchema = z.object({
  problem_type: z.literal('CVRP'),
  nodes: z.array(CustomerNodeSchema).min(1),
  vehicles: z.number().int().positive(),
  capacity: z.number().positive(),
  epsilon: z.number().positive().max(0.2).default(0.01),
  alpha: z.number().default(1),
  beta: z.number().default(1),
  gamma: z.number().default(1),
  stream: z.boolean().default(true),
});
export type CvrpSolveRequest = z.infer<typeof CvrpSolveRequestSchema>;

export const MockSolveRequestSchema = z.object({
  problem_type: z.union([
    z.literal('SCHEDULING'),
    z.literal('PORTFOLIO'),
    z.literal('ROUTING'),
  ]),
  epsilon: z.number().positive().max(0.2).default(0.01),
  stream: z.boolean().default(true),
  payload: z.record(z.any()).default({}),
});
export type MockSolveRequest = z.infer<typeof MockSolveRequestSchema>;

export const BoundsSchema = z.object({
  ub: z.number(),
  lb: z.number(),
  gap: z.number().nonnegative(),
});
export type Bounds = z.infer<typeof BoundsSchema>;

export const SigmaEntrySchema = z.object({
  key: z.string(),
  lb: z.number(),
  ub: z.number(),
  confidence: z.number().min(0).max(1).default(1),
});
export type SigmaEntry = z.infer<typeof SigmaEntrySchema>;

const EventBase = z.object({
  job_id: z.string(),
  ts: z.string(),
  domain: ProblemTypeSchema,
});

export const SsePhaseStartSchema = EventBase.extend({
  type: z.literal('phase_start'),
  phase: z.enum(['GREEDY', 'DP', 'BB']),
  message: z.string().optional(),
});

export const SsePhaseProgressSchema = EventBase.extend({
  type: z.literal('phase_progress'),
  phase: z.enum(['GREEDY', 'DP', 'BB']),
  bounds: BoundsSchema,
  progress: z.number().min(0).max(1),
});

export const SsePhaseCompleteSchema = EventBase.extend({
  type: z.literal('phase_complete'),
  phase: z.enum(['GREEDY', 'DP', 'BB']),
  bounds: BoundsSchema,
  metrics: z.record(z.number()).default({}),
});

export const SseNodePrunedSchema = EventBase.extend({
  type: z.literal('node_pruned'),
  phase: z.literal('BB'),
  node_id: z.string(),
  pruned_count: z.number().int().nonnegative(),
  bounds: BoundsSchema,
});

export const SseSigmaSnapshotSchema = EventBase.extend({
  type: z.literal('sigma_snapshot'),
  entries: z.array(SigmaEntrySchema),
});

export const SseCompleteSchema = EventBase.extend({
  type: z.literal('complete'),
  bounds: BoundsSchema,
  solution: z.record(z.any()),
  runtime_ms: z.number().nonnegative(),
});

export const SseErrorSchema = EventBase.extend({
  type: z.literal('error'),
  error: z.string(),
});

export const SolveEventSchema = z.discriminatedUnion('type', [
  SsePhaseStartSchema,
  SsePhaseProgressSchema,
  SsePhaseCompleteSchema,
  SseNodePrunedSchema,
  SseSigmaSnapshotSchema,
  SseCompleteSchema,
  SseErrorSchema,
]);

export type SolveEvent = z.infer<typeof SolveEventSchema>;

export const BenchmarkRecordSchema = z.object({
  algorithm: z.string(),
  domain: z.string(),
  gap: z.number(),
  time_s: z.number(),
  nodes_pruned_pct: z.number(),
});

export type BenchmarkRecord = z.infer<typeof BenchmarkRecordSchema>;

export type ChatCitation = {
  section: string;
  reference: string;
  snippet: string;
};

