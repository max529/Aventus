import { ExecuteCommandParams } from 'vscode-languageserver';
import { pathToUri } from '../modes/aventusJs/utils';
import { connectionVs, jsMode, jsonMode } from '../server';

export class BuildProject {
	static cmd: string = "aventus.compile";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[0]) {
			let uri: string = pathToUri(params.arguments[0].detail);
			let name: string = params.arguments[0].label;
			jsMode.programManager.getProgram(uri, false).build(name);
		}
	}
}