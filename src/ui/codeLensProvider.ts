import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from '../analyzer/phpAst';
import { extractMethods } from '../analyzer/controllerMethods';
import { analyzeMethod } from '../analyzer/methodAnalyzer';

export class LaravelInspectorCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const isPhp = document.languageId === 'php' || document.fileName.endsWith('.php');
        const isController = document.fileName.includes(
            `${path.sep}app${path.sep}Http${path.sep}Controllers${path.sep}`
        );

        if (!isPhp || !isController) return [];

        const code = document.getText();

        try {
            const ast = parsePhp(code);
            const methods = extractMethods(ast);

            return methods.map(m => {
                const analysis = analyzeMethod(m.node);
                const line = Math.max(analysis.startLine - 1, 0);
                const range = new vscode.Range(line, 0, line, 0);

                const titleParts = [
                    `Complexity: ${analysis.estimatedComplexity}`,
                    `Queries: ${analysis.queriesTotal}`,
                ];

                if (analysis.possibleNPlusOne) {
                    titleParts.push(`⚠ N+1 risk`);
                }

                return new vscode.CodeLens(range, {
                    title: titleParts.join(' | '),
                    command: '', // no click action yet
                    arguments: []
                });
            });
        } catch {
            return [];
        }
    }
}
