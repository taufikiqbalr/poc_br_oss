# Visual Rule Flow Modeler

PoC ini menambahkan tampilan rule-flow yang menyerupai pengalaman kerja BPM/BPMN modeler, tetapi semantics yang divisualisasikan tetap **B1 Business Rules / DMN decision logic**, bukan proses BPMN milik B2 Workflow Engine.

## URL

```text
http://localhost:3400/rule-flow
```

## Tujuan

Setiap decision dan setiap rule dapat dilihat sebagai graph:

```text
Start
  ↓
Condition 1
  ↓
Condition 2
  ↓
◇ Rule match?
  ├── YES → Output 1 → Output 2 → Matched
  └── NO  → Rule berikutnya
```

Untuk hit policy `FIRST`, connector `NO` dari gateway sebuah rule diteruskan ke rule berikutnya. Rule pertama yang menghasilkan `YES` mengeluarkan output dan menghentikan evaluasi. Jika seluruh rule tidak match, graph berakhir pada `NO MATCH / RULE_REVIEW_REQUIRED`.

## Interaksi

- pilih decision dari Decision Registry;
- drag node pada canvas untuk mengubah tata letak visual;
- connector panah mengikuti posisi node otomatis;
- drag **Condition**, **Output**, atau **Rule** dari Flow Palette ke canvas untuk menambah elemen pada decision yang berstatus DRAFT;
- pilih node condition untuk mengubah field, operator, dan value;
- pilih output untuk mengubah nilai hasil decision;
- pilih gateway untuk mengubah Rule ID, priority, description, source, dan row status;
- `Save DRAFT` menyimpan perubahan ke Business Rule Management yang sama;
- `Auto layout` mengembalikan diagram ke layout terstruktur;
- posisi visual disimpan di `localStorage` per decision/version, sementara semantics rule tetap disimpan melalui API Business Rule Management.

## Node semantics

- **Start event** — awal evaluasi decision;
- **Condition** — satu unary test/condition dalam rule;
- **Gateway** — representasi visual evaluasi seluruh condition pada rule;
- **Output** — satu output field pada `then`;
- **Matched end** — rule berhasil match;
- **NO MATCH** — seluruh rule gagal match;
- **End** — akhir evaluasi.

## Separation of concerns

Rule Flow Modeler tidak mengubah boundary arsitektur:

```text
B1 Business Rules
  - Regulation traceability
  - BRDF
  - DMN / decision table
  - Rule flow visualization
  - Decision evaluation

B2 Workflow Engine
  - BPMN
  - process state
  - routing execution
  - user/service task
  - SLA timer
  - retry / compensation
```

Dengan demikian UX boleh menyerupai Camunda/BPMN editor, tetapi artefak yang dikelola tetap business rule/DMN milik B1.
