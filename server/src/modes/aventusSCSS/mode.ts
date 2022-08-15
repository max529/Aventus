import { CodeAction, CodeActionContext, CompletionItem, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Position, Range, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CSSFormatConfiguration, getSCSSLanguageService, LanguageService } from 'vscode-css-languageservice'
import { aventusExtension } from '../aventusJs/aventusDoc';
import * as nodes from './CSSNode';
import { pathToUri, uriToPath } from '../aventusJs/utils';
import { compileScss } from './compiler/compileScss';
import { existsSync } from 'fs';
import { customCssProperty } from './CSSNode';
import { SCSSDoc } from '../aventusJs/compiler/component/def';
import { connectionWithClient, jsMode } from '../../mode';

export class AventusSCSSMode {
	public customLanguageService: LanguageService | undefined = undefined;

	private reverseDependancesFile: { [key: string]: string[] } = {};
	private dependancesFile: { [key: string]: string[] } = {};
	private documentationInfo: SCSSDoc = {};
	private documentationInfoDef: { [key: string]: SCSSDoc } = {};
	async init(documents: TextDocument[]): Promise<void> {
		this.customLanguageService = getSCSSLanguageService();
		for (let doc of documents) {
			await this.doValidation(doc);
		}
	}

	async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
		let result: CompletionList = { isIncomplete: false, items: [] };
		if (this.customLanguageService) {
			let founded: string[] = [];
			result = this.customLanguageService.doComplete(document, position, this.customLanguageService.parseStylesheet(document));
			let lastEl = this.getTree(document, position).reverse()[0];
			if (this.documentationInfo[lastEl]) {
				for (let child of this.documentationInfo[lastEl]) {
					if (founded.indexOf(child.name) == -1) {
						founded.push(child.name);
						result.items.push({
							label: child.name,
						})
					}
				}
			}
		}
		return result;
	}

	async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
		if (this.customLanguageService) {
			return this.customLanguageService.doHover(document, position, this.customLanguageService.parseStylesheet(document))
		}
		return null;
	}

	async doValidation(document: TextDocument): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];
		if (this.customLanguageService) {
			diagnostics = this.customLanguageService.doValidation(document, this.customLanguageService.parseStylesheet(document))
			// care css-lcurlyexpected  => be sure to have utf-8 encoding
		}
		let result = compileScss(uriToPath(document.uri));
		if (result.success) {
			this.removeDependances(document);
			this.dependancesFile[document.uri] = [];
			for (let dep of result.importedPath) {
				let uri = pathToUri(dep);
				if (this.dependancesFile[document.uri].indexOf(uri) == -1) {
					this.dependancesFile[document.uri].push(uri);
				}

				if (!this.reverseDependancesFile[uri]) {
					this.reverseDependancesFile[uri] = []
				}
				if (this.reverseDependancesFile[uri].indexOf(document.uri) == -1) {
					this.reverseDependancesFile[uri].push(document.uri);
				}
			}
		}
		if (connectionWithClient) {
			connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics });
		}
		return diagnostics;
	}

	compile(document: TextDocument) {
		if (this.reverseDependancesFile[document.uri]) {
			for (let uri of this.reverseDependancesFile[document.uri]) {
				let uriLogic = uri.replace(aventusExtension.ComponentStyle, aventusExtension.ComponentLogic);
				if (existsSync(uriToPath(uriLogic))) {
					let program = jsMode.programManager.getProgram(uriLogic, false)
					let doc = program.getDocument(uriLogic);
					if (doc) {
						jsMode.programManager.getProgram(uriLogic).compile(doc.document);
					}
				}
			}
		}
		else {
			let uriLogic = document.uri.replace(aventusExtension.ComponentStyle, aventusExtension.ComponentLogic);
			if (existsSync(uriToPath(uriLogic))) {
				let program = jsMode.programManager.getProgram(uriLogic, false)
				let doc = program.getDocument(uriLogic);
				if (doc) {
					jsMode.programManager.getProgram(uriLogic).compile(doc.document);
				}
			}
		}


	}

	async doResolve(item: CompletionItem): Promise<CompletionItem> {
		return item;
	}
	async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
		if (this.customLanguageService) {
			return this.customLanguageService.findDefinition(document, position, this.customLanguageService.parseStylesheet(document))
		}
		return null;
	}
	async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
		if (this.customLanguageService) {
			let formatConfig: CSSFormatConfiguration = {
				...formatParams,
				preserveNewLines: true,
				spaceAroundSelectorSeparator: true,
				insertFinalNewline: true,
				insertSpaces: false,
				tabSize: 4,
			}
			return this.customLanguageService.format(document, range, formatConfig);
		}
		return [];
	}
	async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		if (this.customLanguageService) {
			let docSCSS = this.customLanguageService.parseStylesheet(document)
			let codeActionContext = CodeActionContext.create(this.customLanguageService.doValidation(document, docSCSS))
			return this.customLanguageService.doCodeActions2(document, range, codeActionContext, docSCSS);
		}
		return [];
	}
	mustBeRemoved(document: TextDocument) {
		this.removeDependances(document);
	}
	public reload(): void {
		this.documentationInfo = {};
		for (let uri in this.documentationInfoDef) {
			this.documentationInfo = {
				...this.documentationInfo,
				...this.documentationInfoDef[uri]
			}
		}
		jsMode.programManager.getPrograms().forEach(prog => {
			this.documentationInfo = {
				...this.documentationInfo,
				...prog.SCSSDoc
			}
		})
	}
	private removeDependances(document: TextDocument) {
		if (this.dependancesFile[document.uri]) {
			for (let reverseDepUri of this.dependancesFile[document.uri]) {
				if (this.reverseDependancesFile[reverseDepUri]) {
					let index = this.reverseDependancesFile[reverseDepUri].indexOf(document.uri);
					if (index != -1) {
						this.reverseDependancesFile[reverseDepUri].splice(index, 1);
						if (this.reverseDependancesFile[reverseDepUri].length == 0) {
							delete this.reverseDependancesFile[reverseDepUri];
						}
					}
				}
			}
			delete this.dependancesFile[document.uri];
		}
	}

	private getTree(document: TextDocument, position: Position): string[] {
		let result: string[] = [];
		if (this.customLanguageService) {
			let doc = this.customLanguageService.parseStylesheet(document);
			let offset = document.offsetAt(position);
			let path = nodes.getNodePath(doc as nodes.Node, offset);
			for (let node of path) {
				if (node.type == nodes.NodeType.Ruleset) {
					let nodeDef = node.getChild(0);
					if (nodeDef) {
						let ruleName = nodeDef.getText();
						result.push(ruleName);
					}
				}
			}
		}
		return result;
	}
	public getCustomProperty(srcCode: string): customCssProperty[] {
		let document = TextDocument.create("temp.scss", "scss", 1, srcCode);
		let result: customCssProperty[] = [];
		const _loadCustomProperty = (node: nodes.Node) => {
			if (node.type == nodes.NodeType.CustomPropertyDeclaration) {
				let nodeParent: nodes.Node | null = node;
				while (nodeParent && nodeParent["selectors"] == undefined) {
					nodeParent = nodeParent.parent;
				}
				if (nodeParent) {
					let selectorText = nodeParent["selectors"].getText();
					if (selectorText == ":host") {
						let propertyNode = node.getChild(0);
						let expressionNode = node.getChild(1);
						if (propertyNode && expressionNode) {
							if (propertyNode.getText().startsWith("--internal")) {
								let externalName = propertyNode.getText().replace("--internal-", "--");
								if (expressionNode.getText().indexOf(externalName) != -1) {
									result.push({
										name: externalName
									})
								}
							}
						}
					}
				}
			}
			else if (node.hasChildren()) {
				for (let childNode of node.getChildren()) {
					_loadCustomProperty(childNode);
				}
			}
		}

		if (this.customLanguageService) {
			let doc = this.customLanguageService.parseStylesheet(document);
			let path = nodes.getNodePath(doc as nodes.Node, 0);
			for (let pathTemp of path) {
				_loadCustomProperty(pathTemp);
			}
		}
		return result;
	}

	public addDefinition(uri: string, doc: SCSSDoc): void {
		this.documentationInfoDef[uri] = doc;
		this.reload();
	}
}

