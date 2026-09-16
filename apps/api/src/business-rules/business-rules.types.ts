export type RuleOperator = 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'exists' | 'includes';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value?: unknown;
}

export interface DecisionRule {
  id: string;
  description: string;
  priority: number;
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
  when: RuleCondition[];
  then: Record<string, unknown>;
  source?: string;
  notes?: string;
}

export interface DecisionDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
  hitPolicy: 'FIRST';
  inputFields: string[];
  outputFields: string[];
  rules: DecisionRule[];
}

export interface ConditionTrace extends RuleCondition {
  actual: unknown;
  matched: boolean;
}

export interface RuleTrace {
  ruleId: string;
  description: string;
  matched: boolean;
  conditions: ConditionTrace[];
}

export interface DecisionResult {
  decisionId: string;
  version: string;
  matched: boolean;
  matchedRuleId?: string;
  output: Record<string, unknown>;
  trace: RuleTrace[];
  evaluatedAt: string;
}
