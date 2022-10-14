import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { normalize, sep } from 'path';
import * as ts from 'typescript';
import { CodeAction, DiagnosticSeverity, WorkspaceEdit, Diagnostic, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as aventusConfig from '../../config';
import * as modes from '../../mode';
import { AventusDoc, aventusExtension, AventusType } from './aventusDoc';
import { AventusConfig, AventusConfigBuild, compilerOptions, completionOptions, formatingOptions } from './config';
import { convertRange, getFolder, getSectionEnd, getSectionStart, pathToUri, simplifyPath, uriToPath } from './utils';
import {
	Range,
} from 'vscode-languageserver/node';
import { AVENTUS_DEF_BASE_PATH, loadLibrary } from '../libLoader';
const nodeSass = require('sass');
import * as cheerio from 'cheerio';
import { HTMLDoc, SCSSDoc } from './compiler/component/def';
import { ClassModel } from '../../ts-file-parser';
import { connectionWithClient } from '../../mode';
import { EOL } from 'os';
import { parseDocument } from '../../ts-file-parser/src/tsStructureParser';
import { createErrorTs } from './compiler/utils';


const baseAventusEndPath = "/aventus/base/src";

export class AventusJSProgramManager {
	private dico: { [key: string]: AventusJSProgram } = {}
	private programs: AventusJSProgram[] = []
	private errorProgram: AventusJSProgram;

	constructor() {
		this.errorProgram = new AventusJSProgram("", {
			build: []
		})
	}

	public getPrograms(): AventusJSProgram[] {
		return this.programs;
	}
	public getProgram(document: TextDocument): AventusJSProgram {
		let uri: string = document.uri;
		if (this.dico[uri]) {
			return this.dico[uri];
		}
		for (let program of this.programs) {
			if (program.containsDocument(document)) {
				this.dico[uri] = program;
				return program;
			}
		}
		return this.errorProgram;
	}

	public removePrograms() {
		for (let program of this.programs) {
			program.remove();
		}
		this.programs = [];
	}
	public async resetProgram() {
		this.removePrograms();

		let configs = modes.jsonMode.getConfigs();
		for (let uri in configs) {
			await this.createProgram(uri, configs[uri]);
		}
		let files = modes.jsMode.getFiles();
		for (let file in files) {
			await this.getProgram(files[file]);
		}

	}
	public async createProgram(uri: string, config: AventusConfig): Promise<void> {
		let prog = new AventusJSProgram(uri, config);
		await prog.init(configFile);
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

	private enableBuild: boolean = true;
	public HTMLDoc: HTMLDoc = {};
	public SCSSDoc: SCSSDoc = {};
	private TSDefClass: { [key: string]: ClassModel } = {};
	public isUnknowProgram: boolean = false;

	public configFile: AventusConfig;
	public baseDir = "";
	public isCoreDev: boolean = false;
	private filesNeeded: string[] = [];

	public filesLoaded: { [key: string]: AventusDoc } = {};
	private builds: AventusJSBuild[] = [];


	public getBaseDir(): string {
		return this.baseDir;
	}

	public constructor(uri: string, config: AventusConfig) {
		this.configFile = config;
		this.baseDir = getFolder(uri);

		if (this.baseDir.toLowerCase().endsWith(baseAventusEndPath)) {
			this.isCoreDev = true;
		}

		let files = modes.jsMode.getFiles();
		for (let uri in files) {
			if (uri.indexOf(this.baseDir) != -1) {
				this.filesLoaded[uri] = new AventusDoc(files[uri])
			}
		}

		for (let build of config.build) {
			this.builds.push(new AventusJSBuild(build, this));
		}


	}
	public containsDocument(document: TextDocument): boolean {
		if (document.uri.indexOf(this.baseDir) != -1) {
			if (this.filesLoaded.hasOwnProperty(document.uri)) {
				this.filesLoaded[document.uri].document = document;
			}
			else {
				this.filesLoaded[document.uri] = new AventusDoc(document);
				for (let build of this.builds) {
					build.containsFile(document);
				}
			}
			return true;
		}
		return false;
	}
	public refreshDocument(document: TextDocument): void {
		let tempDoc = new AventusDoc(document);
		if (tempDoc.getType() == AventusType.Definition) {
			if (this.filesLoaded[document.uri]) {
				this.filesLoaded[document.uri].document = document;
				this.filesLoaded[document.uri].hasError = false;
			}
		}
		else {
			if (this.filesLoaded[document.uri]) {
				this.filesLoaded[document.uri].document = document;
			}
		}
	}
	public async doValidation(document: TextDocument, sendDiagnostic: boolean, virtualDoc: boolean = false): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = []
		this.refreshDocument(document);
		let buildNamesFound: string[] = [];
		for (let build of this.builds) {
			if (build.containsFile(document)) {
				buildNamesFound.push(build.name);
				diagnostics = await build.doValidation(document, sendDiagnostic, virtualDoc);
			}
		}
		if (buildNamesFound.length == 0) {
			diagnostics = [createErrorTs(document, 'The file ' + uriToPath(document.uri) + " is never used by any build. Delete this file or change your config.")];
		}
		else if (buildNamesFound.length > 1) {
			diagnostics = [createErrorTs(document, 'The file ' + uriToPath(document.uri) + " is used inside builds :" + buildNamesFound.join(", ") + ". Only one build is allowed.")];
		}

		return diagnostics;
	}
	public async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		this.refreshDocument(document);
		for (let build of this.builds) {
			if (build.containsFile(document)) {
				return await build.doCodeAction(document, range);
			}
		}
		return [];
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
					let libsTxtNoName: string[] = [];
					let compsTxt: string[] = [];
					let compsTxtNoName: string[] = [];
					let dataTxt: string[] = [];
					let dataTxtNoName: string[] = [];
					let ramTxt: string[] = [];
					let ramTxtNoName: string[] = [];
					let socketTxt: string[] = [];
					let socketTxtNoName: string[] = [];
					let libsTxtDoc: string[] = [];
					let libsTxtDocNoName: string[] = [];
					let compsTxtDoc: string[] = [];
					let compsTxtDocNoName: string[] = [];
					let dataTxtDoc: string[] = [];
					let dataTxtDocNoName: string[] = [];
					let ramTxtDoc: string[] = [];
					let ramTxtDocNoName: string[] = [];
					let socketTxtDoc: string[] = [];
					let socketTxtDocNoName: string[] = [];
					let classesNameScript: string[] = [];
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
									if (docUriByTypes[dependanceName] != uri) {
										let indexDep = _loadFileImport(docUriByTypes[dependanceName]);
										if (indexDep >= 0 && indexDep > insertIndex) {
											insertIndex = indexDep;
										}
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
								else if (doc.getType() == AventusType.Socket) {
									socketTxt.push(doc.getCompiledTxt())
									socketTxtDoc.push(doc.getDocTxt())
								}
							}
							if (build.noNamespacePathRegex) {
								if (doc.path.match(build.noNamespacePathRegex)) {
									if (doc.getType() == AventusType.Component) {
										compsTxtNoName.push(doc.getCompiledTxt())
										compsTxtDocNoName.push(doc.getDocTxt())
									}
									else if (doc.getType() == AventusType.Data) {
										dataTxtNoName.push(doc.getCompiledTxt())
										dataTxtDocNoName.push(doc.getDocTxt())
									}
									else if (doc.getType() == AventusType.Lib) {
										libsTxtNoName.push(doc.getCompiledTxt())
										libsTxtDocNoName.push(doc.getDocTxt())
									}
									else if (doc.getType() == AventusType.Static) {
										libsTxtNoName.push(doc.getCompiledTxt())
										libsTxtDocNoName.push(doc.getDocTxt())
									}
									else if (doc.getType() == AventusType.RAM) {
										ramTxtNoName.push(doc.getCompiledTxt())
										ramTxtDocNoName.push(doc.getDocTxt())
									}
									else if (doc.getType() == AventusType.Socket) {
										socketTxtNoName.push(doc.getCompiledTxt())
										socketTxtDocNoName.push(doc.getDocTxt())
									}
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
						finalTxt += "var " + build.namespace + ";(function (" + build.namespace + ") {\r\n var namespace = '" + build.namespace + "';"
					}
					finalTxt += includesTxt.join(EOL) + EOL;
					finalTxt += libsTxt.join(EOL) + EOL;
					finalTxt += dataTxt.join(EOL) + EOL;
					finalTxt += ramTxt.join(EOL) + EOL;
					finalTxt += socketTxt.join(EOL) + EOL;
					finalTxt += compsTxt.join(EOL) + EOL;
					finalTxt = finalTxt.trim() + EOL;
					if (build.namespace) {
						for (let className of classesNameScript) {
							if (className != "") {
								finalTxt += build.namespace + "." + className + "=" + className + ";" + EOL;
							}
						}
						finalTxt += "})(" + build.namespace + " || (" + build.namespace + " = {}));" + EOL;
					}
					finalTxt += libsTxtNoName.join(EOL) + EOL;
					finalTxt += dataTxtNoName.join(EOL) + EOL;
					finalTxt += ramTxtNoName.join(EOL) + EOL;
					finalTxt += socketTxtNoName.join(EOL) + EOL;
					finalTxt += compsTxtNoName.join(EOL) + EOL;
					finalTxt = finalTxt.trim() + EOL;



					let folderPath = getFolder(build.outputFile.replace(/\\/g, "/"));
					if (!existsSync(folderPath)) {
						mkdirSync(folderPath, { recursive: true });
					}
					writeFileSync(build.outputFile, finalTxt);

					if (build.generateDefinition) {
						let finalDtxt = "";
						finalDtxt += libsTxtDoc.join(EOL) + EOL;
						finalDtxt += dataTxtDoc.join(EOL) + EOL;
						finalDtxt += ramTxtDoc.join(EOL) + EOL;
						finalDtxt += socketTxtDoc.join(EOL) + EOL;
						finalDtxt += compsTxtDoc.join(EOL) + EOL;
						if (build.namespace) {
							finalDtxt = "declare namespace " + build.namespace + "{" + EOL + finalDtxt.replace(/declare /g, '') + "}" + EOL;
						}
						finalDtxt += libsTxtDocNoName.join(EOL) + EOL;
						finalDtxt += dataTxtDocNoName.join(EOL) + EOL;
						finalDtxt += ramTxtDocNoName.join(EOL) + EOL;
						finalDtxt += socketTxtDocNoName.join(EOL) + EOL;
						finalDtxt += compsTxtDocNoName.join(EOL) + EOL;
						finalDtxt = "// version " + build.version + EOL + "// region js //" + EOL + finalDtxt;
						finalDtxt += "// end region js //" + EOL;
						finalDtxt += "// region css //" + EOL;
						finalDtxt += JSON.stringify(this.SCSSDoc) + EOL;
						finalDtxt += "// end region css //" + EOL;
						finalDtxt += "// region html //" + EOL;
						finalDtxt += JSON.stringify(this.HTMLDoc) + EOL;
						finalDtxt += "// end region html //" + EOL;
						writeFileSync(build.outputFile.replace(".js", ".def.avt"), finalDtxt);
					}

					modes.connectionWithClient?.sendNotification("aventus/compiled", build.name);
				}
			}
		}
	}
	public async compile(document: TextDocument, virtualDoc: boolean = false) {
		let config = this.getConfig();
		if (config) {
			await this.doValidation(document, true, virtualDoc);
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
			nb += (await this.doValidation(this.filesLoaded[file].document, true)).length;
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


	public tryGetClassInDef(name: string): ClassModel | undefined {
		if (this.TSDefClass[name]) {
			return this.TSDefClass[name];
		}
		return undefined;
	}
	private loadDef(pathToImport: string) {
		// TODO add import from web
		pathToImport = normalize(pathToImport);
		let uriToImport = pathToUri(pathToImport.replace(/\\/g, '/'));
		if (existsSync(pathToImport) && statSync(pathToImport).isFile()) {
			let txtToImport = readFileSync(pathToImport, 'utf8')
			let jsToImport = /\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g.exec(txtToImport);
			if (jsToImport) {
				let document = TextDocument.create(uriToImport, aventusConfig.languageIdJs, 0, jsToImport[1]);
				if (this.filesNeeded.indexOf(document.uri) == -1) {
					modes.jsMode.addFile(document);
					this.filesNeeded.push(document.uri);
					this.filesLoaded[document.uri] = new AventusDoc(document, this);

					try {
						let structJs = parseDocument(document);
						structJs.classes.forEach(classInfo => {
							// Check if classInfo implements DefaultComponent
							let foundDefaultComponent = false;
							for (let implement of classInfo.implements) {
								if (implement.typeName == 'DefaultComponent' || implement.typeName == 'Aventus.DefaultComponent') {
									foundDefaultComponent = true;
									break;
								}
							}

							if (foundDefaultComponent) {
								let name = classInfo.name;
								if (classInfo.moduleName != "") {
									name = classInfo.moduleName + "." + name;
								}
								this.TSDefClass[name] = classInfo;
							}
						});
					} catch {
						let splitted = uriToImport.split("/");
						let fileName = splitted[splitted.length - 1];
						connectionWithClient?.window.showErrorMessage("There is an error inside file :" + fileName);
					}
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
		else {
			console.log("can't found " + pathToImport);
		}
	}
}
export class AventusJSBuild {
	public configBuild: AventusConfigBuild;
	private jsLanguageService: ts.LanguageService;
	private filesNeededGeneral: string[] = [];
	private filesNeededNamespace: string[] = [];
	private filesNeededNoNamespace: string[] = [];
	private program: AventusJSProgram;
	public name: string;

	public constructor(configBuild: AventusConfigBuild, program: AventusJSProgram) {
		this.program = program;
		this.configBuild = configBuild;
		const host: ts.LanguageServiceHost = {
			getCompilationSettings: () => compilerOptions,
			getScriptFileNames: () => this.filesNeededGeneral,
			getScriptKind: (fileName) => {
				return ts.ScriptKind.TS;
			},
			getScriptVersion: (fileName: string) => {
				if (program.filesLoaded[fileName]) {
					return String(program.filesLoaded[fileName].document.version);
				}
				return '1'; // default lib an jquery.d.ts are static
			},
			getScriptSnapshot: (fileName: string) => {
				let text = '';
				if (program.filesLoaded[fileName]) {
					text = program.filesLoaded[fileName].document.getText();
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
				if (program.filesLoaded[fileName]) {
					return program.filesLoaded[fileName].document.getText();
				} else {
					return loadLibrary(fileName);
				}
			},
			fileExists: (fileName: string): boolean => {
				if (program.filesLoaded[fileName]) {
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
		this.name = configBuild.name;
		if (configBuild.inputPathRegex) {
			for (let uri in program.filesLoaded) {
				if (program.filesLoaded[uri].path.match(configBuild.inputPathRegex)) {
					if (this.filesNeededGeneral.indexOf(uri) == -1) {
						this.filesNeededGeneral.push(uri)
					}
					if (this.filesNeededNamespace.indexOf(uri) == -1) {
						this.filesNeededNamespace.push(uri)
					}
				}
			}
		}
		if (configBuild.noNamespacePathRegex) {
			for (let uri in program.filesLoaded) {
				if (program.filesLoaded[uri].path.match(configBuild.noNamespacePathRegex)) {
					if (this.filesNeededGeneral.indexOf(uri) == -1) {
						this.filesNeededGeneral.push(uri)
					}
					if (this.filesNeededNoNamespace.indexOf(uri) == -1) {
						this.filesNeededNoNamespace.push(uri)
					}
				}
			}
		}
		this.jsLanguageService = ts.createLanguageService(host);
	}

	public build() {
		//#region def variables
		let includesTxt: string[] = [];
		let libsTxt: string[] = [];
		let libsTxtNoName: string[] = [];
		let compsTxt: string[] = [];
		let compsTxtNoName: string[] = [];
		let dataTxt: string[] = [];
		let dataTxtNoName: string[] = [];
		let ramTxt: string[] = [];
		let ramTxtNoName: string[] = [];
		let socketTxt: string[] = [];
		let socketTxtNoName: string[] = [];
		let libsTxtDoc: string[] = [];
		let libsTxtDocNoName: string[] = [];
		let compsTxtDoc: string[] = [];
		let compsTxtDocNoName: string[] = [];
		let dataTxtDoc: string[] = [];
		let dataTxtDocNoName: string[] = [];
		let ramTxtDoc: string[] = [];
		let ramTxtDocNoName: string[] = [];
		let socketTxtDoc: string[] = [];
		let socketTxtDocNoName: string[] = [];
		let classesNameScript: string[] = [];
		let documents: AventusDoc[] = [];
		let documentsUri: string[] = [];

		let docUriByTypes: { [key: string]: string } = {};
		let scssDoc: SCSSDoc = {};
		let htmlDoc: HTMLDoc = {};
		//#endregion

		const _loadFileImport = (uri: string): number => {
			if (this.filesNeededGeneral.indexOf(uri) == -1) {
				return -1;
			}
			let currentDoc = this.program.filesLoaded[uri];
			let previousIndex = documentsUri.indexOf(uri);
			if (previousIndex != -1) {
				return previousIndex + 1;
			}


			let insertIndex = 0;
			for (let dependanceName of currentDoc.dependances) {
				if (docUriByTypes[dependanceName]) {
					if (docUriByTypes[dependanceName] != uri) {
						let indexDep = _loadFileImport(docUriByTypes[dependanceName]);
						if (indexDep >= 0 && indexDep > insertIndex) {
							insertIndex = indexDep;
						}
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
		for (let fileUri in this.filesNeededGeneral) {
			_loadFileImport(fileUri);
		}

		if (this.configBuild.include) {
			for (let include of this.configBuild.include) {
				if (include.src) {
					let pathToImport = include.src;
					if (include.src.startsWith(".")) {
						pathToImport = uriToPath(this.program.baseDir) + '/' + include.src;
					}
					let normalizePath = normalize(pathToImport);
					if (existsSync(normalizePath) && statSync(normalizePath).isFile()) {
						includesTxt.push(readFileSync(normalizePath, 'utf8'));
					}
				}
			}
		}
		for (let doc of documents) {
			let varTxtToUse: undefined | string[] = undefined;
			let varDocToUse: undefined | string[] = undefined;

			if (this.filesNeededNamespace.indexOf(doc.document.uri) != -1) {
				if (doc.getType() == AventusType.Component) {
					varTxtToUse = compsTxt;
					varDocToUse = compsTxtDoc;
					scssDoc = {
						...scssDoc,
						...doc.SCSSDoc
					}
					htmlDoc = {
						...htmlDoc,
						...doc.HTMLDoc
					}
				}
				else if (doc.getType() == AventusType.Data) {
					varTxtToUse = dataTxt;
					varDocToUse = dataTxtDoc;
				}
				else if (doc.getType() == AventusType.Lib) {
					varTxtToUse = libsTxt;
					varDocToUse = libsTxtDoc;
				}
				else if (doc.getType() == AventusType.Static) {
					varTxtToUse = libsTxt;
					varDocToUse = libsTxtDoc;
				}
				else if (doc.getType() == AventusType.RAM) {
					varTxtToUse = ramTxt;
					varDocToUse = ramTxtDoc;
				}
				else if (doc.getType() == AventusType.Socket) {
					varTxtToUse = socketTxt;
					varDocToUse = socketTxtDoc;
				}
			}
			else if (this.filesNeededNoNamespace.indexOf(doc.document.uri) != -1) {
				if (doc.getType() == AventusType.Component) {
					varTxtToUse = compsTxtNoName;
					varDocToUse = compsTxtDocNoName;
					scssDoc = {
						...scssDoc,
						...doc.SCSSDoc
					}
					htmlDoc = {
						...htmlDoc,
						...doc.HTMLDoc
					}
				}
				else if (doc.getType() == AventusType.Data) {
					varTxtToUse = dataTxtNoName;
					varDocToUse = dataTxtDocNoName;
				}
				else if (doc.getType() == AventusType.Lib) {
					varTxtToUse = libsTxtNoName;
					varDocToUse = libsTxtDocNoName;
				}
				else if (doc.getType() == AventusType.Static) {
					varTxtToUse = libsTxtNoName;
					varDocToUse = libsTxtDocNoName;
				}
				else if (doc.getType() == AventusType.RAM) {
					varTxtToUse = ramTxtNoName;
					varDocToUse = ramTxtDocNoName;
				}
				else if (doc.getType() == AventusType.Socket) {
					varTxtToUse = socketTxtNoName;
					varDocToUse = socketTxtDocNoName;
				}
			}
			if (varDocToUse != undefined && varTxtToUse != undefined) {
				for (let className of doc.classNamesScript) {
					classesNameScript.push(className);
				}
				(varTxtToUse as string[]).push(doc.getCompiledTxt());
				(varDocToUse as string[]).push(doc.getDocTxt());
			}

		}

		let finalTxt = '';
		if (this.configBuild.includeBase) {
			if (require.main) {
				finalTxt += loadLibrary("aventus");
			}
		}
		if (this.configBuild.namespace) {
			finalTxt += "var " + this.configBuild.namespace + ";(function (" + this.configBuild.namespace + ") {\r\n var namespace = '" + this.configBuild.namespace + "';"
		}
		finalTxt += includesTxt.join(EOL) + EOL;
		finalTxt += libsTxt.join(EOL) + EOL;
		finalTxt += dataTxt.join(EOL) + EOL;
		finalTxt += ramTxt.join(EOL) + EOL;
		finalTxt += socketTxt.join(EOL) + EOL;
		finalTxt += compsTxt.join(EOL) + EOL;
		finalTxt = finalTxt.trim() + EOL;
		if (this.configBuild.namespace) {
			for (let className of classesNameScript) {
				if (className != "") {
					finalTxt += this.configBuild.namespace + "." + className + "=" + className + ";" + EOL;
				}
			}
			finalTxt += "})(" + this.configBuild.namespace + " || (" + this.configBuild.namespace + " = {}));" + EOL;
		}
		finalTxt += libsTxtNoName.join(EOL) + EOL;
		finalTxt += dataTxtNoName.join(EOL) + EOL;
		finalTxt += ramTxtNoName.join(EOL) + EOL;
		finalTxt += socketTxtNoName.join(EOL) + EOL;
		finalTxt += compsTxtNoName.join(EOL) + EOL;
		finalTxt = finalTxt.trim() + EOL;



		let folderPath = getFolder(this.configBuild.outputFile.replace(/\\/g, "/"));
		if (!existsSync(folderPath)) {
			mkdirSync(folderPath, { recursive: true });
		}
		writeFileSync(this.configBuild.outputFile, finalTxt);

		if (this.configBuild.generateDefinition) {
			let finalDtxt = "";
			finalDtxt += libsTxtDoc.join(EOL) + EOL;
			finalDtxt += dataTxtDoc.join(EOL) + EOL;
			finalDtxt += ramTxtDoc.join(EOL) + EOL;
			finalDtxt += socketTxtDoc.join(EOL) + EOL;
			finalDtxt += compsTxtDoc.join(EOL) + EOL;
			if (this.configBuild.namespace) {
				finalDtxt = "declare namespace " + this.configBuild.namespace + "{" + EOL + finalDtxt.replace(/declare /g, '') + "}" + EOL;
			}
			finalDtxt += libsTxtDocNoName.join(EOL) + EOL;
			finalDtxt += dataTxtDocNoName.join(EOL) + EOL;
			finalDtxt += ramTxtDocNoName.join(EOL) + EOL;
			finalDtxt += socketTxtDocNoName.join(EOL) + EOL;
			finalDtxt += compsTxtDocNoName.join(EOL) + EOL;
			finalDtxt = "// version " + this.configBuild.version + EOL + "// region js //" + EOL + finalDtxt;
			finalDtxt += "// end region js //" + EOL;
			finalDtxt += "// region css //" + EOL;
			finalDtxt += JSON.stringify(scssDoc) + EOL;
			finalDtxt += "// end region css //" + EOL;
			finalDtxt += "// region html //" + EOL;
			finalDtxt += JSON.stringify(htmlDoc) + EOL;
			finalDtxt += "// end region html //" + EOL;
			writeFileSync(this.configBuild.outputFile.replace(".js", ".def.avt"), finalDtxt);
		}

		modes.connectionWithClient?.sendNotification("aventus/compiled", this.configBuild.name);
	}

	public containsFile(document: TextDocument): boolean {
		if (this.configBuild.inputPathRegex) {
			if (pathToUri(document.uri).match(this.configBuild.inputPathRegex)) {
				if (this.filesNeededGeneral.indexOf(document.uri) == -1) {
					this.filesNeededGeneral.push(document.uri)
				}
				if (this.filesNeededNamespace.indexOf(document.uri) == -1) {
					this.filesNeededNamespace.push(document.uri)
				}
				return true;
			}
		}
		if (this.configBuild.noNamespacePathRegex) {
			if (pathToUri(document.uri).match(this.configBuild.noNamespacePathRegex)) {
				if (this.filesNeededGeneral.indexOf(document.uri) == -1) {
					this.filesNeededGeneral.push(document.uri)
				}
				if (this.filesNeededNoNamespace.indexOf(document.uri) == -1) {
					this.filesNeededNoNamespace.push(document.uri)
				}
				return true;
			}
		}
		return false;
	}

	public async doValidation(document: TextDocument, sendDiagnostic: boolean, virtualDoc: boolean = false): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];

		if (this.program.filesLoaded[document.uri]) {
			let aventusDoc = this.program.filesLoaded[document.uri];
			if (aventusDoc.getType() == AventusType.Static) {
				aventusDoc.hasError = false;
				return [];
			}
			try {

				const syntaxDiagnostics: ts.Diagnostic[] = this.jsLanguageService.getSyntacticDiagnostics(document.uri);
				const semanticDiagnostics: ts.Diagnostic[] = this.jsLanguageService.getSemanticDiagnostics(document.uri);

				const compileError: Diagnostic[] = aventusDoc.doValidation(this.program.configFile, virtualDoc);

				diagnostics = syntaxDiagnostics.concat(semanticDiagnostics).map((diag: ts.Diagnostic): Diagnostic => {
					return {
						range: convertRange(document, diag),
						severity: DiagnosticSeverity.Error,
						source: aventusConfig.languageIdJs,
						message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
					};
				});
				diagnostics = diagnostics.concat(compileError);

				if (diagnostics.length == 0) {
					aventusDoc.hasError = false;
				}
				else {
					aventusDoc.hasError = true;
				}
				if (sendDiagnostic) {
					if (modes.connectionWithClient) {
						modes.connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics });
					}
					else if (diagnostics.length > 0) {
						console.log("---- Erreur ----");

						console.log("file : " + document.uri.replace(this.program.baseDir, ""));
						for (let diag of diagnostics) {
							console.log(diag.message);
						}
						console.log("---- Erreur Fin ----");
					}
				}
			} catch (e) { console.error(e) }
		}

		return diagnostics;
	}
	public async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		let result: CodeAction[] = [];
		const syntaxDiagnostics: ts.Diagnostic[] = this.jsLanguageService.getSyntacticDiagnostics(document.uri);
		const semanticDiagnostics: ts.Diagnostic[] = this.jsLanguageService.getSemanticDiagnostics(document.uri);
		let codes: number[] = [];
		for (let diag of syntaxDiagnostics) {
			codes.push(diag.code)
		}
		for (let diag of semanticDiagnostics) {
			codes.push(diag.code)
		}
		let actions: readonly ts.CodeFixAction[] = [];
		try {
			actions = this.jsLanguageService.getCodeFixesAtPosition(document.uri, document.offsetAt(range.start), document.offsetAt(range.end), codes, formatingOptions, completionOptions);
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
					else if (action.fixName === "fixClassDoesntImplementInheritedAbstractMember") {
						let index = getSectionStart(document, "methods")
						if (index != -1) {
							textChange.span.start = index;
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
}

