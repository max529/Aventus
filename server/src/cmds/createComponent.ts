import { fstat, mkdirSync, writeFileSync } from 'fs';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { connectionWithClient, jsMode } from '../mode';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { pathToUri, uriToPath } from '../modes/aventusJs/utils';


export class CreateComponent {
	static cmd: string = "aventus.createComponent";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[2]) {
			let newFolder = params.arguments[0].external + "/" + params.arguments[2];
			let config = jsMode.programManager.getProgram(newFolder, false).getConfig();
			if (config) {
				let newFolderPath = uriToPath(newFolder);
				let componentName = params.arguments[2];
                componentName = componentName.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
                let className = config.identifier + params.arguments[2].charAt(0).toUpperCase() + componentName.slice(1);
				mkdirSync(newFolderPath);
				let newScriptPath = newFolderPath + "/" + params.arguments[2];
				writeFileSync(newScriptPath + aventusExtension.ComponentLogic, `export class ${className} extends WebComponent implements DefaultComponent {
	
	//#region static
			
	//#endregion
			
			
	//#region props
			
	//#endregion
			
			
	//#region variables
			
	//#endregion
			
			
	//#region states
			
	//#endregion
			
			
	//#region constructor
			
	//#endregion
			
			
	//#region methods
			
	//#endregion
			
}`);
				writeFileSync(newScriptPath + aventusExtension.ComponentStyle, ":host{\r\n\t\r\n}");
				writeFileSync(newScriptPath + aventusExtension.ComponentView, "<slot></slot>");

				jsMode.programManager.getProgram(newScriptPath + aventusExtension.ComponentLogic);
				connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath + aventusExtension.ComponentLogic))
			}
			else {
				connectionWithClient?.window.showErrorMessage("Can't found a config file");
			}


		}
	}
}