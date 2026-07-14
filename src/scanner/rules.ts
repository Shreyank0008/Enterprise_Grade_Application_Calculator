/* Rules engine: maps collected signals to proposed weightages (0–5).
   Every threshold lives here so bands are easy to tune. */
import { ALL_PARAMETERS } from '../data/parameters';
import type { ScanResult } from './signals';

export interface Proposal {
  parameterId: string;
  parameterName: string;
  categoryId: string;
  weightage: number;
  evidence: string;
}

type Bands = [number, number, number, number];

/** value<=0 → 0; then 1..5 by thresholds */
function band(v: number, t: Bands): number {
  if (v <= 0) return 0;
  if (v < t[0]) return 1;
  if (v < t[1]) return 2;
  if (v < t[2]) return 3;
  if (v < t[3]) return 4;
  return 5;
}

const KEYWORD: Bands = [3, 12, 60, 250]; // generic occurrence bands

/** [paramId, signalKey, bands, evidence label] */
const COUNT_RULES: [string, string, Bands, string][] = [
  // E. Backend
  ['E01', 'rest', [8, 30, 100, 300], 'REST endpoint patterns'],
  ['E02', 'graphql', KEYWORD, 'GraphQL references'],
  ['E03', 'grpc', KEYWORD, 'gRPC/proto references'],
  ['E04', 'websocket', KEYWORD, 'WebSocket references'],
  ['E05', 'webhook', KEYWORD, 'webhook references'],
  ['E06', 'bgjobs', KEYWORD, 'background-job references'],
  ['E07', 'cron', KEYWORD, 'cron/schedule references'],
  ['E08', 'batch', KEYWORD, 'batch-processing references'],
  ['E09', 'schedtask', KEYWORD, 'scheduled-task references'],
  ['E11', 'workflow', KEYWORD, 'workflow references'],
  ['E12', 'statemachine', KEYWORD, 'state-machine references'],
  // F. Frontend
  ['F01', 'pagefiles', [5, 15, 40, 100], 'page/view files'],
  ['F02', 'componentfiles', [15, 50, 150, 400], 'component files'],
  ['F03', 'form', [5, 20, 60, 200], 'form patterns'],
  ['F04', 'dashboard', KEYWORD, 'dashboard references'],
  ['F05', 'report', KEYWORD, 'report references'],
  ['F06', 'chart', KEYWORD, 'charting references'],
  ['F07', 'tablegrid', KEYWORD, 'data-table references'],
  ['F08', 'media', [5, 20, 60, 150], 'responsive @media rules'],
  ['F09', 'richtext', KEYWORD, 'rich-text-editor references'],
  ['F10', 'dnd', KEYWORD, 'drag-and-drop references'],
  ['F11', 'maps', KEYWORD, 'map-library references'],
  ['F12', 'wizard', KEYWORD, 'wizard/stepper references'],
  // G. Database (SQL DDL scans)
  ['G03', 'sqlschema', [2, 4, 8, 15], 'CREATE SCHEMA statements'],
  ['G06', 'sqlproc', [3, 10, 40, 120], 'stored procedures'],
  ['G07', 'sqlfunc', [3, 10, 40, 120], 'database functions'],
  ['G08', 'sqlview', [3, 10, 30, 80], 'database views'],
  ['G09', 'sqlmatview', [2, 5, 12, 30], 'materialized views'],
  ['G10', 'sqltrigger', [2, 5, 15, 40], 'database triggers'],
  ['G11', 'sqlindex', [5, 20, 60, 150], 'index definitions'],
  ['G12', 'sqlfk', [5, 20, 60, 150], 'foreign-key definitions'],
  ['G13', 'sqlconstraint', [10, 40, 120, 300], 'constraint definitions'],
  ['G15', 'migrations', [3, 10, 40, 120], 'migration files/dirs'],
  // H. Security
  ['H01', 'jwt', KEYWORD, 'JWT references'],
  ['H02', 'oauth', KEYWORD, 'OAuth references'],
  ['H03', 'saml', KEYWORD, 'SAML references'],
  ['H04', 'ldap', KEYWORD, 'LDAP/AD references'],
  ['H05', 'mfa', KEYWORD, 'MFA/2FA references'],
  ['H06', 'rbac', KEYWORD, 'RBAC references'],
  ['H07', 'abac', KEYWORD, 'ABAC references'],
  ['H08', 'apikey', KEYWORD, 'API-key references'],
  ['H09', 'sso', KEYWORD, 'SSO references'],
  ['H10', 'permission', [10, 40, 150, 500], 'permission/authorization references'],
  // I. Integrations
  ['I01', 'payment', KEYWORD, 'payment-gateway references'],
  ['I02', 'erp', KEYWORD, 'ERP references'],
  ['I03', 'crm', KEYWORD, 'CRM references'],
  ['I04', 'email', KEYWORD, 'email-service references'],
  ['I05', 'sms', KEYWORD, 'SMS-service references'],
  ['I06', 'whatsapp', KEYWORD, 'WhatsApp references'],
  ['I07', 'cloudsdk', KEYWORD, 'cloud-SDK references'],
  ['I08', 'thirdapi', [10, 40, 150, 500], 'HTTP-client call sites'],
  ['I09', 'filestore', KEYWORD, 'file-storage references'],
  ['I10', 'idp', KEYWORD, 'identity-provider references'],
  // J. AI/ML
  ['J01', 'llm', KEYWORD, 'LLM references'],
  ['J02', 'prompttpl', KEYWORD, 'prompt-template references'],
  ['J03', 'aiagent', KEYWORD, 'AI-agent references'],
  ['J04', 'rag', KEYWORD, 'RAG references'],
  ['J05', 'embedding', KEYWORD, 'embedding references'],
  ['J06', 'vectordb', KEYWORD, 'vector-database references'],
  ['J07', 'finetune', KEYWORD, 'fine-tuning references'],
  ['J08', 'mcp', KEYWORD, 'MCP references'],
  ['J09', 'aitool', KEYWORD, 'tool/function-calling references'],
  ['J10', 'aiworkflow', KEYWORD, 'AI-workflow references'],
  ['J11', 'aieval', KEYWORD, 'AI-evaluation references'],
  ['J12', 'guardrail', KEYWORD, 'guardrail/moderation references'],
  // K. Packages
  ['K01', 'deps', [15, 40, 100, 250], 'declared dependencies'],
  // L. File processing
  ['L01', 'upload', KEYWORD, 'upload references'],
  ['L02', 'download', KEYWORD, 'download references'],
  ['L03', 'pdfgen', KEYWORD, 'PDF-generation references'],
  ['L04', 'excelgen', KEYWORD, 'Excel-generation references'],
  ['L05', 'csvproc', KEYWORD, 'CSV references'],
  ['L06', 'ocr', KEYWORD, 'OCR references'],
  ['L07', 'imgproc', KEYWORD, 'image-processing references'],
  ['L08', 'compression', KEYWORD, 'compression references'],
  // M. Performance
  ['M01', 'caching', KEYWORD, 'caching references'],
  ['M02', 'lazyload', KEYWORD, 'lazy-loading references'],
  ['M03', 'asyncproc', [10, 40, 150, 500], 'async-processing patterns'],
  ['M04', 'queue', KEYWORD, 'message-queue references'],
  ['M05', 'queryopt', KEYWORD, 'query-optimization patterns'],
  ['M06', 'pagination', KEYWORD, 'pagination patterns'],
  ['M07', 'bulkproc', KEYWORD, 'bulk-processing patterns'],
  // N. Testing
  ['N01', 'testfiles', [5, 20, 80, 250], 'test files'],
  ['N03', 'e2e', KEYWORD, 'E2E/UI-test references'],
  ['N04', 'apitest', KEYWORD, 'API-test references'],
  ['N05', 'perftest', KEYWORD, 'performance-test references'],
  ['N06', 'sectest', KEYWORD, 'security-test references'],
  ['N08', 'testdata', [1, 3, 8, 20], 'fixture/test-data locations'],
  ['N09', 'mocksvc', KEYWORD, 'mocking references'],
  // O. DevOps
  ['O01', 'ci', [1, 2, 4, 8], 'CI pipeline files'],
  ['O02', 'dockerfiles', [1, 2, 4, 8], 'Dockerfiles'],
  ['O03', 'k8s', [1, 3, 8, 20], 'Kubernetes manifests'],
  ['O04', 'helm', [1, 2, 4, 8], 'Helm charts'],
  ['O05', 'envfiles', [2, 5, 12, 30], 'environment/config files'],
  ['O06', 'secretsmgmt', KEYWORD, 'secrets-management references'],
  ['O07', 'featureflag', KEYWORD, 'feature-flag references'],
  ['O08', 'releaseauto', KEYWORD, 'release-automation references'],
  // P. Logging
  ['P01', 'applog', [20, 100, 400, 1500], 'logging statements'],
  ['P02', 'auditlog', KEYWORD, 'audit-log references'],
  ['P03', 'activitylog', KEYWORD, 'activity-log references'],
  ['P04', 'errortrack', KEYWORD, 'error-tracking references'],
  ['P05', 'tracing', KEYWORD, 'distributed-tracing references'],
  ['P06', 'healthcheck', KEYWORD, 'health-check references'],
  // Q. Compliance
  ['Q01', 'gdpr', KEYWORD, 'GDPR references'],
  ['Q02', 'hipaa', KEYWORD, 'HIPAA references'],
  ['Q03', 'pci', KEYWORD, 'PCI-DSS references'],
  ['Q04', 'soc2', KEYWORD, 'SOC 2 references'],
  ['Q05', 'iso', KEYWORD, 'ISO-standard references'],
  ['Q06', 'retention', KEYWORD, 'data-retention references'],
  ['Q07', 'audittrail', KEYWORD, 'audit-trail references'],
  ['Q08', 'regreport', KEYWORD, 'regulatory-reporting references'],
  // R. Users & access
  ['R01', 'roles', [10, 40, 150, 500], 'role references'],
  ['R02', 'orgs', KEYWORD, 'organization references'],
  ['R03', 'tenant', KEYWORD, 'multi-tenancy references'],
  ['R04', 'hierarchy', KEYWORD, 'hierarchy references'],
  ['R05', 'delegation', KEYWORD, 'delegation references'],
  ['R06', 'groups', KEYWORD, 'user-group references'],
  ['R07', 'policy', [10, 40, 150, 500], 'policy/ACL references'],
  ['R08', 'tenantiso', KEYWORD, 'tenant-isolation references'],
  // S. Documentation
  ['S02', 'swagger', KEYWORD, 'API-documentation references'],
  ['S03', 'diagram', [1, 3, 8, 20], 'architecture diagram files'],
  ['S04', 'seqdiagram', [1, 3, 8, 20], 'sequence diagram files'],
  ['S05', 'adr', [1, 3, 8, 20], 'ADR locations'],
  // C. Architecture
  ['C03', 'services', [2, 4, 8, 16], 'service definitions (compose/k8s)'],
  ['C04', 'sharedlib', [1, 3, 8, 20], 'shared-library indicators'],
  ['C05', 'rest', [8, 30, 100, 300], 'internal API endpoints'],
  ['C08', 'eventdriven', KEYWORD, 'event-driven patterns'],
  ['C09', 'gateway', KEYWORD, 'API-gateway references'],
  ['C10', 'messaging', KEYWORD, 'messaging-infrastructure references'],
  // E10 Business rules — approximate via control-flow density handled below
];

