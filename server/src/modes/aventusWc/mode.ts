import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CompletionItem, CompletionList, Definition, FormattingOptions, Hover, Position, Range, TextEdit } from 'vscode-languageserver/node';
import { connectionWithClient, htmlMode, jsMode, scssMode } from '../../mode';
import { Diagnostic, getLanguageService, LanguageService, TokenType } from 'vscode-html-languageservice';
import { languageIdJs, languageIdWc } from '../../config';
import { AventusWcDoc, AventusWcDocSection } from './doc';
import { EOL } from 'os';
import { AventusJSMode } from '../aventusJs/mode';
import { AventusHTMLMode } from '../aventusHTML/mode';
import { AventusSCSSMode } from '../aventusSCSS/mode';

type AllModes = AventusJSMode | AventusHTMLMode | AventusSCSSMode;

// CARE : range be the same when converting result

export class AventusWcMode {
	private documents: { [key: string]: AventusWcDoc } = {}
	async init(files: TextDocument[]) {
		for (let file of files) {
			this.getDoc(file);
		}
	}
	mustBeRemoved(document: TextDocument) {
		let doc = this.getDoc(document);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		scssMode.mustBeRemoved(cssInfo.document);
		jsMode.mustBeRemoved(jsInfo.document);
		htmlMode.mustBeRemoved(htmlInfo.document);
		delete this.documents[document.uri];
	}
	async doValidation(document: TextDocument, sendDiagnostic: boolean): Promise<Diagnostic[]> {
		let doc = this.getDoc(document);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		let diagnostics: Diagnostic[] = [];
		let convertedRanges: Range[] = [];

		const generateError = async (mode: AllModes, info: AventusWcDocSection): Promise<void> => {
			let errors = await mode.doValidation(info.document, false, true);
			for (let error of errors) {
				if (convertedRanges.indexOf(error.range) == -1) {
					convertedRanges.push(error.range);
					error.range.start = document.positionAt(info.document.offsetAt(error.range.start) + info.start);
					error.range.end = document.positionAt(info.document.offsetAt(error.range.end) + info.start);
				}
				diagnostics.push(error);
			}
		}
		await generateError(scssMode, cssInfo);
		await generateError(jsMode, jsInfo);
		await generateError(htmlMode, htmlInfo);

		if (sendDiagnostic) {
			if (connectionWithClient) {
				connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics });
			}
		}

		return diagnostics;
	}
	compile(document: TextDocument) {
		let doc = this.getDoc(document);
		let jsInfo = doc.getJSInfo();
		jsMode.programManager.getProgram(jsInfo.document, false).compile(jsInfo.document, true);
	}
	async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
		let doc = this.getDoc(document);
		let currentOffset = document.offsetAt(position);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();

		let convertedRanges: Range[] = [];

		const generateComplete = async (mode: AllModes, info: AventusWcDocSection): Promise<CompletionList | undefined> => {
			if (currentOffset >= info.start && currentOffset <= info.end) {
				let result = await mode.doComplete(info.document, info.document.positionAt(currentOffset - info.start));
				for (let item of result.items) {
					if (item.data && item.data.uri) {
						item.data.languageId = languageIdWc;
						item.data.uri = document.uri
					}
					if (item.textEdit) {
						let textEdit = item.textEdit as TextEdit;
						if (textEdit.range) {
							if (convertedRanges.indexOf(textEdit.range) == -1) {
								convertedRanges.push(textEdit.range)
								textEdit.range.start = this.transformPosition(info.document, textEdit.range.start, document, info.start * -1);
								textEdit.range.end = this.transformPosition(info.document, textEdit.range.end, document, info.start * -1);
							}
						}
					}
				}
				return result
			}
		}
		let cssResult = await generateComplete(scssMode, cssInfo);
		if (cssResult) { return cssResult; }
		let jsResult = await generateComplete(jsMode, jsInfo);
		if (jsResult) { return jsResult; }
		let htmlResult = await generateComplete(htmlMode, htmlInfo);
		if (htmlResult) { return htmlResult; }
		// TODO check why html is not auto completing
		return { isIncomplete: false, items: [] };
	}
	async doResolve(item: CompletionItem): Promise<CompletionItem> {
		if (item.data) {
			if (this.documents[item.data.uri]) {
				let doc = this.documents[item.data.uri];
				let jsInfo = doc.getJSInfo();
				item.data.uri = jsInfo.document.uri;
				item.data.languageId = languageIdJs;
				let resultTemp = await jsMode.doResolve(item);
				let convertedRanges: Range[] = [];

				if (resultTemp.additionalTextEdits) {
					for (let edit of resultTemp.additionalTextEdits) {
						if (jsInfo.document.offsetAt(edit.range.start) == 0) {
							edit.newText = EOL + edit.newText;
						}
						if (convertedRanges.indexOf(edit.range) == -1 && !edit.range["wc_transformed"]) {
							convertedRanges.push(edit.range);
							edit.range["wc_transformed"] = true;
							edit.range.start = this.transformPosition(jsInfo.document, edit.range.start, doc.document, jsInfo.start * -1);
							edit.range.end = this.transformPosition(jsInfo.document, edit.range.end, doc.document, jsInfo.start * -1);
						}

					}
				}
				return resultTemp;
			}
		}
		return item;
	}
	async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
		let doc = this.getDoc(document);
		let currentOffset = document.offsetAt(position);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		let convertedRanges: Range[] = [];
		const generateHover = async (mode: AllModes, info: AventusWcDocSection): Promise<Hover | null> => {
			if (currentOffset >= info.start && currentOffset <= info.end) {
				let result = await mode.doHover(info.document, info.document.positionAt(currentOffset - info.start));
				if (result?.range) {
					if (convertedRanges.indexOf(result.range) == -1) {
						convertedRanges.push(result.range);
						result.range.start = this.transformPosition(info.document, result.range.start, document, info.start * -1);
						result.range.end = this.transformPosition(info.document, result.range.end, document, info.start * -1);
					}
				}
				return result;
			}
			return null;
		}

		let cssResult = await generateHover(scssMode, cssInfo);
		if (cssResult) { return cssResult; }
		let jsResult = await generateHover(jsMode, jsInfo);
		if (jsResult) { return jsResult; }
		let htmlResult = await generateHover(htmlMode, htmlInfo);
		if (htmlResult) { return htmlResult; }

		return null;
	}
	async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
		let doc = this.getDoc(document);
		let currentOffset = document.offsetAt(position);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		let result: Definition | null = null;
		if (currentOffset >= cssInfo.start && currentOffset <= cssInfo.end) {
			result = await scssMode.findDefinition(cssInfo.document, cssInfo.document.positionAt(currentOffset - cssInfo.start));
		}
		else if (currentOffset >= jsInfo.start && currentOffset <= jsInfo.end) {
			result = await jsMode.findDefinition(jsInfo.document, jsInfo.document.positionAt(currentOffset - jsInfo.start));
		}
		else if (currentOffset >= htmlInfo.start && currentOffset <= htmlInfo.end) {
			result = await htmlMode.findDefinition(htmlInfo.document, htmlInfo.document.positionAt(currentOffset - htmlInfo.start));
		}
		return result;
	}
	async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
		let doc = this.getDoc(document);
		let rangeSelected = {
			start: document.offsetAt(range.start),
			end: document.offsetAt(range.end)
		}
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		let result: TextEdit[] = [];
		let convertedRanges: Range[] = [];

		if (this.isOverlapping(rangeSelected, cssInfo)) {
			let resultsTemp = await scssMode.format(
				cssInfo.document,
				{
					start: cssInfo.document.positionAt(0),
					end: cssInfo.document.positionAt(cssInfo.document.getText().length),
				},
				formatParams
			);
			for (let temp of resultsTemp) {
				temp.newText = EOL + "\t" + temp.newText.split('\n').join("\n\t") + EOL;
				if (convertedRanges.indexOf(temp.range) == -1) {
					convertedRanges.push(temp.range);
					temp.range.start = this.transformPosition(cssInfo.document, temp.range.start, document, cssInfo.start * -1);
					temp.range.end = this.transformPosition(cssInfo.document, temp.range.end, document, cssInfo.start * -1);
				}
				result.push(temp);
			}
		}

		if (this.isOverlapping(rangeSelected, jsInfo)) {
			let resultsTemp = await jsMode.format(
				jsInfo.document,
				{
					start: jsInfo.document.positionAt(0),
					end: jsInfo.document.positionAt(jsInfo.document.getText().length),
				},
				formatParams,
				true
			);
			for (let temp of resultsTemp) {
				if (convertedRanges.indexOf(temp.range) == -1) {
					convertedRanges.push(temp.range);
					temp.range.start = this.transformPosition(jsInfo.document, temp.range.start, document, jsInfo.start * -1);
					temp.range.end = this.transformPosition(jsInfo.document, temp.range.end, document, jsInfo.start * -1);
				}
				result.push(temp);
			}
		}

		if (this.isOverlapping(rangeSelected, htmlInfo)) {
			let resultsTemp = await htmlMode.format(
				htmlInfo.document,
				{
					start: htmlInfo.document.positionAt(0),
					end: htmlInfo.document.positionAt(htmlInfo.document.getText().length),
				},
				formatParams,
			);
			for (let temp of resultsTemp) {
				temp.newText = EOL + "\t" + temp.newText.split('\n').join("\n\t") + EOL;
				if (convertedRanges.indexOf(temp.range) == -1) {
					convertedRanges.push(temp.range);
					temp.range.start = this.transformPosition(htmlInfo.document, temp.range.start, document, htmlInfo.start * -1);
					temp.range.end = this.transformPosition(htmlInfo.document, temp.range.end, document, htmlInfo.start * -1);
				}
				result.push(temp);
			}
		}

		return result;
	}
	async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		let doc = this.getDoc(document);
		let cssInfo = doc.getSCSSInfo();
		let jsInfo = doc.getJSInfo();
		let htmlInfo = doc.getHTMLInfo();
		let rangeSelected = {
			start: document.offsetAt(range.start),
			end: document.offsetAt(range.end)
		}
		let convertedRanges: Range[] = [];

		const generateCodeAction = async (mode: AllModes, info: AventusWcDocSection): Promise<CodeAction[] | undefined> => {
			let results: CodeAction[] = [];
			if (this.isOverlapping(rangeSelected, info)) {
				results = await mode.doCodeAction(
					info.document,
					{
						start: this.transformPosition(document, range.start, info.document, info.start),
						end: this.transformPosition(document, range.end, info.document, info.start)
					}
				);
				for (let result of results) {
					if (result.edit) {
						if (result.edit.changes) {
							let changesFinal: TextEdit[] = [];
							for (let changeFile in result.edit.changes) {
								if (changeFile == info.document.uri) {
									let changes = result.edit.changes[changeFile];
									for (let change of changes) {
										if (convertedRanges.indexOf(change.range) == -1) {
											convertedRanges.push(change.range);
											change.range.start = this.transformPosition(info.document, change.range.start, document, info.start * -1);
											change.range.end = this.transformPosition(info.document, change.range.end, document, info.start * -1);
										}
										changesFinal.push(change);
									}
								}
							}
							if (changesFinal.length > 0) {
								delete result.edit.changes[info.document.uri];
								result.edit.changes[document.uri] = changesFinal;
							}
						}
					}
				}
				return results;
			}
			return undefined;
		}

		let resultTemp: CodeAction[] | undefined;
		resultTemp = await generateCodeAction(scssMode, cssInfo);
		if (resultTemp) { return resultTemp };

		resultTemp = await generateCodeAction(jsMode, jsInfo);
		if (resultTemp) { return resultTemp };

		resultTemp = await generateCodeAction(htmlMode, htmlInfo);
		if (resultTemp) { return resultTemp };

		return [];
	}

	public getDocumentByUri(uri: string): AventusWcDoc | undefined {
		return this.documents[uri];
	}
	private getDoc(document: TextDocument): AventusWcDoc {
		if (this.documents[document.uri]) {
			this.documents[document.uri].refresh(document);
		}
		else {
			this.documents[document.uri] = new AventusWcDoc(document);
		}
		return this.documents[document.uri];
	}
	private transformPosition(documentFrom: TextDocument, positionFrom: Position, documentTo: TextDocument, offset: number): Position {
		let currentOffset = documentFrom.offsetAt(positionFrom);
		return documentTo.positionAt(currentOffset - offset);
	}

	private isOverlapping(rangeSelected: { start: number, end: number }, rangeSection: { start: number, end: number }): boolean {
		return (rangeSection.start < rangeSelected.start && rangeSection.end > rangeSelected.start) ||
			(rangeSection.start < rangeSelected.end && rangeSection.end > rangeSelected.end) ||
			(rangeSection.start > rangeSelected.start && rangeSection.end < rangeSelected.end)
	}
}


