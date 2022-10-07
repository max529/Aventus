/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	CodeActionKind,
	InitializeParams,
	TextDocuments,
	TextDocumentSyncKind,
	WorkspaceFolder,
	_,
	_Connection
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusJSMode } from './modes/aventusJs/mode';
import { AventusJSONMode } from './modes/aventusJSON/mode';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs';
import { pathToUri, uriToPath } from './modes/aventusJs/utils';
import { PreviewComponent } from './cmds/previewComponent';
import { BuildProject } from './cmds/buildProject';
import { StaticExport } from './cmds/staticExport';
import { aventusExtension } from './modes/aventusJs/aventusDoc';
import { AventusHTMLMode } from './modes/aventusHTML/mode';
import { AventusSCSSMode } from './modes/aventusSCSS/mode';
import * as aventusConfig from './config';
import * as modes from './mode';
import { Create } from './cmds/create';
import { AventusWcMode } from './modes/aventusWc/mode';
import { MergeComponent } from './cmds/mergeComponent';
import { SplitComponent } from './cmds/splitComponent';


const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);


export async function init(uris: string[]) {
	let configFiles: TextDocument[] = [];
	let scriptFiles: TextDocument[] = [];
	let viewFiles: TextDocument[] = [];
	let styleFiles: TextDocument[] = [];
	let wcFiles: TextDocument[] = [];
	for (let i = 0; i < uris.length; i++) {
		let workspacePath = uriToPath(uris[i])
		let readWorkspace = (workspacePath) => {
			let folderContent = readdirSync(workspacePath);
			for (let i = 0; i < folderContent.length; i++) {
				let currentPath = workspacePath + '/' + folderContent[i];
				if (lstatSync(currentPath).isDirectory()) {
					if (folderContent[i] != "node_modules") {
						readWorkspace(currentPath);
					}
				} else {
					if (folderContent[i] == aventusConfig.configFileName) {
						configFiles.push(TextDocument.create(pathToUri(currentPath), aventusConfig.languageIdJs, 0, readFileSync(currentPath, 'utf8')));
					}
					else if (folderContent[i].endsWith(aventusExtension.ComponentView)) {
						viewFiles.push(TextDocument.create(pathToUri(currentPath), aventusConfig.languageIdHTML, 0, readFileSync(currentPath, 'utf8')));
					}
					else if (folderContent[i].endsWith(aventusExtension.ComponentStyle)) {
						styleFiles.push(TextDocument.create(pathToUri(currentPath), aventusConfig.languageIdSCSS, 0, readFileSync(currentPath, 'utf8')));
					}
					else if (folderContent[i].endsWith(aventusExtension.Component)) {
						wcFiles.push(TextDocument.create(pathToUri(currentPath), aventusConfig.languageIdWc, 0, readFileSync(currentPath, 'utf8')));
					}
					else if (folderContent[i].endsWith("." + aventusConfig.extension)) {
						scriptFiles.push(TextDocument.create(pathToUri(currentPath), aventusConfig.languageIdJs, 0, readFileSync(currentPath, 'utf8')));
					}
				}
			}
		}
		readWorkspace(workspacePath);
	}
	// check all config
	await modes.jsonMode.init(configFiles);
	await modes.jsMode.init(scriptFiles);
	modes.htmlMode.init(viewFiles);
	await modes.scssMode.init(styleFiles);
	await modes.wcMode.init(wcFiles);
	await modes.jsMode.programManager.resetProgram();
}

let Workspaces: WorkspaceFolder[] = [];
export async function restart() {
	let workspaces: string[] = [];
	for (let workspaceFolder of Workspaces) {
		workspaces.push(workspaceFolder.uri);
	}
	init(workspaces);
}

modes.connectionWithClient?.onInitialize((_params: InitializeParams) => {
	if (_params.workspaceFolders) {
		Workspaces = _params.workspaceFolders;
	}

	restart();

	documents.onDidClose(e => {
		if (!existsSync(uriToPath(e.document.uri))) {
			let mode = selectRightMode(e.document);
			mode?.mustBeRemoved(e.document);
		}
	});

	modes.connectionWithClient?.onShutdown(() => {
		modes.jsMode.dispose();
	});

	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true,
				// triggerCharacters: ['.'],
			},
			executeCommandProvider: {
				commands: [
					Create.cmd,
					PreviewComponent.cmd,
					BuildProject.cmd,
					StaticExport.cmd,
					MergeComponent.cmd,
					SplitComponent.cmd,
					"aventus.restart",
				]
			},
			hoverProvider: {

			},
			definitionProvider: {

			},
			documentFormattingProvider: {},
			codeActionProvider: {
				codeActionKinds: [CodeActionKind.QuickFix],
				resolveProvider: true,
			}
		}
	};
});

