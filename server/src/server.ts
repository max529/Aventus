/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	CodeAction,
	CodeActionKind,
	Command,
	CompletionItem,
	CompletionList,
	createConnection,
	Diagnostic,
	FileChangeType,
	InitializeParams,
	Position,
	ProposedFeatures,
	Range,
	TextDocumentEdit,
	TextDocuments,
	TextDocumentSyncKind,
	TextEdit,
	WorkspaceFolder,
	_,
	_Connection
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusJSMode } from './modes/aventusJs/mode';
import { AventusJSONMode } from './modes/aventusJSON/mode';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { CreateComponent } from './cmds/createComponent';
import { pathToUri, uriToPath } from './modes/aventusJs/utils';
import { ConvertComponent } from './cmds/convertComponent';
import { PreviewComponent } from './cmds/previewComponent';
import { BuildProject } from './cmds/buildProject';
import { StaticExport } from './cmds/StaticExport';
import { aventusExtension } from './modes/aventusJs/aventusDoc';
import { AventusHTMLMode } from './modes/aventusHTML/mode';
import { AventusSCSSMode } from './modes/aventusSCSS/mode';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let ConnetionWithExtension: _Connection<_, _, _, _, _, _, _> | undefined = undefined;
if (!process.env["AVENTUS_CLI"]) {
	ConnetionWithExtension = createConnection(ProposedFeatures.all);
}
export const connectionVs: _Connection<_, _, _, _, _, _, _> | undefined = ConnetionWithExtension;
// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
export const aventusConfigFile = "aventus.conf.json";
export const languageIdBase = "Aventus";
export const languageIdJs = "Aventus Ts";
export const languageIdHTML = "Aventus HTML";
export const languageIdSCSS = "Aventus SCSS";
export const extension: string = "avt"


export let jsMode: AventusJSMode = new AventusJSMode();
export let jsonMode: AventusJSONMode = new AventusJSONMode();
export let htmlMode: AventusHTMLMode = new AventusHTMLMode();
export let scssMode: AventusSCSSMode = new AventusSCSSMode();

export async function init(uris: string[]) {
	let configFiles: TextDocument[] = [];
	let scriptFiles: TextDocument[] = [];
	let viewFiles: TextDocument[] = [];
	let styleFiles: TextDocument[] = [];
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
					if (folderContent[i] == aventusConfigFile) {
						configFiles.push(TextDocument.create(pathToUri(currentPath), languageIdJs, 0, readFileSync(currentPath, 'utf8')));
					}
					else if(folderContent[i].endsWith(aventusExtension.ComponentView)){
						viewFiles.push(TextDocument.create(pathToUri(currentPath), languageIdHTML, 0, readFileSync(currentPath, 'utf8')));
					}
					else if(folderContent[i].endsWith(aventusExtension.ComponentStyle)){
						styleFiles.push(TextDocument.create(pathToUri(currentPath), languageIdSCSS, 0, readFileSync(currentPath, 'utf8')));
					}
					else if (folderContent[i].endsWith("." + extension)) {
						scriptFiles.push(TextDocument.create(pathToUri(currentPath), languageIdJs, 0, readFileSync(currentPath, 'utf8')));
					}
				}
			}
		}
		readWorkspace(workspacePath);
	}
	// check all config
	await jsonMode.init(configFiles);
	await jsMode.init(scriptFiles);
	htmlMode.init(viewFiles);
	await scssMode.init(styleFiles);
	await jsMode.programManager.resetProgram();
}

let Workspaces: WorkspaceFolder[] = [];
export async function restart() {
	let workspaces: string[] = [];
	for (let workspaceFolder of Workspaces) {
		workspaces.push(workspaceFolder.uri);
	}
	init(workspaces);
}

connectionVs?.onInitialize((_params: InitializeParams) => {
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

	connectionVs.onShutdown(() => {
		jsMode.dispose();
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
					CreateComponent.cmd,
					ConvertComponent.cmd,
					PreviewComponent.cmd,
					BuildProject.cmd,
					StaticExport.cmd,
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

connectionVs?.onDidChangeConfiguration(_change => {
	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

documents.onDidChangeContent(change => {
	validateTextDocumentTimer(change.document);
});

documents.onDidSave((change) => {
	doCompilation(change.document);
})


function selectRightMode(textDocument: TextDocument): AventusJSMode | AventusJSONMode | AventusHTMLMode | AventusSCSSMode | undefined {
	if (textDocument.uri.endsWith(aventusConfigFile)) {
		return jsonMode;
	}
	else if(textDocument.languageId == languageIdHTML){
		return htmlMode;
	}
	else if(textDocument.languageId == languageIdSCSS){
		return scssMode;
	}
	else if (textDocument.languageId == languageIdJs && !textDocument.uri.endsWith(aventusExtension.Definition)) {
		return jsMode;
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
		if (textDocument.languageId.startsWith(languageIdBase)) {
			const latestTextDocument = documents.get(textDocument.uri);
			if (latestTextDocument && latestTextDocument.version === version) {
				// check no new version has come in after in after the async op
				let mode = selectRightMode(textDocument);
				if (mode) {
					mode.doValidation(textDocument);
				}

				// connectionVs.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
			}
		}

	} catch (e) {
		connectionVs?.console.error(`Error while validating ${textDocument.uri}`);
		connectionVs?.console.error(String(e));
	}
}
async function doCompilation(textDocument: TextDocument) {
	try {
		const version = textDocument.version;
		if (textDocument.languageId.startsWith(languageIdBase)) {
			const latestTextDocument = documents.get(textDocument.uri);
			if (latestTextDocument && latestTextDocument.version === version) {
				// check no new version has come in after in after the async op
				selectRightMode(textDocument)?.compile(textDocument);

			}
		}
	} catch (e) {
		connectionVs?.console.error(`Error while validating ${textDocument.uri}`);
		connectionVs?.console.error(String(e));
	}
}

connectionVs?.onCompletion(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	if (document.languageId.startsWith(languageIdBase)) {
		const mode = selectRightMode(document);
		if (mode) {
			return mode.doComplete(document, textDocumentPosition.position);
		}
	}
	else if(document.languageId == "html"){
		return htmlMode.doComplete(document, textDocumentPosition.position);
	}
});
connectionVs?.onCompletionResolve(async (completionItem, token) => {
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
connectionVs?.onHover(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		return mode.doHover(document, textDocumentPosition.position);
	}
	else if(document.languageId == "html"){
		return htmlMode.doHover(document, textDocumentPosition.position);
	}
})

connectionVs?.onDefinition(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		return mode.findDefinition(document, textDocumentPosition.position);
	}

})

connectionVs?.onDocumentFormatting(async (textDocumentPosition, token) => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = selectRightMode(document);
	if (mode) {
		let range = {
			start: document.positionAt(0),
			end: document.positionAt(document.getText().length - 1)
		};
		return mode.format(document, range, textDocumentPosition.options);
	}
	return null;
})
connectionVs?.onExecuteCommand(async (params) => {
	if (params.command == CreateComponent.cmd) {
		new CreateComponent(params);
	}
	else if (params.command == ConvertComponent.cmd) {
		new ConvertComponent(params);
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
	else if (params.command == "aventus.restart") {
		restart();
	}
})
connectionVs?.onCodeAction((params, token) => {
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

if (connectionVs) {
	// Make the text document manager listen on the connection
	// for open, change and close text document events
	documents.listen(connectionVs);

	// Listen on the connection
	connectionVs.listen();
}
