import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DECISION_CATALOG } from './business-rules.catalog';
import {
  DecisionDefinition,
  DecisionVersionSnapshot,
  LifecycleEvent,
  LifecycleStatus,
  ManagedDecisionRecord,
} from './business-rules.types';

const NEXT_STATUS: Record<LifecycleStatus, LifecycleStatus | null> = {
  DRAFT: 'REVIEW',
  REVIEW: 'APPROVED',
  APPROVED: 'PUBLISHED',
  PUBLISHED: 'ACTIVE',
  ACTIVE: 'RETIRED',
  RETIRED: null,
};

@Injectable()
export class ManagedRulesService {
  private readonly records = new Map<string, ManagedDecisionRecord>();

  constructor() {
    for (const definition of DECISION_CATALOG) {
      const seed = this.clone(definition);
      const now = new Date().toISOString();
      this.records.set(definition.id, {
        id: definition.id,
        working: seed,
        active: definition.status === 'ACTIVE' ? this.clone(definition) : undefined,
        revision: 1,
        history: [
          {
            version: definition.version,
            status: definition.status,
            revision: 1,
            changedAt: now,
            changedBy: 'system-seed',
            comment: 'Seeded from PoC decision catalog',
            definition: this.clone(definition),
          },
        ],
        lifecycle: [
          {
            id: this.eventId(),
            action: 'SEED',
            to: definition.status,
            actor: 'system-seed',
            comment: 'Initial PoC decision',
            createdAt: now,
            version: definition.version,
          },
        ],
      });
    }
  }

  list() {
    return [...this.records.values()].map((record) => this.summary(record));
  }

  get(id: string) {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException(`Managed decision '${id}' not found`);
    return this.clone(record);
  }

  getRuntimeDefinition(id: string): DecisionDefinition {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException(`Decision '${id}' not found`);
    if (!record.active) {
      throw new BadRequestException(`Decision '${id}' has no ACTIVE version`);
    }
    return this.clone(record.active);
  }

  create(
    input: Partial<DecisionDefinition> & { id: string; name: string },
    actor = 'regulator-demo',
  ) {
    if (!input.id || !input.name) throw new BadRequestException('id and name are required');
    if (this.records.has(input.id)) throw new BadRequestException(`Decision '${input.id}' already exists`);

    const now = new Date().toISOString();
    const definition: DecisionDefinition = {
      id: input.id,
      name: input.name,
      description: input.description || '',
      version: input.version || '1.0.0-draft.1',
      status: 'DRAFT',
      hitPolicy: 'FIRST',
      inputFields: input.inputFields || ['input'],
      outputFields: input.outputFields || ['result'],
      rules: input.rules || [],
    };
    const record: ManagedDecisionRecord = {
      id: definition.id,
      working: definition,
      revision: 1,
      history: [],
      lifecycle: [],
    };
    this.addSnapshot(record, actor, 'Created decision draft');
    this.addEvent(record, 'CREATE', undefined, 'DRAFT', actor, 'Created decision draft');
    this.records.set(record.id, record);
    return this.clone(record);
  }

  saveDraft(
    id: string,
    patch: Partial<DecisionDefinition>,
    actor = 'regulator-demo',
    comment = 'Saved draft changes',
  ) {
    const record = this.mustGet(id);
    if (record.working.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT decisions can be edited. Create a new draft version first.');
    }

    const next: DecisionDefinition = {
      ...record.working,
      ...this.clone(patch),
      id: record.working.id,
      status: 'DRAFT',
      hitPolicy: 'FIRST',
    };
    record.revision += 1;
    next.version = this.draftVersion(next.version, record.revision);
    record.working = next;
    this.addSnapshot(record, actor, comment);
    this.addEvent(record, 'SAVE_DRAFT', 'DRAFT', 'DRAFT', actor, comment);
    return this.clone(record);
  }

  createNewVersion(id: string, actor = 'regulator-demo', comment = 'Started new draft version') {
    const record = this.mustGet(id);
    if (record.working.status !== 'ACTIVE' && record.working.status !== 'RETIRED') {
      throw new BadRequestException('A new draft version can only be created from ACTIVE or RETIRED state');
    }
    const source = record.active || record.working;
    const next = this.clone(source);
    next.status = 'DRAFT';
    next.version = this.bumpMinor(source.version);
    record.working = next;
    record.revision += 1;
    this.addSnapshot(record, actor, comment);
    this.addEvent(record, 'NEW_VERSION', source.status, 'DRAFT', actor, comment);
    return this.clone(record);
  }

  transition(
    id: string,
    target: LifecycleStatus,
    actor = 'regulator-demo',
    comment = '',
  ) {
    const record = this.mustGet(id);
    const current = record.working.status;
    const expected = NEXT_STATUS[current];
    if (expected !== target) {
      throw new BadRequestException(`Invalid transition ${current} -> ${target}. Expected: ${expected || 'none'}`);
    }

    record.working.status = target;
    record.revision += 1;
    record.working.version = this.lifecycleVersion(record.working.version, target);

    if (target === 'ACTIVE') {
      record.active = this.clone(record.working);
    }
    if (target === 'RETIRED' && record.active?.version === record.working.version) {
      record.active = undefined;
    }

    this.addSnapshot(record, actor, comment || `${current} -> ${target}`);
    this.addEvent(record, target, current, target, actor, comment);
    return this.clone(record);
  }

  private mustGet(id: string) {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException(`Managed decision '${id}' not found`);
    return record;
  }

  private summary(record: ManagedDecisionRecord) {
    return {
      id: record.id,
      name: record.working.name,
      description: record.working.description,
      workingVersion: record.working.version,
      workingStatus: record.working.status,
      activeVersion: record.active?.version || null,
      ruleCount: record.working.rules.length,
      revision: record.revision,
      historyCount: record.history.length,
      lastChangedAt: record.history.at(-1)?.changedAt,
    };
  }

  private addSnapshot(record: ManagedDecisionRecord, actor: string, comment?: string) {
    const snapshot: DecisionVersionSnapshot = {
      version: record.working.version,
      status: record.working.status,
      revision: record.revision,
      changedAt: new Date().toISOString(),
      changedBy: actor,
      comment,
      definition: this.clone(record.working),
    };
    record.history.push(snapshot);
  }

  private addEvent(
    record: ManagedDecisionRecord,
    action: string,
    from: LifecycleStatus | undefined,
    to: LifecycleStatus,
    actor: string,
    comment?: string,
  ) {
    const event: LifecycleEvent = {
      id: this.eventId(),
      action,
      from,
      to,
      actor,
      comment,
      createdAt: new Date().toISOString(),
      version: record.working.version,
    };
    record.lifecycle.push(event);
  }

  private draftVersion(version: string, revision: number) {
    const base = version.replace(/-(draft|review|approved|published|active|retired).*$/i, '');
    return `${base}-draft.${revision}`;
  }

  private bumpMinor(version: string) {
    const base = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!base) return `1.0.0-draft.${Date.now()}`;
    return `${base[1]}.${Number(base[2]) + 1}.0-draft.1`;
  }

  private lifecycleVersion(version: string, status: LifecycleStatus) {
    const base = version.replace(/-(draft|review|approved|published|active|retired).*$/i, '');
    return status === 'ACTIVE' ? base : `${base}-${status.toLowerCase()}`;
  }

  private eventId() {
    return `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
