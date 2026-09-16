export type LifecycleStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ACTIVE' | 'RETIRED';

export interface LifecycleEvent {
  id: string;
  action: string;
  from?: LifecycleStatus;
  to: LifecycleStatus;
  actor: string;
  comment?: string;
  createdAt: string;
  version: string;
}

export interface DecisionVersionSnapshot {
  version: string;
  status: LifecycleStatus;
  revision: number;
  changedAt: string;
  changedBy: string;
  comment?: string;
  definition: unknown;
}
