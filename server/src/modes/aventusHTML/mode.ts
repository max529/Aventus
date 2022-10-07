import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService as getHTMLLanguageService, IAttributeData, ITagData, IValueData, LanguageService } from 'vscode-html-languageservice'
import { CodeAction, CompletionItem, CompletionItemKind, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Position, TextEdit } from 'vscode-languageserver';
import { CustomTypeAttribute, HTMLDoc } from '../aventusJs/compiler/component/def';
import { Range } from 'vscode-languageserver/node'
import { aventusExtension } from '../aventusJs/aventusDoc';
import { languageIdHTML } from '../../config';
import { connectionWithClient, jsMode } from '../../mode';


export class AventusHTMLMode {
	public customLanguageService: LanguageService | undefined = undefined;
	public documentationInfo: HTMLDoc = {};
	public documentationInfoDef: { [key: string]: HTMLDoc } = {};
	public transformedInfo: ITagData[] = [];
	public id: number = 0;
	private isAutoComplete: boolean = false;
	private listFiles: { [key: string]: TextDocument } = {};
	public init(documents: TextDocument[]): void {
		for (let file of documents) {
			this.listFiles[file.uri] = file
		}
		if (this.customLanguageService === undefined) {
			this.customLanguageService = getHTMLLanguageService({
				useDefaultDataProvider: true,
				customDataProviders: [
					{
						getId: this.getId.bind(this),
						isApplicable(languageId) {
							return languageId == languageIdHTML;
						},
						provideTags: this.provideTags.bind(this),
						provideAttributes: this.provideAttributes.bind(this),
						provideValues: this.provideValues.bind(this)
					}
				]
			})
		}
	}
	public getFiles() {
		return this.listFiles;
	}
	public getFile(uri: string) {
		return this.listFiles[uri];
	}
	public getId(): string {
		return this.id + "";
	}
	public provideTags(): ITagData[] {
		return this.transformedInfo;
	}
	public provideAttributes(tag: string): IAttributeData[] {
		let result: IAttributeData[] = [];
		if (this.documentationInfo[tag]) {
			let attrs = this.documentationInfo[tag].attributes;
			for (let attrName in attrs) {
				let current = attrs[attrName];
				if (this.isAutoComplete) {
					result.push({
						name: "!!" + current.name,
						description: JSON.stringify({
							description: current.description,
							type: current.type,
						})
					})
				}
				else {
					result.push({
						name: current.name,
						description: current.description
					})
				}
			}
		}
		return result;
	}
	public provideValues(tag: string, attribute: string): IValueData[] {
		if (this.documentationInfo[tag] && this.documentationInfo[tag].attributes[attribute]) {
			return this.documentationInfo[tag].attributes[attribute].values;
		}
		return [];
	}
	public reload() {
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
				...prog.HTMLDoc
			}
		})
		this.transform();
	}
	public transform() {
		this.transformedInfo = [];
		for (let key in this.documentationInfo) {
			let current = this.documentationInfo[key];
			let attrs: IAttributeData[] = []
			let temp: ITagData = {
				name: current.name,
				description: current.description,
				attributes: attrs
			}
			for (let attrName in current.attributes) {
				let currentAttr = current.attributes[attrName];
				attrs.push({
					name: currentAttr.name,
					description: currentAttr.description,
					values: currentAttr.values
				})
			}
			this.transformedInfo.push(temp);
		}
	}

	async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
		if (this.customLanguageService) {
			let docHTML = this.customLanguageService.parseHTMLDocument(document);
			if (docHTML) {
				this.isAutoComplete = true;
				let result = this.customLanguageService.doComplete(document, position, docHTML);
				this.isAutoComplete = false;
				for (let temp of result.items) {
					if (temp.label.startsWith("!!")) {
						temp.kind = CompletionItemKind.Snippet;
						if (temp.textEdit) {
							let newLabel = temp.label.replace("!!", "");
							temp.textEdit.newText = temp.textEdit.newText.replace(temp.label, newLabel)
							if (temp.documentation) {
								let customInfo: {
									description: string,
									type: CustomTypeAttribute
								} = JSON.parse(temp.documentation["value"]);

								if (customInfo.description == "") {
									delete temp.documentation;
								}

								if (customInfo.type == 'boolean') {
									temp.textEdit.newText = temp.textEdit.newText.split("=")[0];
								}
							}
							temp.label = newLabel;
						}
					}
					if (temp.kind == CompletionItemKind.Property && temp.textEdit) {
						if (!temp.textEdit.newText.endsWith(">")) {
							temp.textEdit.newText += "></" + temp.textEdit.newText + ">";
						}
					}
				}
				return result;
			}
		}
		return { isIncomplete: false, items: [] };
	}
	async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
		if (this.customLanguageService) {
			let docHTML = this.customLanguageService.parseHTMLDocument(document);
			if (docHTML) {
				return this.customLanguageService.doHover(document, position, docHTML)
			}
		}
		return null;
	}
	async doValidation(document: TextDocument, sendDiagnostic: boolean): Promise<Diagnostic[]> {
		this.listFiles[document.uri] = document;
		if (connectionWithClient && sendDiagnostic) {
			connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: [] });
		}
		return [];
	}
	compile(document: TextDocument) {
		let uriLogic = document.uri.replace(aventusExtension.ComponentView, aventusExtension.ComponentLogic);
		let program = jsMode.programManager.getProgram(uriLogic, false)
		let doc = program.getDocument(uriLogic);
		if (doc) {
			jsMode.programManager.getProgram(uriLogic).compile(doc.document);
		}
	}

	async doResolve(item: CompletionItem): Promise<CompletionItem> {
		return item;
	}
	async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {

		return null;
	}
	async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
		if (this.customLanguageService) {
			return this.customLanguageService.format(document, range, formatParams)
		}
		return [];
	}
	async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		return [];
	}
	mustBeRemoved(document: TextDocument) {
		delete this.listFiles[document.uri];
	}

	public addDefinition(uri: string, doc: HTMLDoc): void {
		this.documentationInfoDef[uri] = doc;
		this.reload();
	}
}