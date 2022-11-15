import { mkdirSync, writeFileSync } from 'fs';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EOL } from 'os';
import { getFolder, getPathFromCommandArguments, pathToUri, uriToPath } from '../tools';
import { AventusExtension, AventusLanguageId } from '../definition';
import { normalize } from 'path';
import { FilesManager } from '../FilesManager';
import { ProjectManager } from '../project/ProjectManager';
import { ClientConnection } from '../Connection';


export class Create {
	static cmd: string = "aventus.create";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments[2]) {
			let type = params.arguments[2].label;
			let baseFolder: string = getPathFromCommandArguments(params);
			if (type == "Init") {
				if (params.arguments[3]) {
					this.createInit(baseFolder + "/aventus.conf.json", params.arguments[3]);
				}
			}
			else {
				if (params.arguments[3]) {

					if (type == "RAM") {
						this.createRAM(params.arguments[3].label, params.arguments[3].detail, baseFolder);
					}
					else {
						let name: string = params.arguments[3];
						let format = "Multiple";
						if (params.arguments[4]) {
							format = params.arguments[4].label;
						}
						if (type == "Component") {
							this.createComponent(name, baseFolder, format == "Multiple");
						}
						else if (type == "Data") {
							this.createData(name, baseFolder);
						}
						else if (type == "Library") {
							this.createLib(name, baseFolder);
						}
					}
				}
			}
		}
	}

	private createInit(configUri: string, name: string) {
		let project = ProjectManager.getInstance().getProjectByUri(configUri)
		if (!project) {
			let configPath = uriToPath(configUri);
			let nameFile: string = name.replace(/ /g, "-");
			let baseFolder = uriToPath(getFolder(configUri));
			mkdirSync(baseFolder + "/dist");
			mkdirSync(baseFolder + "/src");
			mkdirSync(baseFolder + "/src/components");
			mkdirSync(baseFolder + "/src/data");
			mkdirSync(baseFolder + "/src/lib");
			mkdirSync(baseFolder + "/src/ram");
			mkdirSync(baseFolder + "/src/socket");
			let defaultConfig = `{
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
}`
			writeFileSync(configPath, defaultConfig);
			let textDocument: TextDocument = TextDocument.create(configUri, AventusLanguageId.TypeScript, 0, defaultConfig);
			FilesManager.getInstance().registerFile(textDocument);
			ClientConnection.getInstance().sendNotification("aventus/openfile", textDocument.uri)
		}
		else {
			ClientConnection.getInstance().showErrorMessage("A config file already exists");
		}
	}

	private createRAM(objectName: string, objectPath: string, baseFolderUri: string) {
		objectName = objectName.charAt(0).toUpperCase() + objectName.slice(1);
		let newScriptPath = uriToPath(baseFolderUri + "/" + objectName + AventusExtension.RAM);
		let newScriptUri = pathToUri(newScriptPath);
		let importPath = this.getImportPath(newScriptPath, objectPath);
		let classItemName = objectName + "RAMItem";
		let className = objectName + "RAM";

		let defaultRAM = `import { ${objectName} } from "${importPath}";

declare module "${importPath}" {
	export interface ${objectName} {
	// declare your functions here
	}
}

export class ${className} extends Aventus.GenericSocketRAMManager<${objectName}, ${classItemName}> implements Aventus.IRAMManager {

	static getInstance(): ${className} {
		return ${className}._getInstance<${className}>();
	}

	protected getObjectName(): string {
		return "${objectName}";
	}

	protected override addCustomFunctions(item: ${objectName} & Aventus.SocketRAMManagerObject<${objectName}>): Aventus.SocketRAMManagerItem<${objectName}> {
		// implement your functions here
		return item;
	}
}`;
		writeFileSync(newScriptPath, defaultRAM);
		let textDocument: TextDocument = TextDocument.create(newScriptUri, AventusLanguageId.TypeScript, 0, defaultRAM);
		FilesManager.getInstance().registerFile(textDocument);
		ClientConnection.getInstance().sendNotification("aventus/openfile", newScriptUri)
	}

	private createComponent(componentName: string, baseFolderUri: string, isMultiple: boolean) {
		let newFolderPath = uriToPath(baseFolderUri + "/" + componentName);
		componentName = componentName.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
		let firstUpperName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
		let className = firstUpperName;
		mkdirSync(newFolderPath);
		let newScriptPath = newFolderPath + "/" + componentName;
		if (isMultiple) {
			let defaultTs = `export class ${className} extends Aventus.WebComponent implements Aventus.DefaultComponent {

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
	
	}`
			writeFileSync(newScriptPath + AventusExtension.ComponentLogic, defaultTs);
			let textDocumentTs: TextDocument = TextDocument.create(pathToUri(newScriptPath + AventusExtension.ComponentLogic), AventusLanguageId.TypeScript, 0, defaultTs);

			let defaultSCSS = ":host {" + EOL + "\t" + EOL + "}" + EOL + "";
			writeFileSync(newScriptPath + AventusExtension.ComponentStyle, defaultSCSS);
			let textDocumentSCSS: TextDocument = TextDocument.create(pathToUri(newScriptPath + AventusExtension.ComponentStyle), AventusLanguageId.SCSS, 0, defaultSCSS);

			let defaultHTML = "<slot></slot>";
			writeFileSync(newScriptPath + AventusExtension.ComponentView, defaultHTML);
			let textDocumentHTML: TextDocument = TextDocument.create(pathToUri(newScriptPath + AventusExtension.ComponentView), AventusLanguageId.HTML, 0, defaultHTML);

			FilesManager.getInstance().registerFile(textDocumentHTML);
			FilesManager.getInstance().registerFile(textDocumentSCSS);
			FilesManager.getInstance().registerFile(textDocumentTs);

			ClientConnection.getInstance().sendNotification("aventus/openfile", textDocumentTs.uri)
		}
		else {
			let defaultWc = `<script>
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
`
			writeFileSync(newScriptPath + AventusExtension.Component, defaultWc);
			let textDocumentTs: TextDocument = TextDocument.create(pathToUri(newScriptPath + AventusExtension.Component), AventusLanguageId.WebComponent, 0, defaultWc);
			FilesManager.getInstance().registerFile(textDocumentTs);

			ClientConnection.getInstance().sendNotification("aventus/openfile", textDocumentTs.uri)
		}


	}

	private createData(dataName: string, baseFolderUri: string) {
		let newScriptPath = uriToPath(baseFolderUri + "/" + dataName + AventusExtension.Data);
		let newScriptUri = pathToUri(newScriptPath);
		dataName = dataName.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
		let firstUpperName = dataName.charAt(0).toUpperCase() + dataName.slice(1);
		let className = firstUpperName;
		let defaultTs = `export class ${className} implements Aventus.IData {${EOL}\tpublic id: number = 0;${EOL}}`
		writeFileSync(newScriptPath, defaultTs);
		let textDocument: TextDocument = TextDocument.create(newScriptUri, AventusLanguageId.TypeScript, 0, defaultTs);
		FilesManager.getInstance().registerFile(textDocument);
		ClientConnection.getInstance().sendNotification("aventus/openfile", textDocument.uri)
	}
	private createLib(libName: string, baseFolderUri: string) {
		let newScriptPath = uriToPath(baseFolderUri + "/" + libName + AventusExtension.Lib);
		let newScriptUri = pathToUri(newScriptPath);
		libName = libName.replace(/_|-([a-z])/g, (match, p1) => p1.toUpperCase());
		let firstUpperName = libName.charAt(0).toUpperCase() + libName.slice(1);
		let className = firstUpperName;
		let defaultTs = `export class ${className} {${EOL}\t${EOL}}`
		writeFileSync(newScriptPath, defaultTs);
		let textDocument: TextDocument = TextDocument.create(newScriptUri, AventusLanguageId.TypeScript, 0, defaultTs);
		FilesManager.getInstance().registerFile(textDocument);
		ClientConnection.getInstance().sendNotification("aventus/openfile", textDocument.uri)
	}



	//#region tools
	private getImportPath(fileSourcePath, fileToImportPath): string {
		let currentDirPath = normalize(fileSourcePath).split("\\");
		let importPath = normalize(fileToImportPath).split("\\");
		for (let i = 0; i < currentDirPath.length; i++) {
			if (importPath.length > i) {
				if (currentDirPath[i] == importPath[i]) {
					currentDirPath.splice(i, 1);
					importPath.splice(i, 1);
					i--;
				}
				else {
					break;
				}
			}
		}
		let finalPathToImport = "";
		for (let i = 0; i < currentDirPath.length - 1; i++) {
			finalPathToImport += '../';
		}
		if (finalPathToImport == "") {
			finalPathToImport += "./";
		}
		finalPathToImport += importPath.join("/");
		return finalPathToImport;
	}
	//#endregion
}