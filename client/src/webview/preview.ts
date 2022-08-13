import { readFileSync } from 'fs';
import { normalize } from 'path';
import * as vscode from 'vscode';

export class AventusPeview {

    public getPreview(context: vscode.ExtensionContext, uri: string): vscode.WebviewPanel {
        let panel = vscode.window.createWebviewPanel("avt-preview", "Preview", {
            viewColumn: vscode.ViewColumn.Beside
        });

        this.setHtmlForWebview(context, panel.webview, uri)
        return panel;
    }
    /**
     * Get the static html used for the editor webviews.
     */
    private setHtmlForWebview(context: vscode.ExtensionContext, webview: vscode.Webview, uri: string): void {
        // Local path to script and css for the webview

        let viewUrl = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'client', 'view')).toString();

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        let realPath = normalize(vscode.Uri.joinPath(context.extensionUri, 'client', 'view', 'preview.html').path.slice(1));
        let txt = readFileSync(realPath, 'utf8');
        txt = txt.replace(/~/g, viewUrl);
        txt = txt.replace(/\$nonce/g, nonce);
        txt = txt.replace(/\$csp/g, webview.cspSource);
        webview.html = txt
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}