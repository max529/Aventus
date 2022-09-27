import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { connectionWithClient, htmlMode, jsMode, scssMode, wcMode } from '../mode';
import { getFolder, pathToUri, uriToPath } from '../modes/aventusJs/utils';
import * as aventusConfig from '../config';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';

export class SplitComponent {
	static cmd: string = "aventus.component.split";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[0]) {
			let fileUri: string = params.arguments[0].external;
			let filePath = uriToPath(fileUri);
			let doc = wcMode.getDocumentByUri(fileUri);
			if (doc) {
				let currentVersion = doc.document.version;
				let cssContent = reduceTab(doc.getSCSSInfo().text);
				let jsContent = reduceTab(doc.getSCSSInfo().text);
				let htmlContent = reduceTab(doc.getSCSSInfo().text);
				writeFileSync(filePath.replace(aventusExtension.Component, aventusExtension.ComponentStyle), cssContent);
				writeFileSync(filePath.replace(aventusExtension.Component, aventusExtension.ComponentLogic), jsContent);
				writeFileSync(filePath.replace(aventusExtension.Component, aventusExtension.ComponentView), htmlContent);
				wcMode.mustBeRemoved(doc.document);
				unlinkSync(filePath);
				let cssDoc = TextDocument.create(
					fileUri.replace(aventusExtension.Component, aventusExtension.ComponentStyle),
					aventusConfig.languageIdSCSS,
					currentVersion + 1,
					cssContent
				);
				let jsDoc = TextDocument.create(
					fileUri.replace(aventusExtension.Component, aventusExtension.ComponentLogic),
					aventusConfig.languageIdJs,
					currentVersion + 1,
					jsContent
				);
				let htmlDoc = TextDocument.create(
					fileUri.replace(aventusExtension.Component, aventusExtension.ComponentView),
					aventusConfig.languageIdHTML,
					currentVersion + 1,
					htmlContent
				);

				scssMode.doValidation(cssDoc, true);
				jsMode.doValidation(jsDoc, true);
				htmlMode.doValidation(htmlDoc, true);
				connectionWithClient?.sendNotification("aventus/openfile",jsDoc.uri)
			}
		}
	}
}
function reduceTab(text){
	return text.split("\n\t").join("\n").trim();
}