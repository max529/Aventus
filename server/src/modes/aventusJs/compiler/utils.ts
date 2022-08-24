import { existsSync, unlink, unlinkSync, writeFileSync } from 'fs'
import * as ts from 'typescript'
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as aventusConfig from '../../../config'
import { ClassModel, EnumDeclaration, parseStruct } from '../../../ts-file-parser'
import { getFolder, uriToPath } from '../utils'

export function createErrorTs(currentDoc: TextDocument, msg: string): Diagnostic {
	return {
		range: Range.create(currentDoc.positionAt(0), currentDoc.positionAt(currentDoc.getText().length)),
		severity: DiagnosticSeverity.Error,
		source: aventusConfig.languageIdJs,
		message: ts.flattenDiagnosticMessageText(msg, '\n')
	}
}

export function createErrorTsPos(currentDoc: TextDocument, msg: string, start: number, end: number): Diagnostic {
	return {
		range: Range.create(currentDoc.positionAt(start), currentDoc.positionAt(end)),
		severity: DiagnosticSeverity.Error,
		source: aventusConfig.languageIdJs,
		message: ts.flattenDiagnosticMessageText(msg, '\n')
	}
}

export function removeWhiteSpaceLines(txt: string) {
	return txt.replace(/^(?:[\t ]*(?:\r?\n|\r))+/gm, '');
}

export function removeDecoratorFromClassContent(cls: ClassModel | EnumDeclaration) {
	let classContent = cls.content.trim();
	cls.decorators.forEach(decorator => {
		classContent = classContent.replace(new RegExp("@" + decorator.name + "\\s*(\\([^)]*\\))?", "g"), "");
	});

	return classContent.trim();
}

export function genericCompile(document: TextDocument) {
	const struct = parseStruct(document.getText(), {}, uriToPath(document.uri));
	let scriptTxt = "";
	let docTxt = "";
	let classesNameSript: string[] = [];
	let classesNameDoc: string[] = [];
	let debugTxt = "";
	let dependances: string[] = [];
	struct.classes.forEach(cls => {
		cls.extends.forEach(extension => {
			if (dependances.indexOf(extension.typeName) == -1) {
				dependances.push(extension.typeName);
			}
		})
		let classContent = removeDecoratorFromClassContent(cls);
		classContent = replaceFirstExport(classContent);
		let result = compileTs(classContent);


		if (result.compiled.length > 0) {
			scriptTxt += result.compiled;
			classesNameSript.push(cls.name);
		}
		if (result.doc.length > 0) {
			docTxt += result.doc;
			classesNameDoc.push(cls.name);
		}
		for (let decorator of cls.decorators) {
			if (decorator.name == "Debugger") {
				if (decorator.arguments.length > 0) {
					for (let arg of decorator.arguments) {
						if (arg.writeCompiled) {
							debugTxt += result.compiled
						}
					}
				}
			}
		}
	});
	struct.enumDeclarations.forEach(enm => {
		let enumContent = removeDecoratorFromClassContent(enm);
		enumContent = replaceFirstExport(enumContent);
		let result = compileTs(enumContent);
		if (result.compiled.length > 0) {
			scriptTxt += result.compiled;
			classesNameSript.push(enm.name);
		}
		if (result.doc.length > 0) {
			classesNameDoc.push(enm.name);
			docTxt += result.doc;
		}
		for (let decorator of enm.decorators) {
			if (decorator.name == "Debugger") {
				if (decorator.arguments.length > 0) {
					for (let arg of decorator.arguments) {
						if (arg.writeCompiled) {
							debugTxt += result.compiled
						}
					}
				}
			}
		}
	})

	let debugPath = uriToPath(document.uri.replace(".avt", ".js"));
	if (debugTxt != "") {
		writeFileSync(debugPath, debugTxt);
	}
	else if (existsSync(debugPath)) {
		unlinkSync(debugPath);
	}
	return {
		nameCompiled: classesNameSript,
		nameDoc: classesNameDoc,
		src: removeWhiteSpaceLines(scriptTxt),
		doc: removeWhiteSpaceLines(docTxt),
		dependances: dependances
	};
}

export function compileTs(txt: string): { compiled: string, doc: string } {
	let result = {
		compiled: "",
		doc: ""
	}
	let configTS: ts.CompilerOptions = {
		"noImplicitOverride": false,
		"target": ts.ScriptTarget.ES2015,
	};
	result.compiled = ts.transpile(txt, configTS);
	result.doc = compileDocTs(txt);
	// Loop through all the input files
	return result;
}

export function compileDocTs(txt: string) {
	const host: ts.LanguageServiceHost = {
		getCompilationSettings: () => {
			return {
				allowJs: true,
				declaration: true,
				emitDeclarationOnly: true
			}
		},
		getScriptFileNames: () => ["temp.js"],
		getScriptKind: (fileName) => {
			return ts.ScriptKind.TS;
		},
		getScriptVersion: (fileName: string) => {
			return '1';
		},
		getScriptSnapshot: (fileName: string) => {
			let text = txt;
			return {
				getText: (start, end) => text?.substring(start, end) || '',
				getLength: () => text?.length || 0,
				getChangeRange: () => undefined
			};
		},
		getCurrentDirectory: () => '',
		getDefaultLibFileName: (_options: ts.CompilerOptions) => '',
		readFile: (path: string, _encoding?: string | undefined): string | undefined => {
			return txt;
		},
		fileExists: (path: string): boolean => {
			return true;
		},
		directoryExists: (path: string): boolean => {
			// typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
			// there's no node_modules in our setup
			if (path.startsWith('node_modules')) {
				return false;
			}
			return true;

		},

	};
	let ls: ts.LanguageService = ts.createLanguageService(host);
	return ls.getEmitOutput("temp.js", true, true).outputFiles[0].text;
}

export function replaceFirstExport(txt: string): string {
	return txt.replace(/^(\/\*(\s|\S)*?\*\/\s*)?export\s+/, "");
}