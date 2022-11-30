import { readFileSync, writeFileSync } from 'fs';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { ClientConnection } from '../Connection';
import { AventusConfig } from '../language-services/json/definition';
import { uriToPath } from '../tools';



export class AddConfigSection {
	static cmd: string = "aventus.addConfigSection";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments.length > 1) {
			let uri = params.arguments[0];
			let name: string = params.arguments[1];
			let jsonContent = readFileSync(uriToPath(uri), 'utf8');
			let config: AventusConfig = JSON.parse(jsonContent);
			let nameFile: string = name.replace(/ /g, "-");
			let version = "0.0.1";
			let componentPrefix = "av";
			if (config.build.length > 0) {
				version = config.build[0].version;
				componentPrefix = config.build[0].componentPrefix;
			}

			let newBuild: any = {
				"name": name,
				"inputPath": [],
				"outputFile": "./dist/" + nameFile + ".js",
			}

			config.build.push(newBuild);
			writeFileSync(uriToPath(uri), JSON.stringify(config, null, 4))
			ClientConnection.getInstance().sendNotification("aventus/openfile", uri)
		}
	}
}