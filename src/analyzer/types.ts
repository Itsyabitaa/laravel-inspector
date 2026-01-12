export interface MethodAnalysis {
    methodName: string;
    startLine: number;
    endLine: number;

    loops: number;              // total loop nodes
    maxLoopDepth: number;       // nesting depth

    queriesTotal: number;       // total query-like calls
    queriesInLoops: number;     // query-like calls inside loops

    possibleNPlusOne: boolean;

    estimatedComplexity: string; // O(1), O(n), O(n^2), O(n * query)...
}
