import { MethodAnalysis } from './types';
import { analyzeLoops } from './loopAnalyzer';
import { analyzeQueries } from './queryAnalyzer';

type AnyNode = any;

function estimateComplexity(maxDepth: number, queriesInLoops: number): string {
    if (maxDepth === 0 && queriesInLoops === 0) return 'O(1)';
    if (maxDepth === 1 && queriesInLoops === 0) return 'O(n)';
    if (maxDepth >= 2 && queriesInLoops === 0) return `O(n^${maxDepth})`;
    if (maxDepth >= 1 && queriesInLoops > 0) return 'O(n * query)';
    return 'O(?)';
}

export function analyzeMethod(methodNode: AnyNode): MethodAnalysis {
    const methodName =
        typeof methodNode.name === 'string'
            ? methodNode.name
            : (methodNode.name?.name || 'unknown');

    const startLine = methodNode.loc?.start?.line ?? -1;
    const endLine = methodNode.loc?.end?.line ?? -1;

    const loop = analyzeLoops(methodNode);
    const query = analyzeQueries(methodNode);

    return {
        methodName,
        startLine,
        endLine,
        loops: loop.loops,
        maxLoopDepth: loop.maxDepth,
        queriesTotal: query.total,
        queriesInLoops: query.inLoops,
        possibleNPlusOne: query.inLoops > 0,
        estimatedComplexity: estimateComplexity(loop.maxDepth, query.inLoops),
    };
}
