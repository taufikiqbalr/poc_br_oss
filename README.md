# OSS v2 Business Rules PoC

Proof of Concept untuk **B1 – Business Rules** pada **Zone B – Orchestrator** OSS v2.

PoC ini mendemonstrasikan pemisahan tanggung jawab antara:

- **B1 Business Rules**: menyimpan rule, decision table, BRDF, DMN, versioning, dan menghasilkan decision result.
- **B2 Workflow Engine**: mengonsumsi hasil keputusan B1 untuk routing, SLA, task, timer, dan orchestration.

Arsitektur yang didemonstrasikan:

```text
Regulation / validated source
        ↓
      BRDF
        ↓
B1 Business Rules / DMN Decision Service
        ↓ decision result
B2 Workflow Engine / BPMN
        ↓
Zone C Regulator
```

Contoh rule utama memakai contoh BRDF-PB OSS v2 untuk KBLI `03111`, ruang lingkup `RL-A-001`, skala `Besar`, parameter `A00101`, dengan hasil Tingkat Risiko `TINGGI`, `NIB + IZIN`, kewenangan `GUBERNUR`, dan SLA `7 hari`.

## Stack

- Backend: NestJS + TypeScript
- Frontend: Next.js + React
- Rule model: JSON decision table + BRDF YAML + standard DMN XML artifact
- Storage PoC: file-backed managed rule store dan published DMN artifacts
- Container: Docker Compose

## Fitur

- Decision catalog
- Generic decision-table evaluator
- Explainable evaluation trace
- Permit Profile simulator
- Business Rule Management lifecycle
- Regulation → Rule drag-and-drop designer
- **Visual Rule Flow Modeler** dengan connector panah antar rule
- Standard DMN XML artifact publication
- Rule version metadata dan audit trail
- REST API yang dapat dipanggil Workflow Engine

## Quick start

```bash
docker compose up --build
```

Buka:

- Simulator: `http://localhost:3400`
- Business Rule Management: `http://localhost:3400/manage`
- Regulation → Rule Designer: `http://localhost:3400/designer`
- Visual Rule Flow Modeler: `http://localhost:3400/rule-flow`
- DMN Artifacts: `http://localhost:3400/artifacts`
- API: `http://localhost:3402`
- Health: `http://localhost:3402/health`

## Endpoint utama

```text
GET  /business-rules/decisions
GET  /business-rules/decisions/:id
POST /business-rules/evaluate
POST /business-rules/simulate-permit
```

Contoh evaluasi:

```bash
curl -X POST http://localhost:3402/business-rules/simulate-permit \
  -H 'Content-Type: application/json' \
  -d '{
    "kbli":"03111",
    "ruangLingkup":"RL-A-001",
    "skalaUsaha":"Besar",
    "parameterCode":"A00101"
  }'
```

> PoC ini bukan implementation production dan tidak menggantikan validasi regulasi resmi. Rule yang belum memiliki dasar eksplisit di material OSS ditandai sebagai ilustratif.
