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
- Rule model: JSON decision table + BRDF YAML + DMN XML example
- Storage PoC: in-memory catalog, mudah diganti PostgreSQL/Git-backed rule repository
- Container: Docker Compose

## Fitur

- Decision catalog
- Generic decision-table evaluator
- Explainable evaluation trace
- Permit Profile simulator
- Rule version metadata
- BRDF example
- DMN example
- REST API yang dapat dipanggil Workflow Engine

## Quick start

```bash
docker compose up --build
```

Buka:

- Web: `http://localhost:3400`
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
