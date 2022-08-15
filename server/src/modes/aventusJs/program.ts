import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { normalize, sep } from 'path';
import * as ts from 'typescript';
import { CodeAction, DiagnosticSeverity, WorkspaceEdit, Diagnostic, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as aventusConfig from '../../config';
import * as modes from '../../mode';
import { AventusDoc, aventusExtension, AventusType } from './aventusDoc';
import { AventusConfig, compilerOptions, completionOptions, formatingOptions } from './config';
import { convertRange, getFolder, pathToUri, simplifyPath, uriToPath } from './utils';
import {
	Range,
} from 'vscode-languageserver/node';
import { AVENTUS_DEF_BASE_PATH, loadLibrary } from '../libLoader';
const nodeSass = require('sass');
import * as cheerio from 'cheerio';
import { HTMLDoc, SCSSDoc } from './compiler/component/def';


const baseAventusEndPath = "/aventus/base/src";

export class AventusJSProgramManager {
	private dico: { [key: string]: AventusJSProgram } = {}
	private programs: AventusJSProgram[] = []
	private unknowProgram: AventusJSProgram


	constructor() {
		this.unknowProgram = new AventusJSProgram();
	}

	public getPrograms(): AventusJSProgram[] {
		return this.programs;
	}
	public getProgram(info: TextDocument | string, store: boolean = true): AventusJSProgram {
		let document: TextDocument;
		let uri: string;
		if ((info as TextDocument).uri !== undefined) {
			document = info as TextDocument;
		}
		else {
			let uriFile = (info as string);
			let pathFile = '';
			if (uriFile.startsWith("file:///")) {
				pathFile = uriToPath(uriFile);
			}
			else {
				pathFile = uriFile;
				uriFile = pathToUri(uriFile);
			}
			if (existsSync(pathFile)) {
				document = TextDocument.create(uriFile, aventusConfig.languageIdJs, 0, readFileSync(pathFile, 'utf8'))
			}
			else {
				document = TextDocument.create(uriFile, aventusConfig.languageIdJs, 0, '')
			}
		}
		uri = document.uri;
		if (this.dico[uri]) {
			return this.dico[uri];
		}
		for (let program of this.programs) {
			if (program.isInsideProgram(document, store)) {
				this.dico[uri] = program;
				return program;
			}
		}
		// do this to add in file list
		this.unknowProgram.isInsideProgram(document, store);
		return this.unknowProgram;
	}

	public removePrograms() {
		if (this.unknowProgram) {
			this.unknowProgram.remove();
		}
		for (let program of this.programs) {
			program.remove();
		}
		this.programs = [];
	}
	public async resetProgram() {
		this.removePrograms();
		this.unknowProgram = new AventusJSProgram();
		this.unknowProgram.init(undefined);

		let configs = modes.jsonMode.getConfigFiles();
		for (let config in configs) {
			await this.createProgram(configs[config]);
		}
		let files = modes.jsMode.getFiles();
		for (let file in files) {
			await this.getProgram(files[file]);
		}

		this.unknowProgram.generalRebuild();
		for (let program of this.programs) {
			await program.generalRebuild();
		}
	}
	public async createProgram(document: TextDocument): Promise<void> {
		let prog = new AventusJSProgram();
		await prog.init(document);
		this.programs.push(prog);
	}

	public dispose() {
		for (let program of this.programs) {
			program.getLanguageService().dispose();
		}
		this.removePrograms();
	}
}
export class AventusJSProgram {
	private configFile: TextDocument | undefined;
	private filesNeeded: string[] = ['custom://@types/luxon/index.d.ts'];
	private filesLoaded: { [key: string]: AventusDoc } = {};
	private baseDir = "";
	private enableBuild: boolean = true;
	public HTMLDoc: HTMLDoc = {};
	public SCSSDoc: SCSSDoc = {};

	private jsLanguageService: ts.LanguageService | undefined;

	public getBaseDir(): string {
		return this.baseDir;
	}

	public async init(configFile: TextDocument | undefined) {
		this.configFile = configFile;
		let loadAventusDef = true;
		if (this.configFile) {
			this.baseDir = getFolder(this.configFile.uri);
		}
		if (this.baseDir) {
			if (this.baseDir.endsWith(baseAventusEndPath)) {
				this.filesNeeded = [];
				loadAventusDef = false;
			}
		}
		if (loadAventusDef) {
			this.loadDef(AVENTUS_DEF_BASE_PATH);
		}
		this.createLangagueService();
	}
	private createLangagueService() {
		if (!this.jsLanguageService) {
			const host: ts.LanguageServiceHost = {
				getCompilationSettings: () => compilerOptions,
				getScriptFileNames: () => this.filesNeeded,
				getScriptKind: (fileName) => {
					return ts.ScriptKind.TS;
				},
				getScriptVersion: (fileName: string) => {
					if (this.filesLoaded[fileName]) {
						return String(this.filesLoaded[fileName].document.version);
					}
					return '1'; // default lib an jquery.d.ts are static
				},
				getScriptSnapshot: (fileName: string) => {
					let text = '';
					if (this.filesLoaded[fileName]) {
						text = this.filesLoaded[fileName].document.getText();
					} else {
						text = loadLibrary(fileName);
					}
					return {
						getText: (start, end) => text?.substring(start, end) || '',
						getLength: () => text?.length || 0,
						getChangeRange: () => undefined
					};
				},
				getCurrentDirectory: () => '',
				getDefaultLibFileName: (_options: ts.CompilerOptions) => 'es2022.full',
				readFile: (fileName: string, _encoding?: string | undefined): string | undefined => {
					if (this.filesLoaded[fileName]) {
						return this.filesLoaded[fileName].document.getText();
					} else {
						return loadLibrary(fileName);
					}
				},
				fileExists: (fileName: string): boolean => {
					if (this.filesLoaded[fileName]) {
						return true;
					} else {
						return !!loadLibrary(fileName);
					}
				},
				directoryExists: (path: string): boolean => {
					// typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
					// there's no node_modules in our setup
					if (path.startsWith('node_modules')) {
						return false;
					}
					return true;
				},
				resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, options, containingSourceFile?) {
					const resolvedModules: ts.ResolvedModule[] = [];
					for (const moduleName of moduleNames) {
						let result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, this)
						if (result.resolvedModule) {
							if (result.resolvedModule.resolvedFileName.endsWith(".avt.ts")) {
								result.resolvedModule.resolvedFileName = result.resolvedModule.resolvedFileName.replace(".avt.ts", ".avt");
							}
							resolvedModules.push(result.resolvedModule);
						}
						else {
							let temp: ts.ResolvedModuleFull = {
								extension: ts.Extension.Ts,
								resolvedFileName: moduleName,
							}
							resolvedModules.push(temp);
						}
					}
					return resolvedModules;
				},
			};

			this.jsLanguageService = ts.createLanguageService(host);
		}
		return this.jsLanguageService;
	}

	public getLanguageService(): ts.LanguageService {
		if (this.jsLanguageService) {
			return this.jsLanguageService;
		}
		return ts.createLanguageService({
			getCompilationSettings: () => compilerOptions,
			getScriptFileNames: () => [],
			getScriptKind: (fileName) => {
				return ts.ScriptKind.TS;
			},
			getScriptVersion: (fileName: string) => {
				if (this.filesLoaded[fileName]) {
					return String(this.filesLoaded[fileName].document.version);
				}
				return '1'; // default lib an jquery.d.ts are static
			},
			getScriptSnapshot: (fileName: string) => {
				let text = '';
				return {
					getText: (start, end) => text.substring(start, end),
					getLength: () => text.length,
					getChangeRange: () => undefined
				};
			},
			getCurrentDirectory: () => '',
			getDefaultLibFileName: (_options: ts.CompilerOptions) => '',
			readFile: (path: string, _encoding?: string | undefined): string | undefined => {
				return "";
			},
			fileExists: (path: string): boolean => {
				return false;
			},
			directoryExists: (path: string): boolean => {
				// typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
				// there's no node_modules in our setup
				if (path.startsWith('node_modules')) {
					return false;
				}
				return true;

			},

		});
	}

	public isInsideProgram(document: TextDocument, store: boolean, avoidDef: boolean = true): boolean {
		if (document.uri.indexOf(this.baseDir) != -1) {
			if (store) {
				if (this.filesNeeded.indexOf(document.uri) == -1) {
					let aventusDoc = new AventusDoc(document, this);
					if (avoidDef) {
						if (aventusDoc.getType() != AventusType.Definition) {
							this.filesNeeded.push(document.uri);
							this.filesLoaded[document.uri] = aventusDoc;
						}
					}
					else {
						this.filesNeeded.push(document.uri);
						this.filesLoaded[document.uri] = aventusDoc;
					}
				}
				else {
					if (this.filesLoaded[document.uri]) {
						this.filesLoaded[document.uri].document = document;
					}
					else {
						this.filesLoaded[document.uri] = new AventusDoc(document, this);
					}
				}
				// try to load manual definition
				if (!document.uri.endsWith(aventusExtension.Definition)) {
					let docPath = uriToPath(document.uri);
					for (let key in aventusExtension) {
						docPath = docPath.replace(aventusExtension[key], aventusExtension.Definition);
					}
					if (docPath.endsWith(aventusExtension.Definition) && existsSync(docPath)) {
						this.isInsideProgram(TextDocument.create(pathToUri(docPath), aventusConfig.languageIdJs, 0, readFileSync(docPath, 'utf8')), store, false);
					}
				}
			}
			return true;
		}
		return false;
	}
	public getDocument(uri: string): AventusDoc | undefined {
		return this.filesLoaded[uri];
	}
	public exportStatic(staticName: string) {
		let config = this.getConfig();
		if (config && config.static) {
			for (let _static of config.static) {
				if (_static.name != staticName) {
					continue;
				}
				const foundAll = (dir) => {
					var result: string[] = [];
					var recu = (dir) => {
						let content = readdirSync(dir);
						content.forEach(name => {
							let completePath = dir + '/' + name;
							if (lstatSync(completePath).isDirectory()) {
								// If it is another directory
								let files = recu(completePath);
								if (files.length > 0) {
									result.concat(files);
								}
							} else {
								result.push(completePath);
							}
						});
						return result;
					}
					result = recu(dir);
					return result;
				}
				const recuCheckColor = (el, name) => {
					for (var key in el.attribs) {
						if (el.attribs[key].startsWith('#')) {
							var color = el.attribs[key];
							if (_static.colorsMap && _static.colorsMap[color]) {
								el.attribs['class-' + key] = _static.colorsMap[color];
							} else {
								//console.error('unknow color ' + color + ' in file ' + name);
							}
						}
					}
					if (el.children) {
						for (var i = 0; i < el.children.length; i++) {
							recuCheckColor(el.children[i], name);
						}
					}
				}
				const copyFile = (pathFile, pathOut) => {
					pathOut = normalize(pathOut);
					let splitted = pathOut.split(sep);
					let filename = splitted.pop();
					let folder = splitted.join(sep);


					if (filename.endsWith(".scss")) {
						if (!filename.startsWith("_")) {
							if (!existsSync(folder)) {
								mkdirSync(folder, { recursive: true });
							}
							let style = nodeSass.compile(pathFile, {
								style: 'compressed',
							}).css.toString().trim();
							writeFileSync(pathOut.replace(".scss", ".css"), style);
						}
					}
					else if (filename.endsWith(".svg")) {
						let ctx = readFileSync(pathFile, 'utf8');
						let $ = cheerio.load(ctx);
						if (_static.colorsMap) {
							recuCheckColor($._root, pathFile);
						}
						let result = $('body').html();
						if (result == null) {
							result = "";
						}
						writeFileSync(pathOut, result);
					}
					else {
						if (!existsSync(folder)) {
							mkdirSync(folder, { recursive: true });
						}
						copyFileSync(pathFile, pathOut)
					}
				}
				let staticFiles = foundAll(_static.inputPathFolder);
				staticFiles.forEach(filePath => {
					filePath = filePath.replace(/\\/g, '/');
					let resultPath = filePath.replace(_static.inputPathFolder, _static.outputPathFolder)
					copyFile(filePath, resultPath);
				})
			}
		}

	}
	public build(buildName: string = "") {
		if (this.enableBuild) {
			let config = this.getConfig();
			let docUriByTypes: { [key: string]: string } = {}
			if (config) {
				let newHTMLDoc: HTMLDoc = {}
				let newSCSSDoc: SCSSDoc = {}
				for (let fileUri in this.filesLoaded) {
					let names = this.filesLoaded[fileUri].classNamesScript;
					for (let name of names) {
						docUriByTypes[name] = this.filesLoaded[fileUri].document.uri;
						if (this.filesLoaded[fileUri].getType() == AventusType.Component) {
							newHTMLDoc = {
								...newHTMLDoc,
								...this.filesLoaded[fileUri].HTMLDoc
							};
							newSCSSDoc = {
								...newSCSSDoc,
								...this.filesLoaded[fileUri].SCSSDoc
							}
						}
					}
				}
				if (JSON.stringify(newHTMLDoc) != JSON.stringify(this.HTMLDoc)) {
					this.HTMLDoc = newHTMLDoc;
					modes.htmlMode.reload();
				}
				if (JSON.stringify(newSCSSDoc) != JSON.stringify(this.SCSSDoc)) {
					this.SCSSDoc = newSCSSDoc;
					modes.scssMode.reload();
				}
				for (let build of config.build) {
					if (buildName != "") {
						if (build.name != buildName) {
							continue;
						}
					}
					let includesTxt: string[] = [];
					let libsTxt: string[] = [];
					let compsTxt: string[] = [];
					let dataTxt: string[] = [];
					let ramTxt: string[] = [];
					let libsTxtDoc: string[] = [];
					let compsTxtDoc: string[] = [];
					let dataTxtDoc: string[] = [];
					let ramTxtDoc: string[] = [];
					let classesNameScript: string[] = [];
					let classesNameDoc: string[] = [];
					if (build.inputPathRegex) {
						let documents: AventusDoc[] = [];
						let documentsUri: string[] = [];

						const _loadFileImport = (uri: string): number => {
							if (!this.filesLoaded[uri]) {
								return -1;
							}
							let currentDoc = this.filesLoaded[uri];
							let previousIndex = documentsUri.indexOf(uri);
							if (previousIndex != -1) {
								return previousIndex + 1;
							}


							let insertIndex = 0;
							for (let dependanceName of currentDoc.dependances) {
								if (docUriByTypes[dependanceName]) {
									let indexDep = _loadFileImport(docUriByTypes[dependanceName]);
									if (indexDep >= 0 && indexDep > insertIndex) {
										insertIndex = indexDep;
									}
								}
							}
							if (documentsUri.indexOf(uri) != -1) {
								console.log("double dependances found for " + uri);
								return -1;
							}
							documents.splice(insertIndex, 0, currentDoc);
							documentsUri.splice(insertIndex, 0, uri);
							return documents.length;

						}
						for (let fileUri in this.filesLoaded) {
							_loadFileImport(fileUri);
						}

						if (build.include) {
							for (let include of build.include) {
								if (include.src) {
									let pathToImport = include.src;
									if (include.src.startsWith(".")) {
										pathToImport = uriToPath(this.baseDir) + '/' + include.src;
									}
									let normalizePath = normalize(pathToImport);
									if (existsSync(normalizePath) && statSync(normalizePath).isFile()) {
										includesTxt.push(readFileSync(normalizePath, 'utf8'));
									}
								}
							}
						}
						for (let doc of documents) {
							if (doc.path.match(build.inputPathRegex)) {
								for (let className of doc.classNamesScript) {
									classesNameScript.push(className);
								}
								for (let className of doc.classNamesDoc) {
									classesNameDoc.push(className);
								}
								if (doc.getType() == AventusType.Component) {
									compsTxt.push(doc.getCompiledTxt())
									compsTxtDoc.push(doc.getDocTxt())
								}
								else if (doc.getType() == AventusType.Data) {
									dataTxt.push(doc.getCompiledTxt())
									dataTxtDoc.push(doc.getDocTxt())
								}
								else if (doc.getType() == AventusType.Lib) {
									libsTxt.push(doc.getCompiledTxt())
									libsTxtDoc.push(doc.getDocTxt())
								}
								else if (doc.getType() == AventusType.Static) {
									libsTxt.push(doc.getCompiledTxt())
									libsTxtDoc.push(doc.getDocTxt())
								}
								else if (doc.getType() == AventusType.RAM) {
									ramTxt.push(doc.getCompiledTxt())
									ramTxtDoc.push(doc.getDocTxt())
								}
							}
						}
					}

					let finalTxt = '';
					if (build.includeBase) {
						if (require.main) {
							finalTxt += loadLibrary("aventus");
						}
					}
					if (build.namespace) {
						finalTxt += "var " + build.namespace + ";(function (" + build.namespace + ") {"
					}
					finalTxt += includesTxt.join("\r\n") + "\r\n";
					finalTxt += libsTxt.join("\r\n") + "\r\n";
					finalTxt += dataTxt.join("\r\n") + "\r\n";
					finalTxt += ramTxt.join("\r\n") + "\r\n";
					finalTxt += compsTxt.join("\r\n") + "\r\n";
					finalTxt = finalTxt.trim();
					if (build.namespace) {
						finalTxt += "\r\n";
						for (let className of classesNameScript) {
							finalTxt += build.namespace + "." + className + "=" + className + ";\r\n";
						}
						finalTxt += "})(" + build.namespace + " || (" + build.namespace + " = {}));"
					}
					let folderPath = getFolder(build.outputFile.replace(/\\/g, "/"));
					if (!existsSync(folderPath)) {
						mkdirSync(folderPath, { recursive: true });
					}
					writeFileSync(build.outputFile, finalTxt);
					if (build.generateDefinition) {
						let finalDtxt = "";
						finalDtxt += libsTxtDoc.join("\r\n") + "\r\n";
						finalDtxt += dataTxtDoc.join("\r\n") + "\r\n";
						finalDtxt += ramTxtDoc.join("\r\n") + "\r\n";
						finalDtxt += compsTxtDoc.join("\r\n") + "\r\n";
						if (build.namespace) {
							finalDtxt = "export declare namespace " + build.namespace + "{\r\n" + finalDtxt.replace(/declare /g, '') + "}\r\n";
						}
						finalDtxt = "// region js //\r\n" + finalDtxt;
						finalDtxt += "// end region js //\r\n";
						finalDtxt += "// region css //\r\n";
						finalDtxt += JSON.stringify(this.SCSSDoc) + "\r\n";
						finalDtxt += "// end region css //\r\n";
						finalDtxt += "// region html //\r\n";
						finalDtxt += JSON.stringify(this.HTMLDoc) + "\r\n";
						finalDtxt += "// end region html //\r\n";
						writeFileSync(build.outputFile.replace(".js", ".def.avt"), finalDtxt);
					}

					modes.connectionWithClient?.sendNotification("aventus/compiled", build.name);
				}
			}
		}
	}
	public async compile(document: TextDocument) {
		let config = this.getConfig();
		if (config) {
			await this.doValidation(document);
			this.filesLoaded[document.uri]?.compile(config)
		}
	}
	public removeDocument(document: TextDocument) {
		let index = this.filesNeeded.indexOf(document.uri)
		if (index != -1) {
			this.filesNeeded.splice(index, 1);
			this.filesLoaded[document.uri].remove();
		}
		delete this.filesLoaded[document.uri];
		modes.connectionWithClient?.sendDiagnostics({ uri: document.uri, diagnostics: [] });
	}

	public async generalRebuild(): Promise<boolean> {
		this.enableBuild = false;
		let nb = 0;
		let uri = this.configFile?.uri || '';
		let config = modes.jsonMode.getConfig(uri);
		this.loadInclude();
		for (let file in this.filesLoaded) {
			nb += (await this.doValidation(this.filesLoaded[file].document)).length;
			if (config) {
				this.filesLoaded[file].compile(config);
			}
		}
		this.enableBuild = true;
		this.build();
		return nb == 0;
	}
	public getConfig(): AventusConfig | undefined {
		let uri = this.configFile?.uri || '';
		let config = modes.jsonMode.getConfig(uri);
		return config;
	}

	public async doValidation(document: TextDocument): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = []
		let tempDoc = new AventusDoc(document, this);
		if (tempDoc.getType() == AventusType.Definition) {
			if (this.filesLoaded[document.uri]) {
				this.filesLoaded[document.uri].document = document;
				this.filesLoaded[document.uri].hasError = false;
			}
		}
		else {
			if (this.filesLoaded[document.uri]) {
				this.filesLoaded[document.uri].document = document;
				if (this.filesLoaded[document.uri].getType() == AventusType.Static) {
					this.filesLoaded[document.uri].hasError = false;
					return [];
				}
				try {
					let config = this.getConfig();
					if (!config) {
						diagnostics.push({
							range: Range.create(document.positionAt(0), document.positionAt(document.getText().length)),
							severity: DiagnosticSeverity.Error,
							source: aventusConfig.languageIdJs,
							message: ts.flattenDiagnosticMessageText("No config file found for this component", '\n'),
						})

					}
					else {
						const languageService = this.getLanguageService();
						const syntaxDiagnostics: ts.Diagnostic[] = languageService.getSyntacticDiagnostics(document.uri);
						const semanticDiagnostics: ts.Diagnostic[] = languageService.getSemanticDiagnostics(document.uri);

						const compileError: Diagnostic[] = this.filesLoaded[document.uri].doValidation(config);

						diagnostics = syntaxDiagnostics.concat(semanticDiagnostics).map((diag: ts.Diagnostic): Diagnostic => {
							return {
								range: convertRange(document, diag),
								severity: DiagnosticSeverity.Error,
								source: aventusConfig.languageIdJs,
								message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
							};
						});
						diagnostics = diagnostics.concat(compileError);
					}
					let doc = this.getDocument(document.uri);
					if (doc) {
						if (diagnostics.length == 0) {
							doc.hasError = false;
						}
						else {
							doc.hasError = true;
						}
					}
					if (modes.connectionWithClient) {
						modes.connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics });
					}
					else if (diagnostics.length > 0) {
						console.log("---- Erreur ----");

						console.log("file : " + document.uri.replace(this.baseDir, ""));
						for (let diag of diagnostics) {
							console.log(diag.message);
						}
						console.log("---- Erreur Fin ----");
					}
				} catch (e) { console.error(e) }
			}
		}
		return diagnostics;
	}
	public async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		let languageService = this.getLanguageService();
		let result: CodeAction[] = [];
		const syntaxDiagnostics: ts.Diagnostic[] = languageService.getSyntacticDiagnostics(document.uri);
		const semanticDiagnostics: ts.Diagnostic[] = languageService.getSemanticDiagnostics(document.uri);
		let codes: number[] = [];
		for (let diag of syntaxDiagnostics) {
			codes.push(diag.code)
		}
		for (let diag of semanticDiagnostics) {
			codes.push(diag.code)
		}
		let actions: readonly ts.CodeFixAction[] = [];
		try {
			actions = languageService.getCodeFixesAtPosition(document.uri, document.offsetAt(range.start), document.offsetAt(range.end), codes, formatingOptions, completionOptions);
		} catch (e) {

		}
		for (let action of actions) {
			let changes: TextEdit[] = [];
			let workspaceEdit: WorkspaceEdit = {
				changes: {
					[document.uri]: changes
				}
			}
			for (let change of action.changes) {
				for (let textChange of change.textChanges) {
					if (action.description.startsWith("Add import from")) {
						textChange.newText = textChange.newText.replace(/'/g, '"');
						let newImport = /"(.*)"/g.exec(textChange.newText);
						if (newImport && newImport.length > 1) {
							let finalPath = simplifyPath(newImport[1], document.uri);
							action.description = "Add import from " + finalPath;
							textChange.newText = textChange.newText.replace(newImport[1], finalPath);
						}
					}
					changes.push({
						newText: textChange.newText,
						range: convertRange(document, textChange.span),
					})
				}
			}

			result.push({
				title: action.description,
				// command:action.commands,
				edit: workspaceEdit,
			})
		}
		return result;
	}

	public remove() {
		for (let uri in this.filesLoaded) {
			this.removeDocument(this.filesLoaded[uri].document);
		}
	}

	public loadInclude() {
		let config = this.getConfig();
		if (config) {
			for (let build of config.build) {
				if (build.include) {
					for (let includePath of build.include) {
						let pathToImport = includePath.definition;
						if (includePath.definition.startsWith(".")) {
							pathToImport = uriToPath(this.baseDir) + '/' + includePath.definition;
						}
						this.loadDef(pathToImport);
					}
				}
			}
		}
	}

	private loadDef(pathToImport: string) {
		pathToImport = normalize(pathToImport);
		let uriToImport = pathToUri(pathToImport.replace(/\\/g, '/'));
		if (existsSync(pathToImport) && statSync(pathToImport).isFile()) {
			let txtToImport = readFileSync(pathToImport, 'utf8')
			let jsToImport = /\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g.exec(txtToImport);
			if (jsToImport) {
				let document = TextDocument.create(uriToImport, aventusConfig.languageIdJs, 0, jsToImport[1]);
				if (this.filesNeeded.indexOf(document.uri) == -1) {
					this.filesNeeded.push(document.uri);
					this.filesLoaded[document.uri] = new AventusDoc(document, this);
				}
			}

			let cssToImport = /\/\/ region css \/\/((\s|\S)*)\/\/ end region css \/\//g.exec(txtToImport);
			if (cssToImport) {
				let cssContent = JSON.parse(cssToImport[1]);
				modes.scssMode.addDefinition(pathToImport, cssContent)
			}

			let htmlToImport = /\/\/ region html \/\/((\s|\S)*)\/\/ end region html \/\//g.exec(txtToImport);
			if (htmlToImport) {
				let htmlContent = JSON.parse(htmlToImport[1]);
				modes.htmlMode.addDefinition(pathToImport, htmlContent)
			}
		}
	}
}

