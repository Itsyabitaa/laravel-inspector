type AnyNode = any;

const TERMINAL_QUERY_METHODS = new Set([
    'get', 'first', 'count', 'paginate', 'simplePaginate',
    'exists', 'pluck', 'value', 'sum', 'avg', 'min', 'max'
]);

const STATIC_QUERY_METHODS = new Set([
    'all', 'find', 'findOrFail', 'where', 'query', 'select',
    'with', 'withCount', 'has', 'doesntHave', 'whereIn'
]);

const DB_FACADE = new Set(['DB']);

function getName(node: AnyNode): string | null {
    if (!node) return null;
    if (typeof node === 'string') return node;
    if (node.name && typeof node.name === 'string') return node.name;
    if (node.name?.name) return node.name.name;
    return null;
}

// Detect: Model::where / DB::table
function isStaticCallQuery(n: AnyNode): boolean {
    if (n.kind !== 'staticlookup') return false;

    const className = getName(n.what);
    const methodName = getName(n.offset);

    if (!className || !methodName) return false;

    if (DB_FACADE.has(className)) return true;              // DB::anything()
    if (STATIC_QUERY_METHODS.has(methodName)) return true;  // User::where(), etc.

    return false;
}

// Detect: ->get(), ->first() etc
function isMethodCallTerminalQuery(n: AnyNode): boolean {
    if (n.kind !== 'call') return false;
    const methodName = getName(n.what);
    if (!methodName) return false;
    return TERMINAL_QUERY_METHODS.has(methodName);
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

        const looksLikeQuery =
            isStaticCallQuery(node) || isMethodCallTerminalQuery(node);

        if (looksLikeQuery) {
            total += 1;
            if (nextDepth > 0) inLoops += 1;
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
