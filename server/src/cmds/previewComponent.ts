import { ExecuteCommandParams } from 'vscode-languageserver';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { pathToUri } from '../modes/aventusJs/utils';
import { connectionVs } from '../server';

export class PreviewComponent {
	static cmd: string = "aventus.preview";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments) {
			let scriptPath = params.arguments[0].external;
			connectionVs?.sendNotification("aventus/openpreview", {
				script: scriptPath,
				style: scriptPath.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle),
				html: scriptPath.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentView),
			})
		}
	}
}