import * as vscode from 'vscode';
import * as path from 'path';
import { parsePhp } from '../analyzer/phpAst';
import { extractMethods } from '../analyzer/controllerMethods';
import { findQueryDecorations } from '../analyzer/queryDecorations';

const isControllerFile = (doc: vscode.TextDocument) =>
    (doc.languageId === 'php' || doc.fileName.endsWith('.php')) &&
    doc.fileName.includes(`${path.sep}app${path.sep}Http${path.sep}Controllers${path.sep}`);

// Blue: normal query
const normalQueryDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(0, 120, 215, 0.12)',
    border: '1px solid rgba(0, 120, 215, 0.35)',
    overviewRulerColor: 'rgba(0, 120, 215, 0.8)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
});

// Yellow: query in loop (N+1 risk)
const nplusDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 200, 0, 0.16)',
    border: '1px solid rgba(255, 200, 0, 0.45)',
    overviewRulerColor: 'rgba(255, 200, 0, 0.9)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
});

// Red: "heavy" (paginate=2, or many eager loads)
const heavyDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 0, 0, 0.10)',
    border: '1px solid rgba(255, 0, 0, 0.35)',
    overviewRulerColor: 'rgba(255, 0, 0, 0.8)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
});

// Green: "safe" (optional classification)
const safeDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(0, 200, 0, 0.08)',
    border: '1px solid rgba(0, 200, 0, 0.25)',
    overviewRulerColor: 'rgba(0, 200, 0, 0.6)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
});

export function applyDecorations(editor?: vscode.TextEditor) {
    if (!editor) return;
    const doc = editor.document;

    if (!isControllerFile(doc)) {
        editor.setDecorations(normalQueryDecoration, []);
        editor.setDecorations(nplusDecoration, []);
        editor.setDecorations(heavyDecoration, []);
        editor.setDecorations(safeDecoration, []);
        return;
    }

    try {
        const ast = parsePhp(doc.getText());
        const methods = extractMethods(ast);

        const all = methods.flatMap(m => findQueryDecorations(m.node));

        const normalRanges: vscode.DecorationOptions[] = [];
        const nplusRanges: vscode.DecorationOptions[] = [];
        const heavyRanges: vscode.DecorationOptions[] = [];
        const safeRanges: vscode.DecorationOptions[] = [];

        for (const item of all) {
            const line = Math.max(item.line - 1, 0);
            const range = new vscode.Range(line, 0, line, 1000);

            const opt: vscode.DecorationOptions = {
                range,
                hoverMessage: item.hoverMessage,
            };

            if (item.kind === 'nplus') nplusRanges.push(opt);
            else if (item.kind === 'heavy') heavyRanges.push(opt);
            else if (item.kind === 'safe') safeRanges.push(opt);
            else normalRanges.push(opt);
        }

        editor.setDecorations(normalQueryDecoration, normalRanges);
        editor.setDecorations(nplusDecoration, nplusRanges);
        editor.setDecorations(heavyDecoration, heavyRanges);
        editor.setDecorations(safeDecoration, safeRanges);
    } catch {
        // ignore parse errors
    }
}
