# Regulation → Business Rule Visual Designer

PoC ini menambahkan visual authoring pada domain **B1 – Business Rules** OSS v2. Tampilan sengaja dibuat menyerupai BPM/BPMN modeling canvas agar pejabat/regulator dapat membangun traceability dari regulasi sampai executable decision tanpa menulis kode.

## Prinsip pemisahan

Visual designer ini **bukan BPMN workflow designer**. Ia menggunakan UX yang mirip BPM untuk menyusun artefak business rule:

`Regulation → Clause/Pasal → Input/Fact → Condition → Decision → Output / Authority / SLA`

Hasil canvas dikompilasi menjadi **Decision Definition/DMN-style rule** milik B1. B2 Workflow Engine tetap memiliki BPMN, process state, routing execution, timer, retry, dan orchestration.

## URL

- Simulator: `http://localhost:3000/`
- Business Rule Management: `http://localhost:3000/manage`
- Regulation → Rule Designer: `http://localhost:3000/designer`

## Interaksi

1. Drag elemen dari **Element Palette** ke canvas.
2. Drag node yang sudah berada di canvas untuk memindahkannya.
3. Hubungkan node dengan memilih connector di sisi kanan node sumber lalu connector di sisi kiri node tujuan.
4. Pilih node untuk mengubah label, source reference, field, operator, dan value pada **Properties Inspector**.
5. Preview generated decision selalu terlihat pada panel kanan.
6. Klik **Generate DRAFT Rule** untuk membuat decision baru pada Business Rule Management.
7. Rule yang dihasilkan tidak langsung aktif. Ia harus melalui lifecycle governance: `DRAFT → REVIEW → APPROVED → PUBLISHED → ACTIVE → RETIRED`.

## Elemen visual

- **Regulation**: PP, Permen, Perda, atau sumber regulasi tervalidasi.
- **Clause / Pasal**: pasal, lampiran, tabel atau klausul yang menjadi dasar rule.
- **Input / Fact**: data yang dipakai decision, misalnya KBLI, ruang lingkup, skala usaha.
- **Condition**: ekspresi kondisional seperti `eq`, `gte`, `in`.
- **Decision**: unit keputusan DMN.
- **Output**: hasil decision seperti risk level atau permit type.
- **Authority**: K/L/D atau pejabat yang berwenang.
- **SLA / Timer**: jangka waktu layanan yang menjadi output business rule.

## Sample

Canvas bawaan menunjukkan contoh berbasis material BRDF OSS v2:

- PP No. 28 Tahun 2025
- Lampiran I – Perizinan Berusaha
- KBLI `03111`
- Ruang Lingkup `RL-A-001`
- Skala Usaha `Besar`
- Risk Level `TINGGI`
- Authority `GUBERNUR`
- SLA `7 hari`

Contoh ini digunakan untuk demonstrasi traceability dan tidak menggantikan proses validasi regulasi resmi.

## Scope PoC

Canvas model saat ini disimpan di browser `localStorage`. Decision yang di-generate disimpan melalui API Business Rule Management. Tahap production sebaiknya menambahkan authenticated user identity, RBAC, repository regulasi resmi, clause-level citations, server-side model persistence, collaborative locking, approval signature, import/export DMN XML, dan model validation yang lebih ketat.
