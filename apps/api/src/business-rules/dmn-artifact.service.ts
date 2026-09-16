import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DecisionDefinition, RuleCondition } from './business-rules.types';

export interface DmnArtifactMetadata {
  decisionId: string;
  decisionName: string;
  version: string;
  sourceLifecycleVersion: string;
  filename: string;
  standard: 'OMG DMN 1.3';
  modelNamespace: string;
  mimeType: 'application/xml';
  sha256: string;
  publishedAt: string;
  publishedBy: string;
}

@Injectable()
export class DmnArtifactService {
  private readonly artifactRoot = resolve(
    process.env.DMN_ARTIFACT_DIR || 'data/published-dmn',
  );

  generate(definition: DecisionDefinition): string {
    const decisionId = this.xmlId(definition.id, 'Decision');
    const tableId = this.xmlId(`${definition.id}-table`, 'DecisionTable');
    const definitionsId = this.xmlId(`Definitions-${definition.id}`, 'Definitions');
    const diagramId = this.xmlId(`DMNDiagram-${definition.id}`, 'DMNDiagram');
    const shapeId = this.xmlId(`DMNShape-${definition.id}`, 'DMNShape');
    const activeRules = definition.rules
      .filter((rule) => rule.status === 'ACTIVE')
      .sort((a, b) => a.priority - b.priority);

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"`,
      '  xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"',
      '  xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"',
      '  xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"',
      `  id="${this.escapeAttr(definitionsId)}"`,
      `  name="${this.escapeAttr(`OSS v2 - ${definition.name}`)}"`,
      `  namespace="${this.escapeAttr(this.modelNamespace(definition.id))}"`,
      '  exporter="OSS v2 Business Rules PoC"',
      '  exporterVersion="1.0.0">',
      `  <decision id="${this.escapeAttr(decisionId)}" name="${this.escapeAttr(definition.name)}">`,
      `    <description>${this.escapeText(`Decision ${definition.id}, source version ${definition.version}`)}</description>`,
      `    <decisionTable id="${this.escapeAttr(tableId)}" hitPolicy="${definition.hitPolicy}">`,
    ];

    definition.inputFields.forEach((field, index) => {
      lines.push(
        `      <input id="Input_${index + 1}" label="${this.escapeAttr(field)}">`,
        `        <inputExpression id="InputExpression_${index + 1}">`,
        `          <text>${this.escapeText(field)}</text>`,
        '        </inputExpression>',
        '      </input>',
      );
    });

    definition.outputFields.forEach((field, index) => {
      lines.push(
        `      <output id="Output_${index + 1}" name="${this.escapeAttr(field)}"/>`,
      );
    });

    lines.push('      <annotation name="Source / Notes"/>');

    activeRules.forEach((rule, ruleIndex) => {
      lines.push(`      <rule id="${this.escapeAttr(this.xmlId(rule.id, `Rule_${ruleIndex + 1}`))}">`);

      definition.inputFields.forEach((field, inputIndex) => {
        const condition = rule.when.find((item) => item.field === field);
        const unaryTest = condition ? this.unaryTest(condition) : '-';
        lines.push(
          `        <inputEntry id="Rule_${ruleIndex + 1}_Input_${inputIndex + 1}">`,
          `          <text>${this.escapeText(unaryTest)}</text>`,
          '        </inputEntry>',
        );
      });

      definition.outputFields.forEach((field, outputIndex) => {
        const output = Object.prototype.hasOwnProperty.call(rule.then, field)
          ? this.feelLiteral(rule.then[field])
          : 'null';
        lines.push(
          `        <outputEntry id="Rule_${ruleIndex + 1}_Output_${outputIndex + 1}">`,
          `          <text>${this.escapeText(output)}</text>`,
          '        </outputEntry>',
        );
      });

      const annotation = [rule.source, rule.notes, rule.description]
        .filter(Boolean)
        .join(' | ');
      lines.push(
        `        <annotationEntry id="Rule_${ruleIndex + 1}_Annotation_1">`,
        `          <text>${this.escapeText(annotation)}</text>`,
        '        </annotationEntry>',
        '      </rule>',
      );
    });

    lines.push(
      '    </decisionTable>',
      '  </decision>',
      '  <dmndi:DMNDI>',
      `    <dmndi:DMNDiagram id="${this.escapeAttr(diagramId)}">`,
      `      <dmndi:DMNShape id="${this.escapeAttr(shapeId)}" dmnElementRef="${this.escapeAttr(decisionId)}">`,
      '        <dc:Bounds height="80" width="180" x="160" y="80"/>',
      '      </dmndi:DMNShape>',
      '    </dmndi:DMNDiagram>',
      '  </dmndi:DMNDI>',
      '</definitions>',
      '',
    );

