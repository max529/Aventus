import { ExecuteCommandParams } from 'vscode-languageserver';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { pathFromCommandArguments, pathToUri } from '../modes/aventusJs/utils';
import { connectionWithClient } from '../mode';

export class PreviewComponent {
	static cmd: string = "aventus.preview";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments) {
			let scriptPath = pathFromCommandArguments(params);
			connectionWithClient?.sendNotification("aventus/openpreview", {
				script: scriptPath,
				style: scriptPath.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle),
				html: scriptPath.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentView),
			})
		}
	}
}