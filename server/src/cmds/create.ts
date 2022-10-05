import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { connectionWithClient, jsMode, jsonMode, wcMode } from '../mode';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { getImportPath, pathFromCommandArguments, pathToUri, uriToPath } from '../modes/aventusJs/utils';
import * as aventusConfig from '../config';
import * as modes from '../mode';
import { EOL } from 'os';


export class Create {
	static cmd: string = "aventus.create";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[2]) {
			let type = params.arguments[2].label;
			let baseFolder: string = pathFromCommandArguments(params);
			if (type == "Init") {
				if (params.arguments[3]) {
					baseFolder = uriToPath(baseFolder);
					const currentConfigPath: string = baseFolder + "/aventus.conf.json";
					let config = jsMode.programManager.getProgram(currentConfigPath, false).getConfig();
					if (!config) {
						let name: string = params.arguments[3];
						let nameFile: string = name.replace(/ /g, "-");
						mkdirSync(baseFolder + "/dist");
						mkdirSync(baseFolder + "/src");
						mkdirSync(baseFolder + "/src/components");
						mkdirSync(baseFolder + "/src/data");
						mkdirSync(baseFolder + "/src/lib");
						mkdirSync(baseFolder + "/src/ram");
						mkdirSync(baseFolder + "/src/socket");
						writeFileSync(currentConfigPath, `{
	"build": [
        {
            "name": "${name}",
			"namespace":"${name.replace(/ /g, "_")}",
			"componentPrefix": "av",
            "version": "0.0.1",
            "inputPath": [
                "./src/*"
            ],
            "outputFile": "./dist/${nameFile}.js",
            "generateDefinition": true,
            "includeBase": true
        }
    ]
}`);
						let textDocument:TextDocument = TextDocument.create(pathToUri(currentConfigPath), aventusConfig.languageIdJs, 0, readFileSync(currentConfigPath, 'utf8'));	
						modes.jsonMode.compile(textDocument);
						jsMode.programManager.createProgram(textDocument);
						connectionWithClient?.sendNotification("aventus/openfile", pathToUri(currentConfigPath))

					}
					else {
						connectionWithClient?.window.showErrorMessage("A config file already exists");
					}
				}
			}
			else {
				if (params.arguments[3]) {
					let config = jsMode.programManager.getProgram(baseFolder + "/temp.js", false).getConfig();
					if (config) {
						if (type == "RAM") {
							let nameObject = params.arguments[3].label.charAt(0).toUpperCase() + params.arguments[3].label.slice(1);
							let pathObject = params.arguments[3].detail;
							let newScriptPath = uriToPath(baseFolder + "/" + nameObject + aventusExtension.RAM);
							
							let importPath = getImportPath(newScriptPath, pathObject);
							let classActionName = nameObject + "RAMAction";
							let classItemName =  nameObject + "RAMItem";
							let className = nameObject + "RAM";
							writeFileSync(newScriptPath, `import { ${nameObject} } from "${importPath}";

declare module "${importPath}" {
	export interface ${nameObject} {
		// declare your functions here
	}
}

export class ${className} extends Aventus.GenericSocketRAMManager<${nameObject}, ${classItemName}> implements Aventus.IRAMManager {

	static getInstance(): ${className} {
		return ${className}._getInstance<${className}>();
	}

	protected getObjectName(): string {
		return "${nameObject}";
	}
	
	protected override addCustomFunctions(item: ${nameObject} & Aventus.SocketRAMManagerObject<${nameObject}>): Aventus.SocketRAMManagerItem<${nameObject}> {
        // implement your functions here
		return item;
    }
}`);
							jsMode.programManager.getProgram(newScriptPath);
							connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath))
						}
						else {
							let name: string = params.arguments[3];
							let format = "Multiple";
							if (params.arguments[4]) {
								format = params.arguments[4].label;
							}
							if (type == "Component") {
								let newFolderPath = uriToPath(baseFolder + "/" + name);
								let componentName = name;
								componentName = componentName.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
								let firstUpperName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
								let className = firstUpperName;
								mkdirSync(newFolderPath);
								let newScriptPath = newFolderPath + "/" + name;
								if (format == "Multiple") {
									writeFileSync(newScriptPath + aventusExtension.ComponentLogic, `export class ${className} extends Aventus.WebComponent implements Aventus.DefaultComponent {

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
									writeFileSync(newScriptPath + aventusExtension.ComponentStyle, ":host {" + EOL + "\t" + EOL + "}" + EOL + "");
									writeFileSync(newScriptPath + aventusExtension.ComponentView, "<slot></slot>");
									jsMode.programManager.getProgram(newScriptPath + aventusExtension.ComponentLogic);
									connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath + aventusExtension.ComponentLogic))
								}
								else {
									writeFileSync(newScriptPath + aventusExtension.Component, `<script>
	export class ${className} extends Aventus.WebComponent implements Aventus.DefaultComponent {

	}
</script>

<template>
	<slot></slot>
</template>

<style>
	:host {
		
	}

</style>
									`);
									// wcMode.doValidation()
									connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath + aventusExtension.Component))
								}


							}
							else if (type == "Data") {
								let newScriptPath = uriToPath(baseFolder + "/" + name + aventusExtension.Data);
								name = name.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
								let firstUpperName = name.charAt(0).toUpperCase() + name.slice(1);
								let className = firstUpperName;
								writeFileSync(newScriptPath, `export class ${className} implements Aventus.Data {${EOL}\tpublic id: number = 0;${EOL}}`);
								jsMode.programManager.getProgram(newScriptPath);
								connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath))
							}
							else if (type == "Library") {
								let newScriptPath = uriToPath(baseFolder + "/" + name + aventusExtension.Lib);
								name = name.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
								let firstUpperName = name.charAt(0).toUpperCase() + name.slice(1);
								let className = firstUpperName;
								writeFileSync(newScriptPath, `export class ${className} {${EOL}\t${EOL}}`);
								jsMode.programManager.getProgram(newScriptPath);
								connectionWithClient?.sendNotification("aventus/openfile", pathToUri(newScriptPath))
							}
						}

					}
					else {
						connectionWithClient?.window.showErrorMessage("Can't find a config file");
					}
				}
			}
		}
	}
}