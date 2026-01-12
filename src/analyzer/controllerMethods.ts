type AnyNode = any;

export interface MethodInfo {
    name: string;
    startLine: number;
    endLine: number;
    node: any;
}

function walk(node: AnyNode, visit: (n: AnyNode) => void) {
    if (!node || typeof node !== 'object') return;

    visit(node);

    for (const key of Object.keys(node)) {
        const val = node[key];
        if (Array.isArray(val)) {
            val.forEach(v => walk(v, visit));
        } else if (val && typeof val === 'object') {
            walk(val, visit);
        }
    }
}

export function extractMethods(ast: AnyNode): MethodInfo[] {
    const methods: MethodInfo[] = [];

    walk(ast, (n) => {
        // php-parser: method node kind is usually "method"
        if (n.kind === 'method' && n.name) {
            const name =
                typeof n.name === 'string'
                    ? n.name
                    : (n.name.name || 'unknown');

            const startLine = n.loc?.start?.line ?? -1;
            const endLine = n.loc?.end?.line ?? -1;

            methods.push({ name, startLine, endLine, node: n });
        }
    });

    return methods;
}
