# Standard DMN XML Artifact Publication

PoC B1 Business Rules now separates the **editable/internal rule model** from the **portable decision artifact**.

```text
Regulation
   ↓
BRDF / visual rule designer
   ↓
Internal DecisionDefinition JSON
   ↓
DMN XML generator
   ↓
*.dmn publication artifact
   ↓
DMN engine / Camunda-compatible tooling
   ↓
JSON decision result consumed by B2 Workflow Engine
```

## Standard profile

The generated artifact targets **OMG DMN 1.3** and uses the DMN 1.3 model namespace:

```text
https://www.omg.org/spec/DMN/20191111/MODEL/
```

The generated XML also declares DMNDI, DI, and DC namespaces so the artifact contains a minimal Decision Requirements Diagram shape in addition to the Decision Table.

The relevant OMG normative machine-readable DMN 1.3 schema is `DMN13.xsd` under the `20191111` namespace family.

## Why DMN 1.3 for the PoC

Camunda's current DMN documentation uses the `https://www.omg.org/spec/DMN/20191111/MODEL/` namespace for decision requirements graphs and decision tables. Using this profile provides a practical interoperability target for opening the exported `.dmn` file in Camunda Modeler while keeping the model itself based on the OMG standard rather than a JSON-only proprietary format.

## What is exported

For each `DecisionDefinition` the generator creates:

- `<definitions>` with a unique OSS decision namespace;
- one `<decision>`;
- one `<decisionTable hitPolicy="FIRST">`;
- input clauses generated from `inputFields`;
- output clauses generated from `outputFields`;
- rule rows generated from ACTIVE rule rows;
- FEEL-compatible input unary tests and output literals;
- source/notes as a DMN annotation column;
- minimal `dmndi:DMNDI` diagram information;
- SHA-256 artifact checksum in the registry metadata.

The `.dmn` file remains pure DMN XML. Publication metadata such as `publishedBy`, `publishedAt`, lifecycle source version, and SHA-256 are stored in a separate `.meta.json` file.

## Lifecycle integration

The existing lifecycle is:

```text
DRAFT → REVIEW → APPROVED → PUBLISHED → ACTIVE → RETIRED
```

When a decision enters **PUBLISHED**, `ManagedRulesService` calls `DmnArtifactService.publish()` and writes an immutable publication artifact under:

```text
data/published-dmn/<decision-id>/<decision-id>-<version>.dmn
```

Because `data/` is mounted into the API container by Docker Compose, publication artifacts survive API container recreation in the PoC environment.

The following transition from `PUBLISHED` to `ACTIVE` does not change the decision content. `ACTIVE` is the runtime version consumed by B2; `PUBLISHED` is the portable artifact checkpoint.

## UI

Open:

```text
http://localhost:3000/artifacts
```

The page supports:

- preview working DMN XML;
- download working `.dmn`;
- download ACTIVE `.dmn`;
- browse published artifact registry;
- download an immutable published artifact;
- view DMN version, model namespace, filename, source lifecycle version, and SHA-256.

## API

Preview/generate a working model:

```http
GET /business-rules/managed/:id/dmn/working
```

Generate the active runtime model:

```http
GET /business-rules/managed/:id/dmn/active
```

List published artifacts:

```http
GET /business-rules/artifacts
```

Retrieve a published artifact and its XML:

```http
GET /business-rules/artifacts/:id/:version
```

The response is JSON so the browser UI can inspect metadata and then download `dmnXml` as an `application/xml` `.dmn` file.

## Operator mapping to FEEL unary tests

The PoC maps internal operators as follows:

| Internal operator | DMN/FEEL representation |
| --- | --- |
| `eq` | literal, e.g. `"03111"` |
| `neq` | `not("03111")` |
| `in` | comma-separated unary tests |
| `gte` | `>= 7` |
| `lte` | `<= 7` |
| `exists` | `not(null)` or `null` |
| `includes` | `list contains(?, value)` |

A missing condition for an input column is exported as `-` (wildcard unary test).

## Example artifact

A static example is included at:

```text
examples/dmn/permit-profile.dmn
```

It includes the OSS v2 `permit-profile` decision with KBLI `03111`, `RL-A-001`, `Besar`, and parameter `A00101` as the sample decision row used by this PoC.

## Demo boundary

The generator is intended to demonstrate **standardized artifact publication and tool portability**. It is not yet a full DMN conformance suite. Before production, add automated validation against the OMG DMN XSD, FEEL semantic tests, namespace/version policy, model signing, RBAC, and deployment integration with the selected DMN engine.
