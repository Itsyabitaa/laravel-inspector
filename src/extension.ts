import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from './analyzer/phpAst';
import { extractMethods } from './analyzer/controllerMethods';

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

				console.log('--- Laravel Inspector ---');
				console.log('File:', doc.fileName);
				console.log('Methods found:', methods.length);
				console.table(methods);

				vscode.window.showInformationMessage(`Found ${methods.length} methods (check console).`);
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
