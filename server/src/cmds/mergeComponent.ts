import { ExecuteCommandParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { connectionWithClient, htmlMode, jsMode, scssMode, wcMode } from '../mode';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { pathFromCommandArguments, pathToUri, uriToPath } from '../modes/aventusJs/utils';
import * as aventusConfig from '../config';
import { unlinkSync, writeFileSync } from 'fs';

export class MergeComponent {
	static cmd: string = "aventus.component.merge";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[0]) {
			let fileUri: string = pathFromCommandArguments(params);
			let regex = new RegExp("(" + aventusExtension.ComponentLogic + ")|(" + aventusExtension.ComponentView + ")|(" + aventusExtension.ComponentView + ")$");
			let fileUriNoExtension = fileUri.replace(regex, '');

			let maxVersion = 0;
			let jsDoc = jsMode.getFile(fileUriNoExtension + aventusExtension.ComponentLogic);
			if (jsDoc.version > maxVersion) { maxVersion = jsDoc.version; }

			let cssDoc = scssMode.getFile(fileUriNoExtension + aventusExtension.ComponentStyle);
			if (cssDoc.version > maxVersion) { maxVersion = cssDoc.version; }

			let htmlDoc = htmlMode.getFile(fileUriNoExtension + aventusExtension.ComponentView);
			if (htmlDoc.version > maxVersion) { maxVersion = htmlDoc.version; }

			let mergeTxt =
				`
<script>
	${addTab(jsDoc.getText())}
</script>

<template>
	${addTab(htmlDoc.getText())}
</template>

<style>
	${addTab(cssDoc.getText())}
</style>
`;
			let compDoc = TextDocument.create(
				fileUriNoExtension + aventusExtension.Component,
				aventusConfig.languageIdWc,
				maxVersion + 1,
				mergeTxt
			);
			writeFileSync(uriToPath(compDoc.uri), mergeTxt);
			unlinkSync(uriToPath(cssDoc.uri));
			unlinkSync(uriToPath(jsDoc.uri));
			unlinkSync(uriToPath(htmlDoc.uri));

			scssMode.mustBeRemoved(cssDoc);
			jsMode.mustBeRemoved(jsDoc);
			htmlMode.mustBeRemoved(htmlDoc);

			wcMode.doValidation(compDoc, true);
			connectionWithClient?.sendNotification("aventus/openfile", compDoc.uri)
		}
	}
}

function addTab(text) {
	return text.split("\n").join("\n\t");
}