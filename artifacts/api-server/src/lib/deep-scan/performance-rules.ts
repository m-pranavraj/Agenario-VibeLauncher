export type PerformanceCategory =
  | "n-plus-one-query"
  | "fat-handler"
  | "bundle-bloat"
  | "sync-blocking"
  | "promise-waterfall"
  | "unbounded-growth"
  | "re-render-cascade"
  | "memory-leak"
  | "missing-pagination"
  | "large-import"
  | "inefficient-regex"
  | "deep-clone"
  | "missing-memo"
  | "console-production"
  | "nested-promise"
  | "connection-pool"
  | "missing-cache"
  | "gratuitous-copy"
  | "event-loop-starvation"
  | "unoptimized-image"
  | "css-bloat"
  | "unused-code"
  | "zombie-promise"
  | "hidden-dependency";

export interface PerformanceRule {
  id: string;
  name: string;
  category: PerformanceCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  detection: "regex" | "csg" | "composite";
  patterns: string[];
  excludePatterns?: string[];
  contextPatterns?: string[];
  fixAdvice: string;
  estimatedCostMs?: number;
  estimatedBundleBytes?: number;
}

export interface PerformanceFinding {
  ruleId: string;
  ruleName: string;
  category: PerformanceCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  file: string;
  line: number;
  column: number;
  code: string;
  fixAdvice: string;
  confidence: number;
  estimatedCostMs?: number;
  estimatedBundleBytes?: number;
  costBreakdown?: {
    cpuOperations: number;
    databaseQueries: number;
    apiCalls: number;
    bundleSizeBytes: number;
    reactRenders: number;
    eventLoopBlockingMs: number;
    totalEstimatedMs: number;
  };
}

export interface PerformanceStats {
  rulesChecked: number;
  filesScanned: number;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  totalEstimatedCostMs: number;
  totalEstimatedBundleBytes: number;
  durationMs: number;
}

