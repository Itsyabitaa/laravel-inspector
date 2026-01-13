type AnyNode = any;

const LOOP_KINDS = new Set(['foreach', 'for', 'while', 'do']);

const TERMINAL = new Set([
    'get', 'first', 'firstOrFail',
    'find', 'findOrFail',
    'count', 'paginate', 'simplePaginate',
    'exists', 'pluck', 'value', 'sum', 'avg', 'min', 'max',
]);

function getName(node: AnyNode): string | null {
    if (!node) return null;
    if (typeof node === 'string') return node;
    if (node.kind === 'identifier' && typeof node.name === 'string') return node.name;
    if (node.name && typeof node.name === 'string') return node.name;
    if (node.name?.name) return node.name.name;
    return null;
}

function getCalledMethodName(callNode: AnyNode): string | null {
    if (!callNode || callNode.kind !== 'call') return null;
    const direct = getName(callNode.what);
    if (direct) return direct;
    if (callNode.what?.kind === 'propertylookup') return getName(callNode.what.offset);
    return null;
}

// Detect: $user->posts (magic property access for relations)
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

export type DecorationKind = 'normal' | 'nplus' | 'heavy' | 'safe';

export interface QueryDecoration {
    line: number;
    kind: DecorationKind;
    hoverMessage: string;
}

export function findQueryDecorations(methodNode: AnyNode): QueryDecoration[] {
    const out: QueryDecoration[] = [];

    function walk(node: AnyNode, loopDepth: number) {
        if (!node || typeof node !== 'object') return;

        const isLoop = LOOP_KINDS.has(node.kind);
        const nextDepth = isLoop ? loopDepth + 1 : loopDepth;

        // Detect terminal query calls
        if (node.kind === 'call') {
            const name = getCalledMethodName(node);

            if (name && TERMINAL.has(name)) {
                const line = node.loc?.start?.line ?? -1;
                if (line !== -1) {
                    // classify
                    let kind: DecorationKind = 'normal';

                    // inside loop => N+1 risk
                    if (nextDepth > 0) kind = 'nplus';

                    // heavy if paginate
                    if (name === 'paginate') kind = 'heavy';

                    // safe if simplePaginate
                    if (name === 'simplePaginate') kind = 'safe';

                    out.push({
                        line,
                        kind,
                        hoverMessage:
                            kind === 'nplus'
                                ? '⚠ Query executed inside a loop (possible N+1). Consider eager loading or batching.'
                                : kind === 'heavy'
                                    ? '🔴 paginate() often runs 2 SQL queries (COUNT + page fetch). Consider simplePaginate() if total count not needed.'
                                    : kind === 'safe'
                                        ? '🟢 simplePaginate() avoids COUNT query (usually 1 query).'
                                        : '🔵 Detected query execution.',
                    });
                }
            }
        }

        // Detect magic property access (N+1 risk)
        if (node.kind === 'propertylookup') {
            if (nextDepth > 0 && isRelationPropertyAccess(node)) {
                const line = node.loc?.start?.line ?? -1;
                if (line !== -1) {
                    out.push({
                        line,
                        kind: 'nplus',
                        hoverMessage: '⚠ Magic property access inside loop (possible lazy loading). Consider eager loading.'
                    });
                }
            }
        }

        for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) val.forEach(v => walk(v, nextDepth));
            else if (val && typeof val === 'object') walk(val, nextDepth);
        }
    }

    walk(methodNode, 0);
    return out;
}
