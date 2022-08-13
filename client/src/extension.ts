/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	RequestType,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import { BuildQuickPick } from './quickPick';
import { AventusPeview } from './webview/preview';

let client: LanguageClient;
const allBuilds: { [key: string]: string[] } = {};
const allStatics: { [key: string]: string[] } = {};

export function activate(context: vscode.ExtensionContext) {
	let btn = vscode.window.createStatusBarItem("last-compiled-info", vscode.StatusBarAlignment.Right, 1000);
	btn.text = "";
	btn.show();

	
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc, },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: "Aventus Ts" }, { scheme: 'file', language: "Aventus HTML" }, { scheme: 'file', language: 'Aventus SCSS' }],
		middleware: {
			executeCommand: async (command, args, next) => {
				if (command == "aventus.createComponent") {
					const result = await vscode.window.showInputBox({
						title: "Please provide a component name",
					});
					args.push(result);
				}
				else if (command == "aventus.compile") {
					let toDisplay: BuildQuickPick[] = [];
					for (let uri in allBuilds) {
						for (let name of allBuilds[uri]) {
							toDisplay.push(new BuildQuickPick(name, uri));
						}
					}

					const result = await vscode.window.showQuickPick(toDisplay, {
						placeHolder: 'Project to compile',
						canPickMany: false,
					});
					if (result) {
						args.push(result);
					}

				}
				else if (command == "aventus.static") {
					let toDisplay: BuildQuickPick[] = [];
					for (let uri in allStatics) {
						for (let name of allStatics[uri]) {
							toDisplay.push(new BuildQuickPick(name, uri));
						}
					}

					const result = await vscode.window.showQuickPick(toDisplay, {
						placeHolder: 'Static to export',
						canPickMany: false,
					});
					if (result) {
						args.push(result);
					}

				}
				return next(command, args);
			},
			provideCodeActions(this, document, range, context, token, next) {
				return next(document, range, context, token);
			},

		},



	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'Aventus',
		'Aventus',
		serverOptions,
		clientOptions
	);
	// client.sendRequest(new RequestType<void, void, void>('aventus/openfile'), )
	client.onReady().then(() => {
		client.onNotification("aventus/openfile", (uri: string) => {
			vscode.window.showTextDocument(vscode.Uri.parse(uri));
		});
		client.onNotification("aventus/openpreview", (uris: {
			script: string,
			style: string,
			html: string,
		}) => {
			new AventusPeview().getPreview(context, uris.script);
		});
		client.onNotification("aventus/compiled", (buildName: string) => {
			let n = new Date();
			let h: number | string = n.getHours();
			if (h < 10) {
				h = '0' + h;
			}
			let m: number | string = n.getMinutes();
			if (m < 10) {
				m = '0' + m;
			}
			let s: number | string = n.getSeconds();
			if (s < 10) {
				s = '0' + s;
			}
			btn.text = "Aventus: Compiled at " + h + ":" + m + ":" + s;
		});
		client.onNotification("aventus/registerBuild", (builds: [string[], string]) => {
			allBuilds[builds[1]] = builds[0];
		});
		client.onNotification("aventus/unregisterBuild", (uri: string) => {
			delete allBuilds[uri];
		});
		client.onNotification("aventus/registerStatic", (statics: [string[], string]) => {
			allStatics[statics[1]] = statics[0];
		});
		client.onNotification("aventus/unregisterStatic", (uri: string) => {
			delete allStatics[uri];
		});
	});

	// Start the client. This will also launch the server
	context.subscriptions.push(client.start());



}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