modes.connectionWithClient?.onDidChangeConfiguration(_change => {
	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

documents.onDidChangeContent(change => {
	validateTextDocumentTimer(change.document);
});

documents.onDidSave((change) => {
	doCompilation(change.document);
})


function selectRightMode(textDocument: TextDocument): AventusJSMode | AventusJSONMode | AventusHTMLMode | AventusWcMode | AventusSCSSMode | undefined {
	if (textDocument.uri.endsWith(aventusConfig.configFileName)) {
		return modes.jsonMode;
	}
	else if (textDocument.languageId == aventusConfig.languageIdHTML) {
		return modes.htmlMode;
	}
	else if (textDocument.languageId == aventusConfig.languageIdSCSS) {
		return modes.scssMode;
	}
	else if (textDocument.languageId == aventusConfig.languageIdWc) {
		return modes.wcMode;
	}
	else if (textDocument.languageId == aventusConfig.languageIdJs && !textDocument.uri.endsWith(aventusExtension.Definition)) {
		return modes.jsMode;
	}
	return undefined;
}

let timerValidation: { [key: string]: NodeJS.Timer } = {}
function validateTextDocumentTimer(textDocument: TextDocument) {
	if (timerValidation[textDocument.uri]) {
		clearTimeout(timerValidation[textDocument.uri]);
	}
	timerValidation[textDocument.uri] = setTimeout(() => {
		validateTextDocument(textDocument);
	}, 500)
}
async function validateTextDocument(textDocument: TextDocument) {
	try {
		const version = textDocument.version;
		if (textDocument.languageId.startsWith(aventusConfig.languageIdBase)) {
			const latestTextDocument = documents.get(textDocument.uri);
			if (latestTextDocument && latestTextDocument.version === version) {
				// check no new version has come in after in after the async op
				let mode = selectRightMode(textDocument);
				if (mode) {
					mode.doValidation(textDocument, true);
				}

				// connectionVs.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
			}
		}

	} catch (e) {
		modes.connectionWithClient?.console.error(`Error while validating ${textDocument.uri}`);
		modes.connectionWithClient?.console.error(String(e));
	}
}
async function doCompilation(textDocument: TextDocument) {
	try {
		const version = textDocument.version;
		if (textDocument.languageId.startsWith(aventusConfig.languageIdBase)) {
			const latestTextDocument = documents.get(textDocument.uri);
			if (latestTextDocument && latestTextDocument.version === version) {
				// check no new version has come in after in after the async op
				selectRightMode(textDocument)?.compile(textDocument);

			}
		}
	} catch (e) {
		modes.connectionWithClient?.console.error(`Error while validating ${textDocument.uri}`);
		modes.connectionWithClient?.console.error(String(e));
	}
}

modes.connectionWithClient?.onCompletion(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	if (document.languageId.startsWith(aventusConfig.languageIdBase)) {
		const mode = selectRightMode(document);
		if (mode) {
			let completionList = await mode.doComplete(document, textDocumentPosition.position)
			return completionList;
		}
	}
	else if (document.languageId == "html") {
		return modes.htmlMode.doComplete(document, textDocumentPosition.position);
	}
});
modes.connectionWithClient?.onCompletionResolve(async (completionItem, token) => {
	if (completionItem.data?.uri) {
		const document = documents.get(completionItem.data.uri);
		if (document) {
			const mode = selectRightMode(document);
			if (mode) {
				return mode.doResolve(completionItem);
			}
		}
	}
	return completionItem;
});
modes.connectionWithClient?.onHover(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		return mode.doHover(document, textDocumentPosition.position);
	}
	else if (document.languageId == "html") {
		return modes.htmlMode.doHover(document, textDocumentPosition.position);
	}
})

modes.connectionWithClient?.onDefinition(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		return mode.findDefinition(document, textDocumentPosition.position);
	}

})

modes.connectionWithClient?.onDocumentFormatting(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		let range = {
			start: document.positionAt(0),
			end: document.positionAt(document.getText().length)
		};
		return mode.format(document, range, textDocumentPosition.options);
	}
	return null;
})
modes.connectionWithClient?.onExecuteCommand(async (params) => {
	if (params.command == Create.cmd) {
		new Create(params);
	}
	else if (params.command == PreviewComponent.cmd) {
		new PreviewComponent(params);
	}
	else if (params.command == BuildProject.cmd) {
		new BuildProject(params);
	}
	else if (params.command == StaticExport.cmd) {
		new StaticExport(params);
	}
	else if (params.command == SplitComponent.cmd) {
		new SplitComponent(params);
	}
	else if (params.command == MergeComponent.cmd) {
		new MergeComponent(params);
	}
	else if (params.command == "aventus.restart") {
		restart();
	}
})
modes.connectionWithClient?.onCodeAction((params, token) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return [];
	}
	const mode = selectRightMode(document);
	if (mode) {
		return mode.doCodeAction(document, params.range);
	}
	return [];
})

if (modes.connectionWithClient) {
	// Make the text document manager listen on the connection
	// for open, change and close text document events
	documents.listen(modes.connectionWithClient);

	// Listen on the connection
	modes.connectionWithClient.listen();
}
