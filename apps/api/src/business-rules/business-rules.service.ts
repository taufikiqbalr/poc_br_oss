import { Injectable, NotFoundException } from '@nestjs/common';
import { DECISION_CATALOG } from './business-rules.catalog';
import {
  ConditionTrace,
  DecisionDefinition,
  DecisionResult,
  RuleCondition,
  RuleTrace,
} from './business-rules.types';

@Injectable()
export class BusinessRulesService {
  listDecisions() {
    return DECISION_CATALOG.map((decision) => ({
      id: decision.id,
      name: decision.name,
      description: decision.description,
      version: decision.version,
      status: decision.status,
      hitPolicy: decision.hitPolicy,
      inputFields: decision.inputFields,
      outputFields: decision.outputFields,
      ruleCount: decision.rules.length,
    }));
  }

  getDecision(id: string): DecisionDefinition {
    const decision = DECISION_CATALOG.find((item) => item.id === id);
    if (!decision) throw new NotFoundException(`Decision '${id}' not found`);
    return decision;
  }

  evaluate(decisionId: string, input: Record<string, unknown>): DecisionResult {
    const decision = this.getDecision(decisionId);
    const activeRules = decision.rules
      .filter((rule) => rule.status === 'ACTIVE')
      .sort((a, b) => a.priority - b.priority);

    const trace: RuleTrace[] = [];

    for (const rule of activeRules) {
      const conditions = rule.when.map((condition) => this.evaluateCondition(condition, input));
      const matched = conditions.every((item) => item.matched);
      trace.push({
        ruleId: rule.id,
        description: rule.description,
        matched,
        conditions,
      });

      if (matched) {
        return {
          decisionId: decision.id,
          version: decision.version,
          matched: true,
          matchedRuleId: rule.id,
          output: rule.then,
          trace,
          evaluatedAt: new Date().toISOString(),
        };
      }
    }

    return {
      decisionId: decision.id,
      version: decision.version,
      matched: false,
      output: {
        status: 'NO_MATCH',
        action: 'RULE_REVIEW_REQUIRED',
        reason: 'No validated business rule matched the supplied input',
      },
      trace,
      evaluatedAt: new Date().toISOString(),
    };
  }

  simulatePermit(input: Record<string, unknown>) {
    const permit = this.evaluate('permit-profile', input);
    const permitSla = permit.output.slaDays;

    const fiktifInput = {
      elapsedDays: input.elapsedDays ?? 0,
      slaDays: typeof permitSla === 'number' ? permitSla : input.slaDays,
      verifierResponded: input.verifierResponded ?? false,
      eligibleForFiktifPositif: input.eligibleForFiktifPositif ?? false,
    };

    const fiktifPositif = this.evaluate('fiktif-positif-guard', fiktifInput);

    return {
      request: input,
      b1: {
        permitProfile: permit,
        fiktifPositif,
      },
      b2Contract: permit.matched
        ? {
            routeTarget: permit.output.routeTarget,
            authority: permit.output.authority,
            slaDays: permit.output.slaDays,
            permitType: permit.output.permitType,
            nextAction: fiktifPositif.output.action,
          }
        : {
            nextAction: 'RULE_REVIEW_REQUIRED',
          },
      architecture: 'BRDF -> B1 Decision Service/DMN -> B2 Workflow/BPMN -> Zone C',
    };
  }

  workflowContract() {
    return {
      principle: 'B1 owns decision logic; B2 owns process orchestration',
      b1Responsibilities: [
        'Regulatory rule repository',
        'BRDF and DMN decision models',
        'Decision evaluation',
        'Rule versioning and audit metadata',
        'Explainable decision trace',
      ],
      b2Consumes: [
        'routeTarget',
        'authority',
        'slaDays',
        'permitType',
        'nextAction',
      ],
      b2DoesNotOwn: ['KBLI regulatory decision logic', 'authority decision tables', 'permit eligibility logic'],
    };
  }

  private evaluateCondition(
    condition: RuleCondition,
    input: Record<string, unknown>,
  ): ConditionTrace {
    const actual = this.getValue(input, condition.field);
    const expected = this.resolveExpected(condition.value, input);
    let matched = false;

    switch (condition.operator) {
      case 'eq':
        matched = actual === expected;
        break;
      case 'neq':
        matched = actual !== expected;
        break;
      case 'in':
        matched = Array.isArray(expected) && expected.includes(actual);
        break;
      case 'gte':
        matched = this.asNumber(actual) >= this.asNumber(expected);
        break;
      case 'lte':
        matched = this.asNumber(actual) <= this.asNumber(expected);
        break;
      case 'exists':
        matched = Boolean(expected) ? actual !== undefined && actual !== null : actual == null;
        break;
      case 'includes':
        matched = Array.isArray(actual) && actual.includes(expected);
        break;
      default:
        matched = false;
    }

    return { ...condition, value: expected, actual, matched };
  }

  private resolveExpected(value: unknown, input: Record<string, unknown>) {
    if (typeof value === 'string' && value.startsWith('$')) {
      return this.getValue(input, value.slice(1));
    }
    return value;
  }

  private getValue(input: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, input);
  }

  private asNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.NaN;
  }
}
