type AnyNode = any;

const LOOP_KINDS = new Set(['foreach', 'for', 'while', 'do']);

export interface LoopMetrics {
    loops: number;
    maxDepth: number;
}

export function analyzeLoops(methodNode: AnyNode): LoopMetrics {
    let loops = 0;
    let maxDepth = 0;

    function walk(node: AnyNode, depth: number) {
        if (!node || typeof node !== 'object') return;

        const isLoop = LOOP_KINDS.has(node.kind);
        const nextDepth = isLoop ? depth + 1 : depth;

        if (isLoop) {
            loops += 1;
            if (nextDepth > maxDepth) maxDepth = nextDepth;
        }

        for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) val.forEach(v => walk(v, nextDepth));
            else if (val && typeof val === 'object') walk(val, nextDepth);
        }
    }

    walk(methodNode, 0);
    return { loops, maxDepth };
}
