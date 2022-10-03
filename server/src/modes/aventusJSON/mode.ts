import { normalize } from 'path';
import { CompletionItem, CompletionList, Diagnostic, getLanguageService, Hover, JSONDocument, JSONSchema, LanguageService, Position, TextDocument } from "vscode-json-languageservice";
import { CodeAction, Definition, FormattingOptions, Range, TextEdit, _, _Connection } from "vscode-languageserver";
import { jsMode, connectionWithClient } from '../../mode';
import { createErrorTs } from '../aventusJs/compiler/utils';
import { AventusConfig, AventusConfigStatic } from '../aventusJs/config';
import { getFolder, pathToUri, uriToPath } from '../aventusJs/utils';
import { configFileName } from '../../config';
import * as Chokidar from 'chokidar'

export class AventusJSONMode {
	schema: JSONSchema
	languageService: LanguageService
	private jsonSchemaUri = 'foo://aventus/conf.json';
	private configs: { [key: string]: AventusConfig } = {}
	private listFoundConfig: { [key: string]: TextDocument } = {}
	private activateReload: boolean = false;
	private listChokidar: { [key: string]: Chokidar.FSWatcher } = {}
	constructor() {
		this.schema = {
			"$schema": this.jsonSchemaUri,
			"title": "JSON Schema for Aventus",
			"description": "JSON Schema for Aventus",
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"build": {
					type: "array",
					items: {
						type: "object",
						properties: {
							"name": { type: "string" },
							"version": {
								type: "string",
								pattern: "^[0-9]+\.[0-9]+\.[0-9]+$"
							},
							"componentPrefix": {
								type: "string",
								description: "Identifier to prefix all your components (case sensitive)",
								minLength: 2
							},
							"inputPath": {
								type: "array",
								items: { type: "string" },
							},
							"noNamespacePath": {
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
										"libraryName": { type: "string" }
									},
									required: ["definition"]
								},
							},
							"namespace": { type: "string" }
						},
						required: ["name", "inputPath", "outputFile", "componentPrefix", "namespace"]
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
							"exportOnChange": { type: "boolean" },
							"colorsMap": {
								type: "object",
								description: "Color to map when transpile svg"
							}
						},
						required: ["name", "inputPath", "outputPath"]
					}
				}
			},
			"required": ["build"]
		}
		this.languageService = getLanguageService({
			schemaRequestService: async (uri) => {
				return JSON.stringify(this.schema);
			}
		})
		this.languageService.configure({ allowComments: false, schemas: [{ fileMatch: [configFileName], uri: this.jsonSchemaUri }] });
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
		connectionWithClient?.sendDiagnostics({ uri: document.uri, diagnostics: result });
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
			if (!build.hasOwnProperty("compileOnSave")) {
				build.compileOnSave = true;
			}
			// input
			for (let inputPath of build.inputPath) {
				let slash = "";
				if (!inputPath.startsWith("/")) {
					slash = "/";
				}
				let splitedInput = inputPath.split("/");
				if (splitedInput[splitedInput.length - 1] == "" || splitedInput[splitedInput.length - 1] == "*") {
					splitedInput[splitedInput.length - 1] = "*"
				}
				else if (splitedInput[splitedInput.length - 1].indexOf(".") == -1) {
					// its a folder but without end slash
					splitedInput.push("*");
				}
				inputPath = splitedInput.join("/");
				let regTemp = normalize(uriToPath(baseDir) + slash + inputPath).replace(/\\/g, '\\/').replace("*", ".*");
				regexs.push("(^" + regTemp + "$)");
			}
			let regexJoin = regexs.join("|");
			if (regexJoin == "") {
				regexJoin = "(?!)";
			}
			build.inputPathRegex = new RegExp(regexJoin);

			// output
			if (!build.outputFile.startsWith("/")) {
				build.outputFile = "/" + build.outputFile;
			}
			build.outputFile = normalize(uriToPath(baseDir) + build.outputFile);

			// no namespace
			if (build.noNamespacePath) {
				regexs = [];
				for (let noNamespacePath of build.noNamespacePath) {
					let slash = "";
					if (!noNamespacePath.startsWith("/")) {
						slash = "/";
					}
					let splitedInput = noNamespacePath.split("/");
					if (splitedInput[splitedInput.length - 1] == "" || splitedInput[splitedInput.length - 1] == "*") {
						splitedInput[splitedInput.length - 1] = "*"
					}
					else if (splitedInput[splitedInput.length - 1].indexOf(".") == -1) {
						// its a folder but without end slash
						splitedInput.push("*");
					}
					noNamespacePath = splitedInput.join("/");
					let regTemp = normalize(uriToPath(baseDir) + slash + noNamespacePath).replace(/\\/g, '\\/').replace("*", ".*");
					regexs.push("(^" + regTemp + "$)");
				}
				regexJoin = regexs.join("|");
				if (regexJoin == "") {
					regexJoin = "(?!)";
				}
				build.noNamespacePathRegex = new RegExp(regexJoin);
			}
		}
		if (config.static) {
			for (let _static of config.static) {
				statics.push(_static.name);
				this.prepareStatic(uri, _static);
			}
		}
		connectionWithClient?.sendNotification("aventus/registerBuild", [builds, uriToPath(uri)]);
		connectionWithClient?.sendNotification("aventus/registerStatic", [statics, uriToPath(uri)]);

	}
	private prepareStatic(configUri: string, _static: AventusConfigStatic) {
		let baseDir = getFolder(configUri);
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
		_static.outputPathFolder = _static.outputPathFolder.replace(/\\/g, '/');
		if (_static.hasOwnProperty("exportOnChange") && !_static.exportOnChange) {
			return;
		}
		if (!this.listChokidar[_static.inputPathFolder]) {
			let watcher = Chokidar.watch(_static.inputPathFolder, {
				ignored: /^\./,
				persistent: true,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 100
				},

			});
			watcher.on('add', function (path) {
				jsMode.programManager.getProgram(configUri, false).exportStatic(_static.name);
			})
			watcher.on('change', function (path) {
				jsMode.programManager.getProgram(configUri, false).exportStatic(_static.name);
			})
			watcher.on('unlink', function (path) {
				jsMode.programManager.getProgram(configUri, false).exportStatic(_static.name);
			})
			watcher.on('error', function (error) { })
			this.listChokidar[_static.outputPathFolder] = watcher;
		}
	}
}