    return lines.join('\n');
  }

  preview(definition: DecisionDefinition) {
    const dmnXml = this.generate(definition);
    const version = this.releaseVersion(definition.version);
    const filename = this.filename(definition.id, version);
    return {
      decisionId: definition.id,
      decisionName: definition.name,
      version,
      sourceLifecycleVersion: definition.version,
      filename,
      standard: 'OMG DMN 1.3',
      modelNamespace: this.modelNamespace(definition.id),
      mimeType: 'application/xml',
      sha256: this.sha256(dmnXml),
      dmnXml,
    };
  }

  publish(definition: DecisionDefinition, actor = 'regulator-demo'): DmnArtifactMetadata {
    const dmnXml = this.generate(definition);
    const version = this.releaseVersion(definition.version);
    const filename = this.filename(definition.id, version);
    const decisionDir = join(this.artifactRoot, this.safeFilePart(definition.id));
    mkdirSync(decisionDir, { recursive: true });

    const metadata: DmnArtifactMetadata = {
      decisionId: definition.id,
      decisionName: definition.name,
      version,
      sourceLifecycleVersion: definition.version,
      filename,
      standard: 'OMG DMN 1.3',
      modelNamespace: this.modelNamespace(definition.id),
      mimeType: 'application/xml',
      sha256: this.sha256(dmnXml),
      publishedAt: new Date().toISOString(),
      publishedBy: actor,
    };

    writeFileSync(join(decisionDir, filename), dmnXml, 'utf8');
    writeFileSync(
      join(decisionDir, `${filename}.meta.json`),
      JSON.stringify(metadata, null, 2),
      'utf8',
    );
    return metadata;
  }

  listPublished(): DmnArtifactMetadata[] {
    if (!existsSync(this.artifactRoot)) return [];
    const artifacts: DmnArtifactMetadata[] = [];

    for (const decisionEntry of readdirSync(this.artifactRoot, { withFileTypes: true })) {
      if (!decisionEntry.isDirectory()) continue;
      const decisionDir = join(this.artifactRoot, decisionEntry.name);
      for (const file of readdirSync(decisionDir)) {
        if (!file.endsWith('.dmn.meta.json')) continue;
        try {
          const metadata = JSON.parse(
            readFileSync(join(decisionDir, file), 'utf8'),
          ) as DmnArtifactMetadata;
          artifacts.push(metadata);
        } catch {
          // Ignore malformed PoC metadata files and keep the artifact registry usable.
        }
      }
    }

    return artifacts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  getPublished(decisionId: string, version: string) {
    const filename = this.filename(decisionId, this.releaseVersion(version));
    const decisionDir = join(this.artifactRoot, this.safeFilePart(decisionId));
    const xmlPath = join(decisionDir, filename);
    const metadataPath = join(decisionDir, `${filename}.meta.json`);
    if (!existsSync(xmlPath) || !existsSync(metadataPath)) {
      throw new NotFoundException(
        `Published DMN artifact '${decisionId}' version '${version}' not found`,
      );
    }
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as DmnArtifactMetadata;
    return {
      ...metadata,
      dmnXml: readFileSync(xmlPath, 'utf8'),
    };
  }

  private unaryTest(condition: RuleCondition): string {
    const reference =
      typeof condition.value === 'string' && condition.value.startsWith('$')
        ? condition.value.slice(1)
        : undefined;
    const literal = reference || this.feelLiteral(condition.value);

    switch (condition.operator) {
      case 'eq':
        return literal;
      case 'neq':
        return `not(${literal})`;
      case 'in':
        return Array.isArray(condition.value)
          ? condition.value.map((value) => this.feelLiteral(value)).join(', ')
          : literal;
      case 'gte':
        return `>= ${literal}`;
      case 'lte':
        return `<= ${literal}`;
      case 'exists':
        return condition.value ? 'not(null)' : 'null';
      case 'includes':
        return `list contains(?, ${literal})`;
      default:
        return literal;
    }
  }

  private feelLiteral(value: unknown): string {
    if (value === undefined || value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.feelLiteral(item)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${JSON.stringify(key)}: ${this.feelLiteral(item)}`)
        .join(', ');
      return `{${entries}}`;
    }
    return JSON.stringify(String(value));
  }

  private releaseVersion(version: string) {
    return version.replace(
      /-(draft|review|approved|published|active|retired).*$/i,
      '',
    );
  }

  private filename(decisionId: string, version: string) {
    return `${this.safeFilePart(decisionId)}-${this.safeFilePart(version)}.dmn`;
  }

  private modelNamespace(decisionId: string) {
    return `https://oss.go.id/dmn/${this.safeFilePart(decisionId)}`;
  }

  private safeFilePart(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  private xmlId(value: string, fallbackPrefix: string) {
    let result = value.replace(/[^a-zA-Z0-9_.-]/g, '-');
    if (!/^[A-Za-z_]/.test(result)) result = `${fallbackPrefix}_${result}`;
    return result || fallbackPrefix;
  }

  private escapeText(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private escapeAttr(value: string) {
    return this.escapeText(value)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private sha256(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
