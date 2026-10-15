import * as z from 'zod';

const stageProgressSchema = z.object({
  stage: z.enum([
    'preliminaries',
    'design',
    'engineering',
    'procurement',
    'mobilization',
    'construction',
    'testing',
    'handover'
  ] as const),
  completion: z.number().min(0).max(100),
  plannedCompletion: z.number().min(0).max(100),
  variance: z.number(),
  comments: z.string(),
});

const delaySchema = z.object({
  stage: z.enum([
    'preliminaries',
    'design',
    'engineering',
    'procurement',
    'mobilization',
    'construction',
    'testing',
    'handover'
  ] as const),
  reason: z.string().min(1, 'Reason is required'),
  impact: z.string().min(1, 'Impact description is required'),
  documents: z.array(z.string()),
});

const correctiveActionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  responsible: z.string().min(1, 'Responsible person is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

export const formSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  reportingPeriod: z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  }),
  stageProgress: z.array(stageProgressSchema),
  delays: z.array(delaySchema),
  correctiveActions: z.array(correctiveActionSchema),
  overallProgress: z.number().min(0).max(100),
});