export const PERFORMANCE_RULES: PerformanceRule[] = [
  {
    id: "PERF-N1-001",
    name: "N+1 query in loop (database query inside forEach/map)",
    category: "n-plus-one-query",
    severity: "critical",
    description: "A database query is executed inside a loop (forEach/map/for), causing N+1 query explosion. Each iteration triggers a separate DB roundtrip.",
    impact: "A page displaying 100 items executes 101 queries instead of 2. At 10ms per query, this adds 1 second of latency. At 1000 items, 10 seconds.",
    detection: "regex",
    patterns: [
      "forEach.*findOne\\(",
      "forEach.*findById\\(",
      "forEach.*findUnique\\(",
      "forEach.*findFirst\\(",
      "forEach.*queryRaw\\(",
      "map.*findOne\\(",
      "map.*findById\\(",
      "map.*findUnique\\(",
      "map.*queryRaw\\(",
      "findById\\(",
    ],
    contextPatterns: [
      "forEach",
      "map",
      "for\\s*\\(",
      "for\\s*\\(",
    ],
    fixAdvice: "Use a single batched query with $in operator (MongoDB) or include (Prisma) to fetch all related records in one query. Then join them in memory.",
    estimatedCostMs: 1000,
  },
  {
    id: "PERF-N1-002",
    name: "N+1 via Prisma serial findUnique in loop",
    category: "n-plus-one-query",
    severity: "critical",
    description: "Prisma findUnique or findFirst is called repeatedly inside a loop instead of using findMany with a where $in clause.",
    impact: "Serial Prisma queries each add ~5-20ms DB roundtrip latency. 50 items = 250-1000ms of unnecessary sequential DB calls.",
    detection: "regex",
    patterns: [
      "forEach.*findUnique",
      "forEach.*findFirst",
      "map.*findUnique",
      "map.*findFirst",
      "for.*findUnique",
      "for.*findFirst",
    ],
    fixAdvice: "Collect all IDs into an array and use findMany({ where: { id: { in: ids } } }). This executes a single query.",
    estimatedCostMs: 500,
  },
  {
    id: "PERF-FAT-001",
    name: "Fat handler — handler performing 3+ independent operations",
    category: "fat-handler",
    severity: "high",
    description: "A route handler performs 3+ independent side-effect operations (DB write + API call + email + file write + log). This violates the Single Responsibility Principle and creates a performance bottleneck.",
    impact: "A single request blocks for the sum of all operation latencies. If one downstream service is slow, the entire handler blocks. Prevents parallel execution of independent operations.",
    detection: "regex",
    patterns: [
      "await.*save\\(",
      "await.*find",
      "await.*fetch\\(",
      "await.*axios\\(",
      "await.*email",
      "await.*sendMail",
      "await.*writeFile",
      "await.*create",
      "await.*update",
      "await.*send",
    ],
    contextPatterns: [
      "await",
      "Promise\\.all",
    ],
    fixAdvice: "Decompose the handler into smaller functions. Use Promise.all() for independent async operations. Offload non-critical work to background queues (Bull, RabbitMQ, SQS).",
    estimatedCostMs: 2000,
  },
  {
    id: "PERF-BLOB-001",
    name: "Large library import — using heavy library for trivial operation",
    category: "bundle-bloat",
    severity: "high",
    description: "A large npm library is imported for a trivial operation that could be done with native APIs or smaller micro-libraries.",
    impact: "Lodash adds 71KB (24KB gzipped) to the bundle. Moment.js adds 232KB (65KB gzipped) vs date-fns at 0.3KB per function. Single-method imports from large libs increase bundle size unnecessarily.",
    detection: "regex",
    patterns: [
      "import.*lodash",
      "import.*moment",
      "import.*underscore",
      "import.*axios",
      "import.*chart\\.js",
      "import.*d3",
      "import.*three",
      "import.*aws\\-sdk",
      "import.*firebase",
      "import.*gulp",
      "import.*bootstrap",
      "import.*jquery",
      "import.*slick",
    ],
    excludePatterns: [
      "import.*type",
      "import.*icon",
      "import.*types",
    ],
    fixAdvice: "Use lodash-es for tree-shaking. Replace moment.js with date-fns or dayjs. Replace axios with native fetch. Only import specific functions: import { debounce } from 'lodash-es'.",
    estimatedBundleBytes: 70000,
  },
  {
    id: "PERF-BLOB-002",
    name: "Entire module import instead of specific exports",
    category: "bundle-bloat",
    severity: "medium",
    description: "The entire module is imported via default import instead of destructuring specific exports, preventing tree-shaking.",
    impact: "Webpack/Rollup cannot tree-shake default imports. All exports from the module end up in the bundle, even unused ones.",
    detection: "regex",
    patterns: [
      "import\\s+\\w+\\s+from\\s+['\"`]lodash\\/",
      "import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['\"`]react\\-bootstrap",
      "import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['\"`]react\\-icons",
      "import\\s+\\w+\\s+from\\s+['\"`]date\\-fns",
    ],
    fixAdvice: "Use destructured imports: import { debounce } from 'lodash-es'. This enables tree-shaking and only bundles used exports.",
    estimatedBundleBytes: 20000,
  },
  {
    id: "PERF-SYNC-001",
    name: "Synchronous filesystem operation blocking event loop",
    category: "sync-blocking",
    severity: "high",
    description: "A synchronous filesystem operation (readFileSync, writeFileSync, existsSync) is used in request context, blocking the Node.js event loop.",
    impact: "Each sync file operation blocks the event loop for the duration of I/O. A 50KB file read at ~5ms blocks all other concurrent requests. Under load, this causes cascading latency spikes.",
    detection: "regex",
    patterns: [
      "readFileSync\\(",
      "writeFileSync\\(",
      "existsSync\\(",
      "readdirSync\\(",
      "mkdirSync\\(",
      "unlinkSync\\(",
      "statSync\\(",
      "appendFileSync\\(",
      "renameSync\\(",
      "copyFileSync\\(",
      "rmSync\\(",
      "lstatSync\\(",
      "realpathSync\\(",
    ],
    fixAdvice: "Use fs.promises API (fs.promises.readFile) or async fs methods with callbacks. In Express, await fs.promises.readFile().",
    estimatedCostMs: 50,
  },
  {
    id: "PERF-SYNC-002",
    name: "Synchronous cryptography blocking event loop",
    category: "sync-blocking",
    severity: "high",
    description: "Synchronous cryptographic operations are used in request handlers, blocking the event loop for hundreds of milliseconds.",
    impact: "bcrypt.hashSync with cost factor 10 blocks for ~250ms. Under 10 concurrent requests, this adds 2.5 seconds of cumulative blocking.",
    detection: "regex",
    patterns: [
      "bcrypt\\.hashSync",
      "bcrypt\\.compareSync",
      "crypto\\.pbkdf2Sync",
      "crypto\\.randomBytes",
      "crypto\\.createHash",
    ],
    contextPatterns: [
      "req\\.",
      "body\\.",
      "params\\.",
      "query\\.",
    ],
    fixAdvice: "Use async alternatives: bcrypt.hash() returns a promise. Use crypto.pbkdf2() with callback.",
    estimatedCostMs: 250,
  },
  {
    id: "PERF-PRO-001",
    name: "Promise waterfall — sequential independent async operations",
    category: "promise-waterfall",
    severity: "high",
    description: "Independent async operations are awaited sequentially instead of being parallelized with Promise.all(). Each operation waits for the previous to complete.",
    impact: "3 independent 100ms API calls take 300ms when waterfalled vs 100ms with Promise.all(). At 10 concurrent calls, 1000ms vs 100ms — 10x latency improvement lost.",
    detection: "regex",
    patterns: [
      "(const|let)\\s+\\w+\\s*=\\s*await\\s+\\w+\\s*\\([^)]*\\)\\s*[\\s\\S]{0,50}(const|let)\\s+\\w+\\s*=\\s*await\\s+\\w+\\s*\\(",
    ],
    fixAdvice: "Use Promise.all() for independent operations: const [users, posts, comments] = await Promise.all([getUsers(), getPosts(), getComments()]).",
    estimatedCostMs: 300,
  },
  {
    id: "PERF-GROW-001",
    name: "Unbounded array growth — push without limit",
    category: "unbounded-growth",
    severity: "medium",
    description: "Items are pushed into an array without any size limit, potentially causing OOM on large datasets.",
    impact: "In a long-running server process, an unbounded results array grows until OOM. A CSV parser processing a 500MB file could allocate 2GB+ in memory.",
    detection: "regex",
    patterns: [
      "results\\.push\\(",
      "items\\.push\\(",
      "list\\.push\\(",
      "data\\.push\\(",
      "records\\.push\\(",
      "\\.push\\(.*result",
    ],
    contextPatterns: [
      "while",
      "forEach",
      "for\\s*\\(",
      "on\\('data'",
      "on\\('message'",
    ],
    fixAdvice: "Add a maximum size check before push: if (results.length >= MAX_RESULTS) break. Use streaming or pagination for large datasets.",
    estimatedCostMs: 200,
  },
  {
    id: "PERF-REND-001",
    name: "Excessive React re-render — state update in useEffect without deps",
    category: "re-render-cascade",
    severity: "high",
    description: "A React component calls setState inside useEffect without proper dependency array, causing infinite re-render loops or excessive updates.",
    impact: "Each unnecessary re-render triggers the entire component tree subtree reconciliation. 10 unnecessary renders on a complex component cost 50-200ms cumulative.",
    detection: "regex",
    patterns: [
      "useEffect\\(.*set",
      "useEffect\\(.*dispatch",
      "useEffect\\(.*update",
    ],
    excludePatterns: [
      "useEffect\\(.*\\[\\]\\)",
      "useEffect\\(.*\\[\\w+\\]\\)",
    ],
    fixAdvice: "Add proper dependency array to useEffect. If the effect should run once, use []. If on specific change, list all dependencies.",
    estimatedCostMs: 100,
  },
  {
    id: "PERF-REND-002",
    name: "Expensive computation in render without memoization",
    category: "missing-memo",
    severity: "medium",
    description: "An expensive computation (sorting, filtering, mapping large arrays) is performed directly in the render function without useMemo.",
    impact: "Sorting a 10000-item array on every keystroke costs ~50ms. At 20 characters typed, this adds 1 second of total latency.",
    detection: "regex",
    patterns: [
      "\\.sort\\(.*\\b",
      "\\.filter\\(.*\\b",
      "\\.reduce\\(.*\\b",
      "JSON\\.parse\\(JSON\\.stringify",
      "deepClone",
      "cloneDeep",
    ],
    contextPatterns: [
      "return",
      "const",
      "function",
    ],
    fixAdvice: "Wrap expensive computations in useMemo: const sorted = useMemo(() => items.sort(), [items]).",
    estimatedCostMs: 100,
  },
  {
    id: "PERF-REND-003",
    name: "Missing React.memo on frequently re-rendered component",
    category: "re-render-cascade",
    severity: "medium",
    description: "A component that receives the same props on every render is not wrapped in React.memo, causing unnecessary re-renders.",
    impact: "A list item component that re-renders 100 times on each parent state update costs ~10ms per render. 1000ms wasted per interaction.",
    detection: "regex",
    patterns: [
      "export\\s+default\\s+function\\s+\\w+",
      "export\\s+const\\s+\\w+\\s*=\\s*\\([^)]*\\)\\s*=>",
    ],
    contextPatterns: [
      "props",
      "children",
    ],
    fixAdvice: "Wrap the component in React.memo(): export default React.memo(MyComponent).",
    estimatedCostMs: 100,
  },
  {
    id: "PERF-LEAK-001",
    name: "setInterval without cleanup in component",
    category: "memory-leak",
    severity: "high",
    description: "setInterval or addEventListener is used in a component without cleanup on unmount, causing memory leaks and stale closures.",
    impact: "Each unmounted component leaves a running interval that continues to consume CPU and memory. After 1000 navigations, 1000 intervals run simultaneously.",
    detection: "regex",
    patterns: [
      "setInterval\\(",
      "addEventListener\\(",
      "document\\.addEventListener",
      "window\\.addEventListener",
    ],
    contextPatterns: [
      "useEffect",
      "componentDidMount",
      "componentWillUnmount",
    ],
    fixAdvice: "Return a cleanup function from useEffect: useEffect(() => { const id = setInterval(...); return () => clearInterval(id); }, []).",
    estimatedCostMs: 200,
  },
  {
    id: "PERF-PAG-001",
    name: "Missing pagination on database query",
    category: "missing-pagination",
    severity: "high",
    description: "A database query is executed without any limit or pagination, potentially returning millions of rows.",
    impact: "A query returning 100K rows consumes ~50MB of memory on the server. At 100 concurrent requests, 5GB memory is consumed.",
    detection: "regex",
    patterns: [
      "\\.find\\(\\{",
      "\\.findMany\\(",
      "SELECT \\* FROM",
      "\\.findAll\\(\\{",
      "\\.all\\(",
    ],
    excludePatterns: [
      "limit",
      "take:",
      "\\.limit\\(",
      "skip",
      "offset",
      "cursor",
      "pagination",
    ],
    fixAdvice: "Always add pagination: .limit(50) in Mongoose, take: 50 in Prisma, LIMIT 50 OFFSET 0 in SQL.",
    estimatedCostMs: 500,
  },
  {
    id: "PERF-CLONE-001",
    name: "Deep clone via JSON parse/stringify on large object",
    category: "deep-clone",
    severity: "medium",
    description: "JSON.parse(JSON.stringify(obj)) is used for deep cloning. This is slow for large objects, loses undefined values, functions, Dates, Maps, Sets, and circular references.",
    impact: "Cloning a 1MB object costs ~5ms. 10 clones on a hot path = 50ms latency. Also silently corrupts Date objects (converts to strings) and drops undefined/default values.",
    detection: "regex",
    patterns: [
      "JSON\\.parse\\(JSON\\.stringify\\(",
      "JSON\\.parse\\(JSON\\.stringify\\(",
    ],
    fixAdvice: "Use structuredClone() (native, faster, handles Date/Map/Set/circular refs) or lodash-es cloneDeep for compatibility.",
    estimatedCostMs: 10,
  },
  {
    id: "PERF-CONSOLE-001",
    name: "console.log in production code",
    category: "console-production",
    severity: "low",
    description: "console.log, console.warn, or console.error calls are present in the source code outside of development or test files.",
    impact: "While individually cheap (0.05ms), 100 console.log calls per request at 1000 RPS cost 5000ms of cumulative CPU time. More importantly, they indicate incomplete cleanup.",
    detection: "regex",
    patterns: [
      "console\\.log\\(",
      "console\\.warn\\(",
      "console\\.error\\(",
      "console\\.debug\\(",
      "console\\.info\\(",
    ],
    excludePatterns: [
      "\\.test\\.",
      "\\.spec\\.",
      "__tests__",
      "development",
      "dev\\.",
    ],
    fixAdvice: "Use a structured logger (pino, winston) with levels. Remove debug console.log statements before production.",
    estimatedCostMs: 1,
  },
  {
    id: "PERF-DB-001",
    name: "Missing database connection pooling",
    category: "connection-pool",
    severity: "high",
    description: "Database connections are created per request or per query instead of using a connection pool.",
    impact: "Creating a new DB connection costs ~10-50ms of TCP handshake + TLS + auth overhead. At 100 RPS, 1-5 seconds per second is wasted on connection setup.",
    detection: "regex",
    patterns: [
      "MongoClient\\.connect\\(",
      "pg\\.Client\\(",
      "createConnection\\(",
      "mysql\\.createConnection\\(",
      "new\\s+Client\\(",
      "new\\s+Pool\\(",
      "oracledb\\.getConnection\\(",
    ],
    contextPatterns: [
      "route",
      "app\\.get\\(",
      "app\\.post\\(",
      "router\\.get\\(",
      "router\\.post\\(",
      "handler",
    ],
    fixAdvice: "Create a global connection pool at application startup. Use Mongoose (built-in pool), Prisma (built-in pool), or pg.Pool for Postgres.",
    estimatedCostMs: 500,
  },
  {
    id: "PERF-CACHE-001",
    name: "Repeated identical database query without caching",
    category: "missing-cache",
    severity: "medium",
    description: "The same database query is executed multiple times within a single request or across requests with no caching layer.",
    impact: "A frequently accessed query (e.g., \"get all categories\") fetching 20 rows costs ~10ms each time. At 1000 requests, 10 seconds of unnecessary DB load.",
    detection: "regex",
    patterns: [
      "find\\(\\{",
      "findMany\\(",
      "SELECT",
    ],
    contextPatterns: [
      "cache",
      "redis",
      "memcached",
      "CDN",
      "inMemory",
      "memoiz",
    ],
    fixAdvice: "Add an in-memory cache (Node.js Map) or Redis for frequently accessed, rarely changing data. Use TTL-based cache invalidation.",
    estimatedCostMs: 200,
  },
  {
    id: "PERF-COPY-001",
    name: "Gratuitous array copy — spread operator on large array in hot path",
    category: "gratuitous-copy",
    severity: "low",
    description: "The spread operator (...) is used to copy a large array unnecessarily in a hot code path.",
    impact: "Spreading a 10000-element array creates a full copy, costing ~0.1ms. In a hot loop called 1000 times, this adds 100ms overhead.",
    detection: "regex",
    patterns: [
      "\\[\\s*\\.\\.\\.\\s*\\w+\\s*,?\\s*\\]",
      "\\{",
      "\\.\\.\\.\\w+",
    ],
    contextPatterns: [
      "forEach",
      "map\\(",
      "for\\s*\\(",
      "filter\\(",
      "reduce\\(",
    ],
    fixAdvice: "Use push.apply() or for loop mutations for performance-critical paths. Avoid creating intermediate copies in hot loops.",
    estimatedCostMs: 5,
  },
  {
    id: "PERF-EVT-001",
    name: "Event loop starvation — CPU-intensive sync operation",
    category: "event-loop-starvation",
    severity: "critical",
    description: "A long-running synchronous CPU operation runs in the main thread, starving the event loop and blocking all I/O.",
    impact: "A sync CPU operation taking 500ms blocks ALL other requests. At 50 concurrent users, each waits 500ms regardless of their own operation cost.",
    detection: "regex",
    patterns: [
      "for\\s*\\(\\s*.{0,20}\\s*<\\s*100000",
      "while\\s*\\(\\s*true",
      "while\\s*\\(1\\)",
      "largeFile",
      "processImage",
      "resizeImage",
      "sharp\\([^)]*\\)\\.toBuffer",
    ],
    fixAdvice: "Offload CPU-intensive work to worker threads (worker_threads), child processes, or a job queue (Bull/BullMQ). For image processing, use sharp in a worker thread.",
    estimatedCostMs: 500,
  },
  {
    id: "PERF-IMG-001",
    name: "Unoptimized image — no width/height attributes",
    category: "unoptimized-image",
    severity: "medium",
    description: "An <img> tag is used without width and height attributes, causing Cumulative Layout Shift (CLS) and re-renders as images load.",
    impact: "Images without dimensions force layout recalculations as each image loads, causing CLS and repainting costs of ~20ms per image.",
    detection: "regex",
    patterns: [
      "<img\\s",
      "<Image\\s",
    ],
    excludePatterns: [
      "width=",
      "height=",
      "fill",
      "layout=",
    ],
    fixAdvice: "Always specify width and height attributes on img tags. For Next.js Image component, use layout=\"fill\" or explicit width/height props.",
    estimatedCostMs: 20,
  },
  {
    id: "PERF-IMPORT-001",
    name: "Heavy transitive dependency — deep import chain adds cost",
    category: "hidden-dependency",
    severity: "medium",
    description: "A transitive dependency chain adds significant performance cost. The imported package has deep or heavy dependencies.",
    impact: "Each transitive dependency adds bundle size, install time, and potential runtime initialization cost. A chain of 100 deps adds 500KB+ to bundle.",
    detection: "regex",
    patterns: [
      "import.*react-dom",
      "import.*@mui",
      "import.*antd",
      "import.*@angular",
      "import.*chart\\.js",
      "import.*fullcalendar",
    ],
    fixAdvice: "Lazy-load heavy components with React.lazy() + Suspense. Use dynamic imports for code-splitting. Audit transitive deps with npm ls --all.",
    estimatedBundleBytes: 100000,
  },
  {
    id: "PERF-IMPORT-002",
    name: "Large icon library imported globally",
    category: "bundle-bloat",
    severity: "low",
    description: "An entire icon library is imported globally instead of importing only the specific icons needed.",
    impact: "react-icons bundles all icon sets. Importing globally adds 500KB+ to the bundle. Even tree-shaken, barrel imports can prevent optimization.",
    detection: "regex",
    patterns: [
      "import.*from\\s+['\"`]react-icons",
      "import.*from\\s+['\"`]@heroicons",
      "import.*from\\s+['\"`]lucide-react",
      "import.*from\\s+['\"`]phosphor-react",
    ],
    fixAdvice: "Import specific icons: import { FiHome } from 'react-icons/fi' instead of import { FiHome } from 'react-icons'.",
    estimatedBundleBytes: 500000,
  },
  {
    id: "PERF-DEAD-001",
    name: "Handler that completes without observable side effect",
    category: "unused-code",
    severity: "medium",
    description: "A request handler performs operations but produces no observable effect — no DB write, no API call, no response body, no event emission.",
    impact: "The handler wastes server resources (CPU, memory, event loop time) but provides no value. It may represent a bug or incomplete implementation.",
    detection: "regex",
    patterns: [
      "app\\.(get|post|put|delete|patch)\\(\\s*['\"`][\\w\\-\\/]+['\"`]\\s*,\\s*\\(\\s*(req|_req)",
      "router\\.(get|post|put|delete|patch)\\(\\s*['\"`][\\w\\-\\/]+['\"`]\\s*,\\s*\\(\\s*(req|_req)",
    ],
    contextPatterns: [
      "res\\.json\\(",
      "res\\.send\\(",
      "res\\.end\\(",
      "res\\.status",
      "res\\.render\\(",
      "res\\.redirect\\(",
    ],
    fixAdvice: "Ensure every handler returns an HTTP response. If the handler performs background work, log the outcome and return a 202 Accepted status.",
    estimatedCostMs: 10,
  },
  {
    id: "PERF-DEAD-002",
    name: "Zombie promise — fire-and-forget async without error handling",
    category: "zombie-promise",
    severity: "medium",
    description: "An async function is called without await, .then(), or .catch(), meaning errors are silently swallowed.",
    impact: "The async operation runs but any errors are silently lost. The caller cannot know if the operation succeeded or failed.",
    detection: "regex",
    patterns: [
      "\\w+Async\\(",
      "sendEmail\\(",
      "sendMail\\(",
      "logEvent\\(",
      "writeLog\\(",
    ],
    excludePatterns: [
      "await\\s+",
      "\\.then\\(",
      "\\.catch\\(",
      "void\\s+",
    ],
    fixAdvice: "Always handle promises: either await them, attach .catch() for fire-and-forget, or use void for intentional fire-and-forget (with global rejection handler).",
    estimatedCostMs: 50,
  },
  {
    id: "PERF-CSS-001",
    name: "Large CSS/stylesheet bloat",
    category: "css-bloat",
    severity: "low",
    description: "Unused CSS rules or large stylesheets increase bundle size and parse time.",
    impact: "100KB of unused CSS adds ~30ms parse time and contributes to bundle size. On mobile connections, every 10KB adds ~30ms download time.",
    detection: "regex",
    patterns: [
      "import.*\\.css",
      "import.*\\.scss",
      "import.*\\.less",
      "import.*\\.module\\.css",
    ],
    contextPatterns: [
      "@import",
      "~",
    ],
    fixAdvice: "Use CSS modules or Tailwind CSS for zero-runtime CSS. Remove unused CSS with PurgeCSS. Limit global styles to essential reset/typography only.",
    estimatedBundleBytes: 50000,
  },
  {
    id: "PERF-REGEX-001",
    name: "Potentially catastrophic regex pattern",
    category: "inefficient-regex",
    severity: "high",
    description: "A regex pattern with nested quantifiers ((a+)+) or overlapping alternations may cause catastrophic backtracking.",
    impact: "A single crafted input can cause the regex engine to perform exponential backtracks, freezing the event loop for seconds or minutes.",
    detection: "regex",
    patterns: [
      "\\(\\w+\\+\\)\\+",
      "\\(\\w+\\*\\)\\+",
      "\\(\\w+\\+\\)\\*",
      "\\(\\w+\\*\\s*\\)\\*",
      "\\(\\\\d\\+\\s*\\)\\+",
      "\\(\\\\w\\+\\s*\\)\\+",
    ],
    fixAdvice: "Use re2 library (safe regex engine). Avoid nested quantifiers. Use atomic groups (?>...) or possessive quantifiers (++) where supported.",
    estimatedCostMs: 1000,
  },
  {
    id: "PERF-NEST-001",
    name: "Nested Promise anti-pattern",
    category: "nested-promise",
    severity: "medium",
    description: "Promises are nested inside other Promise handlers instead of being chained or flattened with async/await.",
    impact: "Nested promises create pyramid of doom, make error handling complex, and can cause subtle timing bugs.",
    detection: "regex",
    patterns: [
      "\\.then\\(.*\\.then\\(",
      "\\.then\\(.*new\\s+Promise",
    ],
    fixAdvice: "Use async/await to flatten promise chains. Use Promise.all() for parallel operations.",
    estimatedCostMs: 10,
  },
];

export const PERFORMANCE_CATEGORIES: PerformanceCategory[] = PERFORMANCE_RULES.map((r) => r.category).filter(
  (v, i, a) => a.indexOf(v) === i,
);
