import { DecisionDefinition } from './business-rules.types';

export const DECISION_CATALOG: DecisionDefinition[] = [
  {
    id: 'permit-profile',
    name: 'Determine Permit Profile',
    description:
      'Menentukan profil perizinan dari KBLI, ruang lingkup, skala usaha, dan parameter. Contoh utama mengikuti BRDF-PB 03111 yang digunakan dalam material OSS v2.',
    version: '1.0.0-poc',
    status: 'ACTIVE',
    hitPolicy: 'FIRST',
    inputFields: ['kbli', 'ruangLingkup', 'skalaUsaha', 'parameterCode'],
    outputFields: [
      'riskLevel',
      'permitType',
      'authority',
      'slaDays',
      'routeTarget',
      'obligations',
      'pbumku',
    ],
    rules: [
      {
        id: 'PB-03111-RL-A-001-BESAR-A00101',
        description: 'Penangkapan ikan bersirip di laut - contoh BRDF-PB OSS v2',
        priority: 10,
        status: 'ACTIVE',
        source: 'OSS v2 BRDF-PB example: 03111-RL-A-001-Besar-001',
        notes:
          'routeTarget C4-PEMDA adalah mapping arsitektural PoC dari kewenangan Gubernur ke domain Pemda.',
        when: [
          { field: 'kbli', operator: 'eq', value: '03111' },
          { field: 'ruangLingkup', operator: 'eq', value: 'RL-A-001' },
          { field: 'skalaUsaha', operator: 'eq', value: 'Besar' },
          { field: 'parameterCode', operator: 'eq', value: 'A00101' },
        ],
        then: {
          riskLevel: 'TINGGI',
          permitType: ['NIB', 'IZIN'],
          authority: 'GUBERNUR',
          slaDays: 7,
          routeTarget: 'C4-PEMDA',
          obligations: ['KW-A-013', 'KW-A-025', 'KW-A-015', 'KW-A-016'],
          pbumku: ['PB-A-019', 'PB-A-001'],
        },
      },
    ],
  },
  {
    id: 'fiktif-positif-guard',
    name: 'Fiktif Positif Guard',
    description:
      'PoC decision guard untuk menunjukkan bagaimana B1 dapat memberikan keputusan kepada B2 saat SLA terlampaui. Eligibility harus eksplisit dari rule tervalidasi; PoC tidak menganggap semua proses otomatis eligible.',
    version: '0.1.0-poc',
    status: 'ACTIVE',
    hitPolicy: 'FIRST',
    inputFields: ['elapsedDays', 'slaDays', 'verifierResponded', 'eligibleForFiktifPositif'],
    outputFields: ['autoApprovalEligible', 'action', 'reason'],
    rules: [
      {
        id: 'FIKPOS-ELIGIBLE-SLA-EXPIRED',
        description: 'SLA expired, belum ada response, dan eligibility sudah tervalidasi',
        priority: 10,
        status: 'ACTIVE',
        source: 'PoC guard based on OSS v2 SLA/fiktif-positif architecture concept',
        notes: 'Eligibility detail harus berasal dari regulasi yang telah divalidasi sebelum production.',
        when: [
          { field: 'eligibleForFiktifPositif', operator: 'eq', value: true },
          { field: 'verifierResponded', operator: 'eq', value: false },
          { field: 'elapsedDays', operator: 'gte', value: '$slaDays' },
        ],
        then: {
          autoApprovalEligible: true,
          action: 'B2_TRIGGER_FIKTIF_POSITIF_FLOW',
          reason: 'SLA_EXPIRED_AND_RULE_ELIGIBLE',
        },
      },
      {
        id: 'FIKPOS-NOT-ELIGIBLE',
        description: 'Fallback aman untuk PoC',
        priority: 999,
        status: 'ACTIVE',
        source: 'PoC safety fallback',
        when: [],
        then: {
          autoApprovalEligible: false,
          action: 'CONTINUE_STANDARD_WORKFLOW',
          reason: 'NOT_ELIGIBLE_OR_SLA_NOT_EXPIRED',
        },
      },
    ],
  },
];
