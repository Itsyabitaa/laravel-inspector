import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from './analyzer/phpAst';
import { extractMethods } from './analyzer/controllerMethods';
import { analyzeMethod } from './analyzer/methodAnalyzer';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand(
		'laravel-inspector.analyzeController',
		() => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const doc = editor.document;

			const isController = doc.fileName.includes(
				`${path.sep}app${path.sep}Http${path.sep}Controllers${path.sep}`
			);
			if (!isController) {
				vscode.window.showWarningMessage('Not a Laravel controller file (app/Http/Controllers).');
				return;
			}

			const code = doc.getText();

			try {
				const ast = parsePhp(code);
				const methods = extractMethods(ast);

				const analyses = methods.map(m => analyzeMethod(m.node));

				console.log('--- Laravel Inspector: Method Analysis ---');
				console.table(analyses);

				const nplus = analyses.filter(a => a.possibleNPlusOne).length;
				vscode.window.showInformationMessage(
					`Analyzed ${analyses.length} methods. Possible N+1 in ${nplus}.`
				);
			} catch (err: any) {
				console.error('[Laravel Inspector] Parse error:', err);
				vscode.window.showErrorMessage('PHP parse failed. Check console.');
			}
		}
	);

	context.subscriptions.push(disposable);
	console.log('[Laravel Inspector] Activated');
}
export function deactivate() { }
