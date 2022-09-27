import { TextDocument } from 'vscode-languageserver-textdocument';
import { languageIdHTML, languageIdJs, languageIdSCSS } from '../../config';
import { aventusExtension } from '../aventusJs/aventusDoc';

interface ScanSection {
	start: number,
	end: number,
	text: string,
}
interface ScanResult {
	script: ScanSection,
	css: ScanSection,
	html: ScanSection,
}
export interface AventusWcDocSection {
	document: TextDocument,
	text: string,
	start: number,
	end: number
}

export class AventusWcDoc {
	public document: TextDocument;
	private scan: ScanResult;
	constructor(document: TextDocument) {
		this.document = document;
		this.scan = {
			script: {
				start: 0,
				end: 0,
				text: ''
			},
			css: {
				start: 0,
				end: 0,
				text: ''
			},
			html: {
				start: 0,
				end: 0,
				text: ''
			}
		}
		this.analyze();
	}

	public refresh(document: TextDocument) {
		this.document = document;
		this.analyze();
	}

	public getSCSSInfo(): AventusWcDocSection {
		return {
			document: TextDocument.create(
				this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentStyle),
				languageIdSCSS,
				this.document.version,
				this.scan.css.text
			),
			text: this.scan.css.text,
			start: this.scan.css.start,
			end: this.scan.css.end
		}
	}

	public getHTMLInfo(): AventusWcDocSection {
		return {
			document: TextDocument.create(
				this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentView),
				languageIdHTML,
				this.document.version,
				this.scan.html.text
			),
			text: this.scan.html.text,
			start: this.scan.html.start,
			end: this.scan.html.end
		};
	}

	public getJSInfo(): AventusWcDocSection {
		return {
			document: TextDocument.create(
				this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentLogic),
				languageIdJs,
				this.document.version,
				this.scan.script.text
			),
			text: this.scan.script.text,
			start: this.scan.script.start,
			end: this.scan.script.end
		};

	}


	private analyze() {
		let text = this.document.getText();
		let regexScript = /<script>((\s|\S)*)<\/script>/g;
		let regexTemplate = /<template>((\s|\S)*)<\/template>/g;
		let regexStyle = /<style>((\s|\S)*)<\/style>/g;

		let scriptMatch = regexScript.exec(text);
		if (scriptMatch) {
			let startIndex = this.scan.script.start = scriptMatch.index + 8;
			let endIndex = this.scan.script.end = scriptMatch.index + scriptMatch[0].length - 9;
			this.scan.script.text = text.substring(startIndex, endIndex)
		}
		else {
			this.scan.script.start = 0;
			this.scan.script.end = 0;
			this.scan.script.text = "";
		}

		let styleMatch = regexStyle.exec(text);
		if (styleMatch) {
			let startIndex = this.scan.css.start = styleMatch.index + 7;
			let endIndex = this.scan.css.end = styleMatch.index + styleMatch[0].length - 8;
			this.scan.css.text = text.substring(startIndex, endIndex);
		}
		else {
			this.scan.css.start = 0;
			this.scan.css.end = 0;
			this.scan.css.text = "";
		}

		let htmlMatch = regexTemplate.exec(text);
		if (htmlMatch) {
			let startIndex = this.scan.html.start = htmlMatch.index + 10;
			let endIndex = this.scan.html.end = htmlMatch.index + htmlMatch[0].length - 11;
			this.scan.html.text = text.substring(startIndex, endIndex);
		}
		else {
			this.scan.html.start = 0;
			this.scan.html.end = 0;
			this.scan.html.text = "";
		}
	}

	public static extractContent(text: string) {
		let regexScript = /<script>((\s|\S)*)<\/script>/g;
		let regexTemplate = /<template>((\s|\S)*)<\/template>/g;
		let regexStyle = /<style>((\s|\S)*)<\/style>/g;

		let result = {
			cssText: '',
			htmlText: '',
			scriptText: ''
		}

		let scriptMatch = regexScript.exec(text);
		if (scriptMatch) {
			let startIndex = scriptMatch.index + 8;
			let endIndex = scriptMatch.index + scriptMatch[0].length - 9;
			result.scriptText = text.substring(startIndex, endIndex)
		}

		let styleMatch = regexStyle.exec(text);
		if (styleMatch) {
			let startIndex = styleMatch.index + 7;
			let endIndex = styleMatch.index + styleMatch[0].length - 8;
			result.cssText = text.substring(startIndex, endIndex)
		}

		let htmlMatch = regexTemplate.exec(text);
		if (htmlMatch) {
			let startIndex = htmlMatch.index + 10;
			let endIndex = htmlMatch.index + htmlMatch[0].length - 11;
			result.htmlText = text.substring(startIndex, endIndex)
		}
		return result;
	}
}