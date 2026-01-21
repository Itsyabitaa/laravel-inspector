import * as vscode from 'vscode';

const cache = new Map<string, { version: number; data: any }>();

export function getCached(doc: vscode.TextDocument): any | null {
    const key = doc.uri.toString();
    const entry = cache.get(key);

    if (!entry) return null;
    if (entry.version !== doc.version) return null;

    return entry.data;
}

export function setCached(doc: vscode.TextDocument, data: any) {
    cache.set(doc.uri.toString(), {
        version: doc.version,
        data
    });
}

export function clearCache() {
    cache.clear();
}
