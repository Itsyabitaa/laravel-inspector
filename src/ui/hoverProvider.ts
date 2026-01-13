import * as vscode from 'vscode';

export class LaravelInspectorHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const lineText = document.lineAt(position.line).text;

        // simple heuristic: if line contains query method and also is in a foreach block, diagnostics already exist
        if (
            /(->get\(|->first\(|->count\(|DB::|::where\(|::all\()/.test(lineText)
        ) {
            return new vscode.Hover(
                'Laravel Inspector: This line looks like a database query. If it runs inside a loop, it may cause N+1 queries. Consider eager loading (`with()`) or batching.'
            );
        }
        return null;
    }
}
