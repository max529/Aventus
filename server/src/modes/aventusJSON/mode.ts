import { existsSync, readFileSync } from 'fs';
import { normalize } from 'path';
import { CompletionItem, CompletionList, Diagnostic, getLanguageService, Hover, JSONDocument, JSONSchema, LanguageService, Position, TextDocument } from "vscode-json-languageservice";
import { CodeAction, Definition, FormattingOptions, Range, TextEdit, _, _Connection } from "vscode-languageserver";
import { aventusConfigFile, connectionVs, extension, jsMode } from '../../server';
import { createErrorTs } from '../aventusJs/compiler/utils';
import { AventusConfig } from '../aventusJs/config';
import { getFolder, uriToPath } from '../aventusJs/utils';

export class AventusJSONMode {
	schema: JSONSchema
	languageService: LanguageService
	private jsonSchemaUri = 'foo://aventus/conf.json';
	private configs: { [key: string]: AventusConfig } = {}
	private listFoundConfig: { [key: string]: TextDocument } = {}
	private activateReload: boolean = false
	constructor() {
		this.schema = {
			"$schema": this.jsonSchemaUri,
			"title": "JSON Schema for Aventus",
			"description": "JSON Schema for Aventus",
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"identifier": {
					type: "string",
					description: "Identifier to prefix all your components (case sensitive)",
					minLength: 2
				},
				"components": {
					type: "object",
					properties: {
						"disableIdentifier": { type: "boolean" }
					},
					required: ["disableIdentifier"]
				},
				"libs": {
					type: "object",
					properties: {
						"disableIdentifier": { type: "boolean" }
					},
					required: ["disableIdentifier"]
				},
				"data": {
					type: "object",
					properties: {
						"disableIdentifier": { type: "boolean" }
					},
					required: ["disableIdentifier"]
				},
				"ram": {
					type: "object",
					properties: {
						"disableIdentifier": { type: "boolean" }
					},
					required: ["disableIdentifier"]
				},
				"build": {
					type: "array",
					items: {
						type: "object",
						properties: {
							"name": { type: "string" },
							"inputPath": {
								type: "array",
								items: { type: "string" },
							},
							"outputFile": { type: "string" },
							"generateDefinition": { type: "boolean" },
							"compileOnSave": { type: "boolean" },
							"includeBase": { type: "boolean" },
							"include": {
								type: "array",
								items: {
									type: "object",
									properties: {
										"definition": { type: "string" },
										"src": { type: "string" },
									}
								},
								required: ["definition"]
							},
							"namespace": { type: "string" }
						},
						required: ["name", "inputPath", "outputFile"]
					},
					minItems: 1
				},
				"static": {
					type: "array",
					items: {
						type: "object",
						properties: {
							"name": { type: "string" },
							"inputPath": { type: "string" },
							"outputPath": { type: "string" },
							"colorsMap" : {
								type: "object",
								description:"Color to map when transpile svg"
							}
						},
						required: ["name", "inputPath", "outputPath"]
					}
				}
			},
			"required": ["identifier", "build"]
		}
		this.languageService = getLanguageService({
			schemaRequestService: async (uri) => {
				return JSON.stringify(this.schema);
			}
		})
		this.languageService.configure({ allowComments: false, schemas: [{ fileMatch: [aventusConfigFile], uri: this.jsonSchemaUri }] });
	}
	async init(files: TextDocument[]) {
		for (let file of files) {
			this.listFoundConfig[file.uri] = file
			await this.loadConfigFile(file);
		}
		this.activateReload = true;
	}

	async doValidation(document: TextDocument): Promise<Diagnostic[]> {
		let jsonDoc = this.languageService.parseJSONDocument(document);
		let result = await this.languageService.doValidation(document, jsonDoc, undefined, this.schema);
		connectionVs?.sendDiagnostics({ uri: document.uri, diagnostics: result });
		return result;
	}
	async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
		let jsonDoc = this.languageService.parseJSONDocument(document);
		let result = await this.languageService.doComplete(document, position, jsonDoc);
		if (result) {
			return result;
		}
		return { isIncomplete: false, items: [] };
	}
	async doResolve(item: CompletionItem): Promise<CompletionItem> {
		return await this.languageService.doResolve(item);
	}
	async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		return []
	}
	async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
		let jsonDoc = this.languageService.parseJSONDocument(document);
		return await this.languageService.doHover(document, position, jsonDoc);
	}
	async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
		return null;
	}
	async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
		return this.languageService.format(document, range, formatParams);
	}
	async loadConfigFile(document: TextDocument) {
		let result = await this.doValidation(document)
		if (result.length == 0) {
			let configTxt = document.getText();
			try {
				let resultConfig: AventusConfig = JSON.parse(configTxt);
				this.prepareConfigFile(document.uri, resultConfig);
				this.configs[document.uri] = resultConfig;
			}
			catch (e) {
				result.push(createErrorTs(document, "Can't parse the json"))
				delete this.configs[document.uri];
			}
		}
		else {
			delete this.configs[document.uri];
		}
	}
	async compile(document: TextDocument) {
		await this.loadConfigFile(document);

		// if new file => reload all
		if (!this.listFoundConfig[document.uri]) {
			this.listFoundConfig[document.uri] = document;
			if (this.activateReload) {
				jsMode.programManager.resetProgram();
			}
		}
		else {
			let program = jsMode.programManager.getProgram(document, false);
			program.generalRebuild()
		}
	}
	mustBeRemoved(document: TextDocument) {
		delete this.configs[document.uri];
		if (this.listFoundConfig[document.uri] != undefined) {
			delete this.listFoundConfig[document.uri];
			if (this.activateReload) {
				jsMode.programManager.resetProgram();
			}
		}
	}
	getConfig(uri: string): AventusConfig | undefined {
		return this.configs[uri];
	}
	getConfigFiles() {
		return this.listFoundConfig;
	}

	prepareConfigFile(uri: string, config: AventusConfig) {
		let baseDir = getFolder(uri);
		let builds: string[] = []
		let statics: string[] = []
		for (let build of config.build) {
			builds.push(build.name);
			let regexs: string[] = [];
			if(!build.hasOwnProperty("compileOnSave")){
				build.compileOnSave = true;
			}
			for (let inputPath of build.inputPath) {
				let slash = "";
				if (!inputPath.startsWith("/")) {
					slash = "/";
				}
				if (inputPath.endsWith("/")) {
					inputPath += "*"
				}
				let regTemp = normalize(uriToPath(baseDir) + slash + inputPath).replace(/\\/g, '\\/').replace("*", ".*");
				regexs.push("(^" + regTemp + "$)");
			}
			let regexJoin = regexs.join("|");
			if (regexJoin == "") {
				regexJoin = "(?!)";
			}
			build.inputPathRegex = new RegExp(regexJoin);
			if (!build.outputFile.startsWith("/")) {
				build.outputFile = "/" + build.outputFile;
			}
			build.outputFile = normalize(uriToPath(baseDir) + build.outputFile);
		}
		if (config.static) {
			for (let _static of config.static) {
				statics.push(_static.name);
				let slash = "";
				if (!_static.inputPath.startsWith("/")) {
					slash = "/";
				}
				_static.inputPathFolder = normalize(uriToPath(baseDir) + slash + _static.inputPath);
				_static.inputPathFolder = _static.inputPathFolder.replace(/\\/g, '/')

				slash = "";
				if (!_static.outputPath.startsWith("/")) {
					slash = "/";
				}
				_static.outputPathFolder = normalize(uriToPath(baseDir) + slash + _static.outputPath);
				_static.outputPathFolder = _static.outputPathFolder.replace(/\\/g, '/')
			}
		}
		connectionVs?.sendNotification("aventus/registerBuild", [builds, uriToPath(uri)]);
		connectionVs?.sendNotification("aventus/registerStatic", [statics, uriToPath(uri)]);

	}
}