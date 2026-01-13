import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from './analyzer/phpAst';
import { extractMethods } from './analyzer/controllerMethods';
import { analyzeMethod } from './analyzer/methodAnalyzer';
import { LaravelInspectorCodeLensProvider } from './ui/codeLensProvider';
import { refreshDiagnostics, diagnosticCollection } from './ui/diagnostics';
import { LaravelInspectorHoverProvider } from './ui/hoverProvider';

export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('Laravel Inspector');

	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ language: 'php' },
			new LaravelInspectorCodeLensProvider()
		)
	);

	context.subscriptions.push(diagnosticCollection);

	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document);
	}

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(refreshDiagnostics),
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document)),
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) refreshDiagnostics(editor.document);
		})
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ language: 'php' },
			new LaravelInspectorHoverProvider()
		)
	);

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

				output.appendLine('--- Laravel Inspector: Method Analysis ---');
				output.appendLine(`File: ${doc.fileName}`);
				analyses.forEach(a => {
					output.appendLine(`Method: ${a.methodName} | LoopDepth: ${a.maxLoopDepth} | Queries: ${a.queriesTotal} | N+1: ${a.possibleNPlusOne}`);
				});
				output.show(true);

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
