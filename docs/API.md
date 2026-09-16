# API

## List decisions

`GET /business-rules/decisions`

## Decision detail

`GET /business-rules/decisions/:id`

## Generic evaluate

`POST /business-rules/evaluate`

```json
{
  "decisionId": "permit-profile",
  "input": {
    "kbli": "03111",
    "ruangLingkup": "RL-A-001",
    "skalaUsaha": "Besar",
    "parameterCode": "A00101"
  }
}
```

## Permit simulation

`POST /business-rules/simulate-permit`

```json
{
  "kbli": "03111",
  "ruangLingkup": "RL-A-001",
  "skalaUsaha": "Besar",
  "parameterCode": "A00101",
  "elapsedDays": 8,
  "verifierResponded": false,
  "eligibleForFiktifPositif": false
}
```

## B1/B2 responsibility contract

`GET /business-rules/workflow-contract`