const nameOf = new Map(ALL_PARAMETERS.map((p) => [p.id, p]));

export function buildProposals(scan: ScanResult): Proposal[] {
  const s = scan.signals;
  const out: Proposal[] = [];

  const push = (id: string, weightage: number, evidence: string) => {
    const p = nameOf.get(id);
    if (!p) return;
    out.push({
      parameterId: id,
      parameterName: p.name,
      categoryId: p.categoryId,
      weightage: Math.max(0, Math.min(5, weightage)),
      evidence,
    });
  };

  for (const [id, key, bands, label] of COUNT_RULES) {
    const v = Math.round(s[key] ?? 0);
    push(id, band(v, bands), v > 0 ? `${v.toLocaleString()} ${label}` : `no ${label} detected`);
  }

  // A04 Deployment model
  const docker = s['dockerfiles'] ?? 0;
  const k8s = s['k8s'] ?? 0;
  push(
    'A04',
    k8s > 0 ? 4 : docker > 0 ? 3 : 2,
    k8s > 0 ? 'Kubernetes manifests found (containerized/orchestrated)' : docker > 0 ? 'Dockerfile found (containerized)' : 'no container config found (assumed simple deployment)',
  );

  // A06 Documentation availability
  const docScore = band((s['readme'] ?? 0) / 2000 + (s['diagram'] ?? 0) * 2 + (s['adr'] ?? 0) * 2 + (s['swagger'] ?? 0) / 5, [1, 3, 8, 18]);
  push('A06', docScore, `README ${s['readme'] ? 'present' : 'missing'}, ${s['diagram'] ?? 0} diagrams, ${s['adr'] ?? 0} ADR locations`);

  // B. Technology stack
  const langs = scan.languages.filter((l) => !['HTML', 'SQL'].includes(l.name));
  push('B01', langs.length > 0 ? 2 : 0, langs[0] ? `primary language: ${langs[0].name} (${langs[0].loc.toLocaleString()} LOC)` : 'no code detected');
  push('B02', band(Math.max(0, langs.length - 1), [1, 2, 3, 5]), langs.length > 1 ? `secondary: ${langs.slice(1, 4).map((l) => l.name).join(', ')}` : 'single-language codebase');
  push('B03', band(scan.backendFrameworks.length, [1, 2, 3, 4]), scan.backendFrameworks.length ? scan.backendFrameworks.join(', ') : 'no backend framework detected');
  push('B04', band(scan.frontendFrameworks.length, [1, 2, 3, 4]), scan.frontendFrameworks.length ? scan.frontendFrameworks.join(', ') : 'no frontend framework detected');
  push('B05', band(scan.mobileFrameworks.length, [1, 2, 3, 4]), scan.mobileFrameworks.length ? scan.mobileFrameworks.join(', ') : 'no mobile framework detected');
  push('B06', band(scan.orms.length, [1, 2, 3, 4]), scan.orms.length ? scan.orms.join(', ') : 'no ORM detected');
  push('B07', band(scan.buildTools.length, [1, 2, 3, 4]), scan.buildTools.length ? scan.buildTools.join(', ') : 'no build tool detected');
  push('B08', band(scan.packageManagers.length, [1, 2, 3, 4]), scan.packageManagers.length ? scan.packageManagers.join(', ') : 'no package manager detected');

  // C01/C02 architecture style
  const svc = s['services'] ?? 0;
  push('C01', svc >= 4 ? 4 : svc >= 2 ? 3 : 2, svc >= 2 ? `${svc} services detected → service-oriented` : 'single deployable detected → monolithic');
  push('C02', svc >= 4 ? 4 : svc >= 2 ? 3 : 1, `${Math.max(svc, 1)} deployable service(s)`);
  push('C06', band(Math.round((s['deps'] ?? 0) / 3 + (s['projects'] ?? 0) * 2), [10, 25, 60, 150], ), `${s['deps'] ?? 0} dependencies across ${s['projects'] ?? 0} project files`);
  push('C07', 0, 'not statically determinable — review manually');

  // D. Source code
  push('D01', band(s.totalLoc, [5_000, 50_000, 200_000, 500_000]), `${s.totalLoc.toLocaleString()} lines of code in ${s.fileCount.toLocaleString()} files`);
  push('D02', 1, 'scanned one folder (single repository)');
  push('D03', band(s['projects'] ?? 0, [2, 4, 8, 16]), `${s['projects'] ?? 0} project manifest(s)`);
  push('D04', band(s['modules'] ?? 0, [4, 8, 16, 30]), `${s['modules'] ?? 0} top-level modules/folders`);
  const cf = s['cfperkloc'] ?? 0;
  push('D05', band(cf, [40, 80, 140, 220]), `${cf} branch points per 1k LOC`);
  push('D06', band(cf, [40, 80, 140, 220]), `estimated from control-flow density (${cf}/kLOC)`);

  // E10 business rules approximated by validation/branch density
  push('E10', band(Math.round(((s['controlflow'] ?? 0) / 1000)), [2, 8, 25, 60]), `~${(s['controlflow'] ?? 0).toLocaleString()} conditional branches overall`);

  // G database
  push('G01', band(s['dbtypes'] ?? 0, [1, 2, 3, 4]), (s['dbtypes'] ?? 0) > 0 ? `database tech detected: ${s['dbtypes']} type(s)` : 'no database technology detected');
  push('G02', band(s['dbtypes'] ?? 0, [1, 2, 3, 4]), `${s['dbtypes'] ?? 0} distinct database technolog(ies)`);
  const tables = Math.round((s['sqltable'] ?? 0) + (s['ormentity'] ?? 0));
  push('G04', band(tables, [10, 30, 80, 200]), `${tables} table/entity definitions`);
  push('G05', band(s['sqlcolumn'] ?? 0, [50, 200, 600, 1500]), `${s['sqlcolumn'] ?? 0} column definitions in SQL`);

  // N07 automation coverage: test files vs code files
  const covPct = s.fileCount > 0 ? Math.round(((s['testfiles'] ?? 0) / s.fileCount) * 100) : 0;
  push('N07', band(covPct, [2, 5, 12, 25]), `test files are ${covPct}% of all files`);
  push('N02', band(Math.round((s['testfiles'] ?? 0) / 3), [2, 8, 25, 80]), `estimated from ${s['testfiles'] ?? 0} test files`);
  push('N10', band(s['e2e'] ?? 0, KEYWORD), (s['e2e'] ?? 0) > 0 ? 'E2E suite present (regression-capable)' : 'no E2E suite detected');

  // S01 README, S06 comments
  push('S01', band((s['readme'] ?? 0) / 1500, [1, 3, 6, 12]), s['readme'] ? `README present (~${Math.round((s['readme'] ?? 0) / 1000)} KB)` : 'no README found');
  push('S06', band(s['commentpct'] ?? 0, [2, 5, 10, 20]), `${s['commentpct'] ?? 0}% comment density`);

  out.sort((a, b) => a.parameterId.localeCompare(b.parameterId));
  return out;
}

/** Parameters the scanner deliberately leaves for human judgment. */
export const MANUAL_PARAMETER_IDS = new Set(
  ALL_PARAMETERS.filter((p) => !new Set(buildableIds()).has(p.id)).map((p) => p.id),
);

function buildableIds(): string[] {
  const ids = COUNT_RULES.map((r) => r[0]);
  return [
    ...ids,
    'A04', 'A06', 'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08',
    'C01', 'C02', 'C06', 'C07', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06',
    'E10', 'G01', 'G02', 'G04', 'G05', 'N02', 'N07', 'N10', 'S01', 'S06',
  ];
}
