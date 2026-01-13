type AnyNode = any;

const LOOP_KINDS = new Set(['foreach', 'for', 'while', 'do']);

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
    if (node.kind === 'identifier' && typeof node.name === 'string') return node.name;
    if (node.name && typeof node.name === 'string') return node.name;
    if (node.name?.name) return node.name.name;
    return null;
}

function isStaticCallQuery(n: AnyNode): boolean {
    if (n.kind !== 'staticlookup') return false;
    const className = getName(n.what);
    const methodName = getName(n.offset);
    if (!className || !methodName) return false;
    if (DB_FACADE.has(className)) return true;
    if (STATIC_QUERY_METHODS.has(methodName)) return true;
    return false;
}

function isMethodCallTerminalQuery(n: AnyNode): boolean {
    if (n.kind !== 'call') return false;
    const methodName = getName(n.what);
    if (!methodName) return false;

    if (methodName === 'paginate') return true;

    return TERMINAL_QUERY_METHODS.has(methodName);
}

// Same logic as queryAnalyzer
function isRelationPropertyAccess(n: AnyNode): boolean {
    if (n.kind !== 'propertylookup') return false;

    const propName = getName(n.offset);
    if (!propName) return false;

    const COMMON_COLUMNS = new Set([
        'id', 'name', 'email', 'password', 'created_at', 'updated_at', 'deleted_at',
        'uuid', 'slug', 'title', 'description', 'body', 'content', 'type', 'status',
        'url', 'data', 'message'
    ]);

    if (COMMON_COLUMNS.has(propName)) return false;

    return true;
}

export interface QueryLocation {
    line: number;
    message: string;
}

export function findQueriesInsideLoops(methodNode: AnyNode): QueryLocation[] {
    const results: QueryLocation[] = [];

    function walk(node: AnyNode, loopDepth: number) {
        if (!node || typeof node !== 'object') return;

        const isLoop = LOOP_KINDS.has(node.kind);
        const nextDepth = isLoop ? loopDepth + 1 : loopDepth;

        let looksLikeQuery = isStaticCallQuery(node) || isMethodCallTerminalQuery(node);

        if (nextDepth > 0 && isRelationPropertyAccess(node)) {
            looksLikeQuery = true;
        }

        if (looksLikeQuery && nextDepth > 0) {
            const line = node.loc?.start?.line ?? -1;
            if (line !== -1) {
                results.push({
                    line,
                    message: 'Possible N+1: query executed inside a loop (or lazy loaded relation)'
                });
            }
        }

        for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) val.forEach(v => walk(v, nextDepth));
            else if (val && typeof val === 'object') walk(val, nextDepth);
        }
    }

    walk(methodNode, 0);
    return results;
}
