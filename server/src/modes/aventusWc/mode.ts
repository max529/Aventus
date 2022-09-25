import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CompletionItem, CompletionList, Definition, FormattingOptions, Hover, Position, Range, TextEdit } from 'vscode-languageserver/node';
import { connectionWithClient, htmlMode, jsMode, scssMode } from '../../mode';
import { Diagnostic, getLanguageService, LanguageService, TokenType } from 'vscode-html-languageservice';
import { languageIdWc } from '../../config';
import { AventusWcDoc } from './doc';

export class AventusWcMode {
	private documents: { [key: string]: AventusWcDoc } = {}
	async init(files: TextDocument[]) {
		for (let file of files) {
			this.getDoc(file);
		}
	}
	mustBeRemoved(document: TextDocument) {
		//jsMode.programManager.getProgram(document).removeDocument(document);
		delete this.documents[document.uri];
	}
	async doValidation(document: TextDocument, sendDiagnostic: boolean): Promise<Diagnostic[]> {
		let doc = this.getDoc(document);
		let diagnostics: Diagnostic[] =[];
		let cssDoc = doc.getSCSS();
		let cssErrors = await scssMode.doValidation(cssDoc, false, true);
		for (let error of cssErrors) {
			error.range.start = document.positionAt(cssDoc.offsetAt(error.range.start) + doc.getSCSSOffset());
			error.range.end = document.positionAt(cssDoc.offsetAt(error.range.end) + doc.getSCSSOffset());
		}
		let jsDoc = doc.getJS();
		let jsErrors = await jsMode.doValidation(jsDoc, false);
		for (let error of jsErrors) {
			error.range.start = document.positionAt(jsDoc.offsetAt(error.range.start) + doc.getJSOffset());
			error.range.end = document.positionAt(jsDoc.offsetAt(error.range.end) + doc.getJSOffset());
		}
		let htmlDoc = doc.getHTML();
		let htmlErrors = await htmlMode.doValidation(htmlDoc, false);
		for (let error of htmlErrors) {
			error.range.start = document.positionAt(htmlDoc.offsetAt(error.range.start) + doc.getHTMLOffset());
			error.range.end = document.positionAt(htmlDoc.offsetAt(error.range.end) + doc.getHTMLOffset());
		}
		if (sendDiagnostic) {
			if (connectionWithClient) {
				connectionWithClient.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics });
			}
		}

		return diagnostics;
	}
	compile(document: TextDocument) {
		//this.programManager.getProgram(document).compile(document);
	}
	async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
		return { isIncomplete: false, items: [] };
	}
	async doResolve(item: CompletionItem): Promise<CompletionItem> {

		return item;
	}
	async doHover(document: TextDocument, position: Position): Promise<Hover | null> {

		return null;
	}
	async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
		return null;
	}
	async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
		return [];
	}
	async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
		return []
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
}


