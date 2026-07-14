/* Signal collection: turns a list of project files into named numeric
   signals. Pure logic — file reading happens in the caller. */

export interface FileEntry {
  path: string; // relative path, forward slashes
  size: number;
  text?: string; // only for readable text files
}

export type Signals = Record<string, number> & {
  totalLoc: number;
  fileCount: number;
};

export interface LanguageStat {
  name: string;
  loc: number;
}

export interface ScanResult {
  signals: Signals;
  languages: LanguageStat[];
  backendFrameworks: string[];
  frontendFrameworks: string[];
  mobileFrameworks: string[];
  orms: string[];
  buildTools: string[];
  packageManagers: string[];
}

const LANG_BY_EXT: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  mjs: 'JavaScript', cjs: 'JavaScript', py: 'Python', java: 'Java',
  cs: 'C#', go: 'Go', rb: 'Ruby', php: 'PHP', cpp: 'C++', cc: 'C++',
  c: 'C', h: 'C', kt: 'Kotlin', swift: 'Swift', rs: 'Rust', scala: 'Scala',
  sql: 'SQL', html: 'HTML', vue: 'Vue', svelte: 'Svelte', dart: 'Dart',
};

/* Regex counters applied to every readable code/config file. */
const COUNTERS: [string, RegExp][] = [
  ['rest', /@(Get|Post|Put|Delete|Patch|Request)Mapping|\[Http(Get|Post|Put|Delete|Patch)\]|\b(app|router|route)\.(get|post|put|delete|patch)\s*\(|@app\.route|@api_view|add_api_route/g],
  ['graphql', /graphql|apollo|type\s+Query\s*\{|buildSchema|gql`/gi],
  ['grpc', /\bgrpc\b|protobuf/gi],
  ['websocket', /websocket|socket\.io|signalr|\bws:\/\//gi],
  ['webhook', /webhook/gi],
  ['bgjobs', /celery|bullmq|\bbull\b|sidekiq|hangfire|BackgroundService|@Async\b|resque|delayed_job/gi],
  ['cron', /\bcron\b|@Scheduled|crontab|node-cron|schedule\.every/gi],
  ['batch', /batch\s*(process|job|insert|update)|spring-batch|chunked/gi],
  ['schedtask', /scheduled?[_\s-]?task|setInterval|timer\.schedule/gi],
  ['workflow', /workflow|saga\b|step[_\s-]?function/gi],
  ['statemachine', /state[_\s-]?machine|xstate|transitions?\s*=|statechart/gi],
  ['jwt', /\bjwt\b|jsonwebtoken|bearer\s+token/gi],
  ['oauth', /oauth/gi],
  ['saml', /\bsaml\b/gi],
  ['ldap', /\bldap\b|active\s?directory/gi],
  ['mfa', /\bmfa\b|\btotp\b|\b2fa\b|two[_\s-]?factor/gi],
  ['rbac', /\brbac\b|role[_\s-]?based|hasRole|\broles?\b.{0,20}permission/gi],
  ['abac', /\babac\b|attribute[_\s-]?based[_\s-]?access/gi],
  ['apikey', /api[_-]?key/gi],
  ['sso', /\bsso\b|single[_\s-]?sign[_\s-]?on/gi],
  ['permission', /permission|authorize|access[_\s-]?control/gi],
  ['payment', /stripe|razorpay|paypal|braintree|payment[_\s-]?gateway|checkout\.session/gi],
  ['erp', /\bsap\b|netsuite|dynamics\s?365|\berp\b/gi],
  ['crm', /salesforce|hubspot|zoho|\bcrm\b/gi],
  ['email', /sendgrid|mailgun|nodemailer|smtplib|\bsmtp\b|\bses\b|mailer/gi],
  ['sms', /twilio|\bsms\b|msg91|nexmo|vonage/gi],
  ['whatsapp', /whatsapp/gi],
  ['cloudsdk', /aws-sdk|boto3|azure[.-]|google-cloud|@aws-|@azure\//gi],
  ['thirdapi', /axios|fetch\(|HttpClient|requests\.(get|post)|RestTemplate|okhttp/gi],
  ['filestore', /\bs3\b|blob[_\s-]?storage|cloudinary|minio|\bgcs\b|multer/gi],
  ['idp', /auth0|okta|cognito|keycloak|firebase[_\s-]?auth|identity[_\s-]?provider/gi],
  ['llm', /openai|anthropic|claude|gpt-4|gpt-3|gemini|mistral|llama|langchain|llm/gi],
  ['prompttpl', /prompt[_\s-]?template|system[_\s-]?prompt/gi],
  ['aiagent', /\bagents?\b.{0,20}(ai|llm|tool)|autogen|crewai|agentic/gi],
  ['rag', /\brag\b|retrieval[_\s-]?augmented|retriever/gi],
  ['embedding', /embedding/gi],
  ['vectordb', /pinecone|weaviate|chroma|qdrant|pgvector|faiss|milvus|vector[_\s-]?(db|store)/gi],
  ['finetune', /fine[_\s-]?tun/gi],
  ['mcp', /model[_\s-]?context[_\s-]?protocol|mcp[_\s-]?server/gi],
  ['aitool', /tool[_\s-]?call|function[_\s-]?calling/gi],
  ['aiworkflow', /ai[_\s-]?workflow|chain\.invoke|pipeline.{0,15}llm/gi],
  ['aieval', /\beval(uation)?s?\b.{0,20}(llm|prompt|model)|ragas|promptfoo/gi],
  ['guardrail', /guardrail|moderation|content[_\s-]?filter/gi],
  ['upload', /upload|multipart\/form-data|dropzone/gi],
  ['download', /download|content-disposition|res\.attachment/gi],
  ['pdfgen', /jspdf|pdfkit|reportlab|itext|puppeteer.{0,30}pdf|wkhtmltopdf|pdfmake/gi],
  ['excelgen', /\bxlsx\b|exceljs|openpyxl|epplus|sheetjs|apache\s?poi/gi],
  ['csvproc', /\bcsv\b|papaparse|csv-parser/gi],
  ['ocr', /tesseract|\bocr\b|textract/gi],
  ['imgproc', /\bsharp\b|pillow|imagemagick|opencv|jimp|image[_\s-]?process/gi],
  ['compression', /\bzlib\b|gzip|\bzip\b|archiver|compression/gi],
  ['caching', /redis|memcach|\bcache\b|caffeine|@Cacheable/gi],
  ['lazyload', /lazy[_\s-]?load|React\.lazy|IntersectionObserver|loading="lazy"/gi],
  ['asyncproc', /async\s+def|async\s+function|CompletableFuture|Task\.Run|goroutine|\bgo\s+func/gi],
  ['queue', /rabbitmq|kafka|\bsqs\b|\bnats\b|activemq|message[_\s-]?queue|amqp/gi],
  ['queryopt', /createIndex|CREATE\s+INDEX|EXPLAIN\s|query[_\s-]?optimi|\.explain\(/gi],
  ['pagination', /paginat|pageSize|page_size|LIMIT\s+\d+\s+OFFSET|skip\(.{0,10}\)\.limit/gi],
  ['bulkproc', /bulk[_\s-]?(insert|update|create|write)|insertMany|bulkCreate|SqlBulkCopy/gi],
  ['mocksvc', /jest\.mock|mockito|\bmoq\b|sinon|unittest\.mock|wiremock|\bnock\b/gi],
  ['e2e', /cypress|playwright|selenium|puppeteer|webdriver|\be2e\b/gi],
  ['apitest', /supertest|rest-assured|postman|newman|pact\b/gi],
  ['perftest', /\bk6\b|jmeter|locust|gatling|load[_\s-]?test/gi],
  ['sectest', /\bzap\b|security[_\s-]?test|penetration|snyk|bandit/gi],
  ['applog', /winston|log4j|serilog|logback|logging\.|logger\.|console\.log/gi],
  ['auditlog', /audit[_\s-]?log/gi],
  ['activitylog', /activity[_\s-]?log|user[_\s-]?activity/gi],
  ['errortrack', /sentry|rollbar|bugsnag|error[_\s-]?track|app\.?insights/gi],
  ['tracing', /opentelemetry|jaeger|zipkin|distributed[_\s-]?tracing|trace[_-]?id/gi],
  ['healthcheck', /health[_\s-]?check|\/health\b|actuator|liveness|readiness/gi],
  ['gdpr', /\bgdpr\b|data[_\s-]?privacy|right[_\s-]?to[_\s-]?be[_\s-]?forgotten/gi],
  ['hipaa', /hipaa|\bphi\b/g],
  ['pci', /pci[_\s-]?dss|card[_\s-]?data/gi],
  ['soc2', /soc[_\s-]?2/gi],
  ['iso', /iso[_\s-]?27001|iso[_\s-]?9001/gi],
  ['retention', /data[_\s-]?retention|retention[_\s-]?polic/gi],
  ['audittrail', /audit[_\s-]?trail/gi],
  ['regreport', /regulatory|compliance[_\s-]?report/gi],
  ['roles', /user[_\s-]?roles?|\brole\b/gi],
  ['orgs', /organi[sz]ation|org_id|orgId/gi],
  ['tenant', /tenant|multi[_\s-]?tenan/gi],
  ['hierarchy', /hierarch/gi],
  ['delegation', /delegat/gi],
  ['groups', /user[_\s-]?group|group[_\s-]?member/gi],
  ['policy', /\bpolic(y|ies)\b|\bacl\b/gi],
  ['tenantiso', /tenant[_-]?id|tenantId/gi],
  ['swagger', /swagger|openapi|api[_\s-]?doc/gi],
  ['eventdriven', /event[_\s-]?(bus|driven|emitter)|\.emit\(|publish[_\s-]?event|domain[_\s-]?event/gi],
  ['gateway', /api[_\s-]?gateway|kong\b|ocelot|zuul|nginx\.conf/gi],
  ['messaging', /rabbitmq|kafka|\bnats\b|pubsub|pub\/sub|mqtt/gi],
  ['featureflag', /feature[_\s-]?flag|launchdarkly|unleash|feature[_\s-]?toggle/gi],
  ['secretsmgmt', /vault|secrets?[_\s-]?manager|dotenv|key[_\s-]?vault/gi],
  ['releaseauto', /semantic-release|goreleaser|release[_\s-]?automation|standard-version/gi],
  ['form', /<form|useForm|formik|FormGroup|ModelForm|form_for/gi],
  ['dashboard', /dashboard/gi],
  ['report', /\breports?\b/gi],
  ['chart', /\bcharts?\b|recharts|highcharts|\bd3\b|chartjs|echarts|plotly/gi],
  ['tablegrid', /DataGrid|ag-grid|<table|DataTable|MatTable/gi],
  ['media', /@media/g],
  ['richtext', /quill|slate|tiptap|ckeditor|tinymce|draft-js|rich[_\s-]?text/gi],
  ['dnd', /drag|droppable|sortablejs|dnd-kit|react-dnd/gi],
  ['maps', /leaflet|mapbox|google\.?maps|openlayers/gi],
  ['wizard', /wizard|stepper|multi[_\s-]?step/gi],
  ['route', /<Route\b|routes?\.push|path:\s*['"]|@GetMapping\(['"]\/|url\(r?['"]/g],
  ['controlflow', /\b(if|for|while|case|catch|elif|else if|switch)\b/g],
  ['sqltable', /CREATE\s+TABLE/gi],
  ['sqlproc', /CREATE\s+(OR\s+REPLACE\s+)?PROC(EDURE)?/gi],
  ['sqlfunc', /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi],
  ['sqlview', /CREATE\s+(OR\s+REPLACE\s+)?VIEW/gi],
  ['sqlmatview', /MATERIALIZED\s+VIEW/gi],
  ['sqltrigger', /CREATE\s+TRIGGER/gi],
  ['sqlindex', /CREATE\s+(UNIQUE\s+)?INDEX/gi],
  ['sqlfk', /FOREIGN\s+KEY|REFERENCES\s+\w+\s*\(/gi],
  ['sqlconstraint', /CONSTRAINT|CHECK\s*\(|NOT\s+NULL|UNIQUE\s*\(/gi],
  ['sqlschema', /CREATE\s+SCHEMA/gi],
  ['ormentity', /@Entity\b|models\.Model|ActiveRecord::Base|DbSet</g],
  ['sqlcolumn', /^\s*\w+\s+(VARCHAR|INT|BIGINT|TEXT|BOOLEAN|DECIMAL|NUMERIC|TIMESTAMP|DATE|UUID|CHAR|FLOAT|DOUBLE)/gim],
];

const DB_HINTS: [string, RegExp][] = [
  ['PostgreSQL', /postgres|pg\b|psycopg/gi],
  ['MySQL', /mysql|mariadb/gi],
  ['SQL Server', /sqlserver|mssql/gi],
  ['Oracle', /oracledb|cx_oracle/gi],
  ['MongoDB', /mongodb|mongoose/gi],
  ['Redis', /redis/gi],
  ['SQLite', /sqlite/gi],
  ['DynamoDB', /dynamodb/gi],
  ['Elasticsearch', /elasticsearch/gi],
];

const BACKEND_FW: [string, RegExp][] = [
  ['Express', /express/i], ['NestJS', /@nestjs/i], ['Fastify', /fastify/i],
  ['Koa', /\bkoa\b/i], ['Spring', /spring-boot|springframework/i],
  ['Django', /django/i], ['Flask', /flask/i], ['FastAPI', /fastapi/i],
  ['Rails', /rails/i], ['Laravel', /laravel/i], ['ASP.NET', /aspnetcore|Microsoft\.AspNetCore/i],
  ['Gin', /gin-gonic/i],
];
const FRONTEND_FW: [string, RegExp][] = [
  ['React', /"react"/i], ['Angular', /@angular\/core/i], ['Vue', /"vue"/i],
  ['Svelte', /svelte/i], ['Next.js', /"next"/i], ['Nuxt', /nuxt/i],
];
const MOBILE_FW: [string, RegExp][] = [
  ['React Native', /react-native/i], ['Flutter', /flutter/i],
  ['Ionic', /@ionic/i], ['SwiftUI', /SwiftUI/],
];
const ORM_FW: [string, RegExp][] = [
  ['Prisma', /prisma/i], ['TypeORM', /typeorm/i], ['Sequelize', /sequelize/i],
  ['Hibernate', /hibernate/i], ['Entity Framework', /EntityFramework|Microsoft\.EntityFrameworkCore/i],
  ['SQLAlchemy', /sqlalchemy/i], ['Django ORM', /django\.db/i], ['Mongoose', /mongoose/i],
];
const BUILD_TOOLS: [string, RegExp][] = [
  ['Vite', /vite/i], ['Webpack', /webpack/i], ['Rollup', /rollup/i],
  ['Gradle', /gradle/i], ['Maven', /<project|pom\.xml/i], ['MSBuild', /\.csproj/i],
  ['Make', /^makefile$/i], ['esbuild', /esbuild/i],
];

const SKIP_DIRS = /(^|\/)(node_modules|\.git|dist|build|out|coverage|\.next|\.nuxt|venv|\.venv|__pycache__|vendor|bin|obj|\.idea|\.vscode|target|packages\/\.)(\/|$)/;
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|java|cs|go|rb|php|cpp|cc|c|h|kt|swift|rs|scala|sql|html|css|scss|less|vue|svelte|dart|json|ya?ml|xml|md|txt|toml|ini|cfg|conf|env|sh|ps1|bat|proto|graphql|tf|csproj|sln|gradle|properties|lock|dockerfile|prisma)$/i;
const SPECIAL_FILES = /(^|\/)(dockerfile|jenkinsfile|makefile|procfile|\.env[^/]*|\.gitlab-ci\.yml|chart\.yaml)$/i;

export function isRelevantPath(path: string): boolean {
  return !SKIP_DIRS.test(path);
}

export function isReadable(path: string, size: number): boolean {
  if (size > 400_000) return false;
  return TEXT_EXT.test(path) || SPECIAL_FILES.test(path);
}

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function collectSignals(files: FileEntry[]): ScanResult {
  const signals: Record<string, number> = {};
  const locByLang: Record<string, number> = {};
  let totalLoc = 0;
  let commentLines = 0;

  const detected = {
    backend: new Set<string>(),
    frontend: new Set<string>(),
    mobile: new Set<string>(),
    orm: new Set<string>(),
    build: new Set<string>(),
    db: new Set<string>(),
    pkgmgr: new Set<string>(),
  };

  const inc = (k: string, n = 1) => {
    signals[k] = (signals[k] ?? 0) + n;
  };

  const topDirs = new Set<string>();

  for (const f of files) {
    const p = f.path;
    const lower = p.toLowerCase();
    const base = lower.split('/').pop() ?? '';
    const parts = p.split('/');
    if (parts.length > 1) topDirs.add(parts[0] === 'src' && parts.length > 2 ? `src/${parts[1]}` : parts[0]);

    // --- path-based signals ---
    if (/(^|\/)dockerfile/.test(lower)) inc('dockerfiles');
    if (/(^|\/)(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.yml|jenkinsfile|azure-pipelines\.ya?ml|\.circleci\/config\.yml)$/.test(lower)) inc('ci');
    if (/chart\.ya?ml$/.test(lower)) inc('helm');
    if (/(^|\/)\.env/.test(base) || /appsettings.*\.json$/.test(lower) || /config\/.*\.(ya?ml|json)$/.test(lower)) inc('envfiles');
    if (/readme/.test(base)) inc('readme', Math.min(f.size, 20000));
    if (/(^|\/)(adr|decisions|architecture-decisions)(\/|$)/.test(lower)) inc('adr');
    if (/\.(drawio|puml|plantuml|mermaid|mmd)$/.test(lower) || /architecture\.(md|png|svg)$/.test(lower)) inc('diagram');
    if (/sequence/.test(lower) && /\.(puml|mmd|md|png|svg)$/.test(lower)) inc('seqdiagram');
    if (/\.proto$/.test(lower)) inc('grpc', 3);
    if (/(^|\/)(migrations?|migrate|db\/migrate|alembic|flyway|liquibase)(\/|$)/.test(lower)) inc('migrations');
    if (/\.(test|spec)\.[jt]sx?$|_test\.(py|go)$|tests?\.(cs|java)$|(^|\/)(tests?|__tests__)(\/|$)/.test(lower)) inc('testfiles');
    if (/(^|\/)(fixtures|testdata|test-data|factories)(\/|$)/.test(lower)) inc('testdata');
    if (/\.(tsx|jsx|vue|svelte)$/.test(lower)) inc('componentfiles');
    if (/(^|\/)(pages|views|screens)(\/|$)/.test(lower) && /\.(tsx|jsx|vue|svelte|html|cshtml|erb)$/.test(lower)) inc('pagefiles');
    if (/package\.json$|\.csproj$|pom\.xml$|go\.mod$|cargo\.toml$|setup\.py$|pyproject\.toml$/.test(lower)) inc('projects');
    if (/(^|\/)\.git(\/|$)/.test(lower)) signals['gitseen'] = 1;
    if (/package-lock\.json$/.test(lower)) detected.pkgmgr.add('npm');
    if (/yarn\.lock$/.test(lower)) detected.pkgmgr.add('yarn');
    if (/pnpm-lock\.ya?ml$/.test(lower)) detected.pkgmgr.add('pnpm');
    if (/requirements.*\.txt$|pipfile/.test(lower)) detected.pkgmgr.add('pip');
    if (/poetry\.lock$/.test(lower)) detected.pkgmgr.add('poetry');
    if (/pom\.xml$/.test(lower)) detected.pkgmgr.add('maven');
    if (/build\.gradle/.test(lower)) detected.pkgmgr.add('gradle');
    if (/packages\.config$|\.csproj$/.test(lower)) detected.pkgmgr.add('nuget');
    if (/go\.mod$/.test(lower)) detected.pkgmgr.add('go modules');
    if (/cargo\.toml$/.test(lower)) detected.pkgmgr.add('cargo');
    if (/(^|\/)(docker-compose[^/]*\.ya?ml)$/.test(lower)) inc('compose');
    if (/(^|\/)(packages|libs|shared|common)(\/|$)/.test(lower)) inc('sharedlibpaths', 0.02);

    const ext = (base.includes('.') ? base.split('.').pop()! : '').toLowerCase();
    const lang = LANG_BY_EXT[ext];

    if (f.text !== undefined) {
      const text = f.text;
      const lines = text.length === 0 ? 0 : text.split('\n').length;
      if (lang) {
        locByLang[lang] = (locByLang[lang] ?? 0) + lines;
        totalLoc += lines;
        commentLines += countMatches(text, /^\s*(\/\/|#|\/\*|\*|<!--)/gm);
      }

      // k8s manifests
      if (/\.(ya?ml)$/.test(lower) && /kind:\s*(Deployment|Service|Ingress|StatefulSet|ConfigMap|CronJob)/.test(text)) {
        inc('k8s');
      }
      // docker-compose services
      if (/docker-compose/.test(lower)) {
        inc('services', countMatches(text, /^\s{2}\w[\w-]*:\s*$/gm));
      }
      if (/kind:\s*Deployment/.test(text)) inc('services');

      // dependency manifests
      if (/package\.json$/.test(lower)) {
        try {
          const pkg = JSON.parse(text) as Record<string, unknown>;
          const deps = {
            ...(pkg.dependencies as Record<string, string> | undefined),
            ...(pkg.devDependencies as Record<string, string> | undefined),
          };
          inc('deps', Object.keys(deps).length);
          if ((pkg as { workspaces?: unknown }).workspaces) inc('sharedlib', 2);
          const depStr = JSON.stringify(deps);
          for (const [n, re] of BACKEND_FW) if (re.test(depStr)) detected.backend.add(n);
          for (const [n, re] of FRONTEND_FW) if (re.test(depStr)) detected.frontend.add(n);
          for (const [n, re] of MOBILE_FW) if (re.test(depStr)) detected.mobile.add(n);
          for (const [n, re] of ORM_FW) if (re.test(depStr)) detected.orm.add(n);
          for (const [n, re] of BUILD_TOOLS) if (re.test(depStr)) detected.build.add(n);
          for (const [n, re] of DB_HINTS) if (re.test(depStr)) detected.db.add(n);
        } catch {
          /* malformed package.json — skip */
        }
      }
      if (/requirements.*\.txt$/.test(lower)) {
        inc('deps', text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length);
        for (const [n, re] of BACKEND_FW) if (re.test(text)) detected.backend.add(n);
        for (const [n, re] of ORM_FW) if (re.test(text)) detected.orm.add(n);
        for (const [n, re] of DB_HINTS) if (re.test(text)) detected.db.add(n);
      }
      if (/pom\.xml$|build\.gradle/.test(lower)) {
        inc('deps', countMatches(text, /<dependency>|implementation\s|compile\s/g));
        for (const [n, re] of BACKEND_FW) if (re.test(text)) detected.backend.add(n);
        for (const [n, re] of ORM_FW) if (re.test(text)) detected.orm.add(n);
        for (const [n, re] of DB_HINTS) if (re.test(text)) detected.db.add(n);
      }
      if (/\.csproj$/.test(lower)) {
        inc('deps', countMatches(text, /<PackageReference/g));
        for (const [n, re] of BACKEND_FW) if (re.test(text)) detected.backend.add(n);
        for (const [n, re] of ORM_FW) if (re.test(text)) detected.orm.add(n);
        for (const [n, re] of DB_HINTS) if (re.test(text)) detected.db.add(n);
      }

      // generic counters (skip lockfiles/minified)
      if (!/lock/.test(base) && f.size < 300_000) {
        for (const [key, re] of COUNTERS) {
          const n = countMatches(text, re);
          if (n > 0) inc(key, n);
        }
        for (const [n, re] of DB_HINTS) if (re.test(text)) detected.db.add(n);
      }
    }
  }

  signals['modules'] = topDirs.size;
  signals['sharedlib'] = (signals['sharedlib'] ?? 0) + Math.round(signals['sharedlibpaths'] ?? 0);
  delete signals['sharedlibpaths'];
  signals['dbtypes'] = detected.db.size;
  signals['commentpct'] = totalLoc > 0 ? Math.round((commentLines / totalLoc) * 100) : 0;
  signals['cfperkloc'] = totalLoc > 0 ? Math.round(((signals['controlflow'] ?? 0) / totalLoc) * 1000) : 0;

  const languages = Object.entries(locByLang)
    .map(([name, loc]) => ({ name, loc }))
    .sort((a, b) => b.loc - a.loc);

  const result: ScanResult = {
    signals: Object.assign(signals, { totalLoc, fileCount: files.length }) as Signals,
    languages,
    backendFrameworks: [...detected.backend],
    frontendFrameworks: [...detected.frontend],
    mobileFrameworks: [...detected.mobile],
    orms: [...detected.orm],
    buildTools: [...detected.build],
    packageManagers: [...detected.pkgmgr],
  };
  return result;
}
