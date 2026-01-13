import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from '../analyzer/phpAst';
import { extractMethods } from '../analyzer/controllerMethods';
import { findQueriesInsideLoops } from '../analyzer/queryLocations';

export const diagnosticCollection =
    vscode.languages.createDiagnosticCollection('laravel-inspector');

export function refreshDiagnostics(document: vscode.TextDocument) {
    const isPhp = document.languageId === 'php' || document.fileName.endsWith('.php');
    const isController = document.fileName.includes(
        `${path.sep}app${path.sep}Http${path.sep}Controllers${path.sep}`
    );

    if (!isPhp || !isController) {
        diagnosticCollection.delete(document.uri);
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    try {
        const ast = parsePhp(document.getText());
        const methods = extractMethods(ast);

        for (const m of methods) {
            const queryLocs = findQueriesInsideLoops(m.node);

            for (const q of queryLocs) {
                const line = Math.max(q.line - 1, 0);
                const range = new vscode.Range(line, 0, line, 1000);

                diagnostics.push(
                    new vscode.Diagnostic(range, q.message, vscode.DiagnosticSeverity.Warning)
                );
            }
        }
    } catch {
        // ignore parse errors
    }

    diagnosticCollection.set(document.uri, diagnostics);
}
