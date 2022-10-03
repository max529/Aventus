import { TextDocument } from 'vscode-languageserver-textdocument';
import { compileComponent } from './compiler/component/compilerComponent';
import { CompileComponentResult, HTMLDoc, SCSSDoc } from './compiler/component/def';
import { AventusConfig } from './config';
import { AventusJSProgram } from './program';
import { uriToPath } from './utils';
import { compileLib } from './compiler/lib/compilerLib';
import { Diagnostic } from 'vscode-languageserver';
import { compileValidatorLib } from './compiler/lib/compilerValidator';
import { compileData } from './compiler/data/compilerData';
import { compileValidatorData } from './compiler/data/compilerValidator';
import { compileValidatorRAM } from './compiler/ram/compilerValidator';
import { compileRAM } from './compiler/ram/compilerRAM';
import { existsSync, readFileSync } from 'fs';
import { connectionWithClient } from '../../mode';
import { compileValidatorSocket } from './compiler/socket/compilerValidator';
import { compileSocket } from './compiler/socket/compilerSocket';

export enum AventusType {
	Component,
	Lib,
	Data,
	RAM,
	Socket,
	Static,
	Definition,
	Unknow
}
export const aventusExtension = {
	ComponentLogic: ".wcl.avt",
	ComponentView: ".wcv.avt",
	ComponentStyle: ".wcs.avt",
	Component: ".wc.avt",
	Data: ".data.avt",
	Lib: ".lib.avt",
	RAM: ".ram.avt",
	Socket: ".socket.avt",
	Static: ".static.avt",
	Definition: ".def.avt"
}

export class AventusDoc {
	public document: TextDocument
	public path: string
	public dependances: string[];
	private compiledTxt: string;
	private docTxt: string;
	public hasError: boolean = false
	private program: AventusJSProgram;
	private type: AventusType;
	public classNamesScript: string[];
	public classNamesDoc: string[];
	public HTMLDoc: HTMLDoc = {};
	public SCSSDoc: SCSSDoc = {};
	private lastCompiledWebComponent: CompileComponentResult | undefined = undefined;
	constructor(document: TextDocument, program: AventusJSProgram) {
		this.document = document;
		this.program = program;
		this.path = uriToPath(document.uri);
		this.type = this.prepareType();
		this.compiledTxt = "";
		this.docTxt = "";
		this.classNamesScript = [];
		this.classNamesDoc = [];
		this.dependances = [];
	}



	private prepareType(): AventusType {
		if (this.path.endsWith(aventusExtension.ComponentLogic)) {
			return AventusType.Component;
		}
		else if (this.path.endsWith(aventusExtension.Data)) {
			return AventusType.Data;
		}
		else if (this.path.endsWith(aventusExtension.Lib)) {
			return AventusType.Lib;
		}
		else if (this.path.endsWith(aventusExtension.RAM)) {
			return AventusType.RAM;
		}
		else if (this.path.endsWith(aventusExtension.Static)) {
			return AventusType.Static;
		}
		else if (this.path.endsWith(aventusExtension.Definition)) {
			return AventusType.Definition;
		}
		else if (this.path.endsWith(aventusExtension.Socket)) {
			return AventusType.Socket;
		}
		
		console.log("unknow extension " + this.path);
		return AventusType.Unknow;
	}

	doValidation(config: AventusConfig, program: AventusJSProgram, virtualDoc:boolean): Diagnostic[] {
		let compileError: Diagnostic[] = [];

		if (this.type == AventusType.Component) {
			let compiled = compileComponent(this.document, config, program, virtualDoc);
			if (compiled.success) {
				this.lastCompiledWebComponent = compiled;
			}
			else {
				compileError = compiled.diagnostics;
			}
		} else if (this.type == AventusType.Lib) {
			compileError = compileValidatorLib(this.document, config);
		} else if (this.type == AventusType.Data) {
			compileError = compileValidatorData(this.document, config);
		} else if (this.type == AventusType.RAM) {
			compileError = compileValidatorRAM(this.document, config);
		} else if (this.type == AventusType.Socket) {
			compileError = compileValidatorSocket(this.document, config);
		}
		return compileError
	}

