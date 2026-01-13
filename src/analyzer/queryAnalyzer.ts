// src/analyzer/queryAnalyzer.ts

type AnyNode = any;

/**
 * Methods that EXECUTE SQL immediately
 */
const TERMINAL_QUERY_METHODS = new Set([
  'get',
  'first',
  'firstOrFail',
  'find',
  'findOrFail',
  'count',
  'paginate',
  'simplePaginate',
  'exists',
  'pluck',
  'value',
  'sum',
  'avg',
  'min',
  'max',
]);

/**
 * Static methods that EXECUTE immediately
 */
const IMMEDIATE_STATIC_QUERIES = new Set([
  'all',
  'find',
  'findOrFail',
]);

const DB_FACADE = new Set(['DB']);

function getName(node: AnyNode): string | null {
  if (!node) return null;

  if (typeof node === 'string') return node;

  if (node.kind === 'identifier' && typeof node.name === 'string') {
    return node.name;
  }

  if (typeof node.name === 'string') return node.name;

  if (node.name?.name) return node.name.name;

  return null;
}

/**
 * 🔑 IMPORTANT FIX:
 * Handles ->method() where php-parser uses propertylookup
 */
function getCalledMethodName(callNode: AnyNode): string | null {
  if (!callNode || callNode.kind !== 'call') return null;

  // direct call: foo()
  const direct = getName(callNode.what);
  if (direct) return direct;

  // chained call: $x->method()
  if (callNode.what?.kind === 'propertylookup') {
    return getName(callNode.what.offset);
  }

  return null;
}

/**
 * Detects DB facade calls
 */
function isDbFacadeCall(n: AnyNode): boolean {
  if (n.kind !== 'staticlookup') return false;
  const className = getName(n.what);
  return !!className && DB_FACADE.has(className);
}

/**
 * Detect terminal SQL execution
 */
function isTerminalQueryCall(n: AnyNode): boolean {
  if (n.kind !== 'call') return false;
  const name = getCalledMethodName(n);
  return !!name && TERMINAL_QUERY_METHODS.has(name);
}

/**
 * Static calls like User::all()
 */
function isImmediateStaticQuery(n: AnyNode): boolean {
  if (n.kind !== 'staticlookup') return false;
  const name = getName(n.offset);
  return !!name && IMMEDIATE_STATIC_QUERIES.has(name);
}

/**
 * Count eager-loaded relations
 */
function countEagerLoads(n: AnyNode): number {
  if (n.kind !== 'call') return 0;

  const name = getCalledMethodName(n);
  if (name !== 'with') return 0;

  const args = n.arguments || [];
  if (args.length === 0) return 0;

  const first = args[0];

  if (first.kind === 'string') return 1;

  if (first.kind === 'array') {
    return (first.items || []).length;
  }

  return 0;
}

/**
 * Heuristic: relation property access ($user->posts) in loops
 */
function isRelationPropertyAccess(n: AnyNode): boolean {
  if (n.kind !== 'propertylookup') return false;

  const prop = getName(n.offset);
  if (!prop) return false;

  const COMMON_COLUMNS = new Set([
    'id',
    'name',
    'email',
    'password',
    'created_at',
    'updated_at',
    'deleted_at',
    'uuid',
    'slug',
    'title',
    'description',
    'body',
    'content',
    'type',
    'status',
    'url',
    'data',
    'message',
  ]);

  return !COMMON_COLUMNS.has(prop);
}

export interface QueryMetrics {
  total: number;
  inLoops: number;
}

export function analyzeQueries(methodNode: AnyNode): QueryMetrics {
  let total = 0;
  let inLoops = 0;

  const LOOP_KINDS = new Set(['foreach', 'for', 'while', 'do']);

  function walk(node: AnyNode, loopDepth: number) {
    if (!node || typeof node !== 'object') return;

    const isLoop = LOOP_KINDS.has(node.kind);
    const nextDepth = isLoop ? loopDepth + 1 : loopDepth;

    let weight = 0;

    /**
     * 1️⃣ Terminal query calls
     */
    if (isTerminalQueryCall(node)) {
      const name = getCalledMethodName(node);
      weight = 1;

      if (name === 'paginate') weight = 2;
      if (name === 'simplePaginate') weight = 1;
    }

    /**
     * 2️⃣ Static immediate queries
     */
    if (weight === 0 && isImmediateStaticQuery(node)) {
      weight = 1;
    }

    /**
     * 3️⃣ DB facade
     */
    if (weight === 0 && isDbFacadeCall(node)) {
      weight = 1;
    }

    /**
     * 4️⃣ Eager loading adds queries
     */
    const eager = countEagerLoads(node);
    if (eager > 0) {
      weight += eager;
    }

    /**
     * 5️⃣ Relation access in loops (N+1)
     */
    if (nextDepth > 0 && isRelationPropertyAccess(node)) {
      if (weight === 0) weight = 1;
    }

    if (weight > 0) {
      total += weight;
      if (nextDepth > 0) inLoops += weight;
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val)) val.forEach(v => walk(v, nextDepth));
      else if (val && typeof val === 'object') walk(val, nextDepth);
    }
  }

  walk(methodNode, 0);
  return { total, inLoops };
}