	compile(config: AventusConfig): boolean {
		if (!this.hasError) {
			try {

				let newCompiledTxt: { nameCompiled: string | string[], nameDoc: string | string[], src: string, doc: string, dependances: string[], htmlDoc?: HTMLDoc, scssVars?: SCSSDoc } | undefined;
				if (this.type == AventusType.Component && this.lastCompiledWebComponent) {
					newCompiledTxt = this.lastCompiledWebComponent.result;
					if (newCompiledTxt.htmlDoc) {
						this.HTMLDoc = newCompiledTxt.htmlDoc;
					}
					if (newCompiledTxt.scssVars) {
						this.SCSSDoc = newCompiledTxt.scssVars;
					}
				} else if (this.type == AventusType.Lib) {
					newCompiledTxt = compileLib(this.document, config);
				} else if (this.type == AventusType.Data) {
					newCompiledTxt = compileData(this, config);
				} else if (this.type == AventusType.RAM) {
					newCompiledTxt = compileRAM(this.document, config);
				} else if (this.type == AventusType.Socket) {
					newCompiledTxt = compileSocket(this.document, config);
				} else if (this.type == AventusType.Static) {
					let filename = this.document.uri.split("/")
					newCompiledTxt = {
						nameCompiled: "",
						nameDoc: "",
						src: this.document.getText(),
						doc: "",
						dependances: []
					}
				}

				if (newCompiledTxt) {
					// check if we have to force definition
					this.dependances = newCompiledTxt.dependances;
					let docPath = uriToPath(this.document.uri);
					for (let key in aventusExtension) {
						docPath = docPath.replace(aventusExtension[key], aventusExtension.Definition);
					}
					if (existsSync(docPath)) {
						newCompiledTxt.doc = readFileSync(docPath, 'utf8');
					}
					let classNameTxt = "";
					if (!Array.isArray(newCompiledTxt.nameCompiled)) {
						this.classNamesScript = [newCompiledTxt.nameCompiled];
						classNameTxt = newCompiledTxt.nameCompiled;
					}
					else {
						this.classNamesScript = newCompiledTxt.nameCompiled;
						classNameTxt = newCompiledTxt.nameCompiled.join(", ");
					}

					if (newCompiledTxt.nameDoc !== "") {
						if (!Array.isArray(newCompiledTxt.nameDoc)) {
							this.classNamesDoc = [newCompiledTxt.nameDoc];
							classNameTxt = newCompiledTxt.nameDoc;
						}
						else {
							this.classNamesDoc = newCompiledTxt.nameDoc;
							classNameTxt = newCompiledTxt.nameDoc.join(", ");
						}
					}

					if (this.docTxt != newCompiledTxt.doc) {
						this.docTxt = newCompiledTxt.doc;
					}
					if (this.compiledTxt != newCompiledTxt.src) {
						this.compiledTxt = newCompiledTxt.src;

						console.info(classNameTxt + " compiled");
						if (this.type == AventusType.Data) {
							connectionWithClient?.sendNotification("aventus/registerData", [this.classNamesScript, this.path]);
						}
						this.program.build();
					}
					return true;
				}
			} catch (e) {
				console.error(e);
			}
		}
		if (this.compiledTxt != "") {
			this.compiledTxt = "";
			this.program.build();
		}
		return false;
	}

	getType(): AventusType {
		return this.type;
	}
	getCompiledTxt(): string {
		return this.compiledTxt;
	}
	getDocTxt(): string {
		return this.docTxt;
	}

	remove() {
		//this.watcher.close();
		if (this.type == AventusType.Data) {
			connectionWithClient?.sendNotification("aventus/unregisterData", this.path);
		}
	}
}