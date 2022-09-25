import { TextDocument } from 'vscode-languageserver-textdocument';
import { languageIdHTML, languageIdJs, languageIdSCSS } from '../../config';
import { aventusExtension } from '../aventusJs/aventusDoc';

interface ScanResult {
	scriptOffset: number,
	scriptText: string,
	cssOffset: number,
	cssText: string,
	htmlOffset: number,
	htmlText: string,
}

export class AventusWcDoc {
	private document: TextDocument;
	private scan: ScanResult;
	constructor(document: TextDocument) {
		this.document = document;
		this.scan = {
			cssOffset: -1,
			cssText: '',
			htmlOffset: -1,
			htmlText: '',
			scriptOffset: -1,
			scriptText: ''
		}
		this.analyze();
	}

	public refresh(document: TextDocument) {
		this.document = document;
		this.analyze();
	}

	public getSCSS(){
		return TextDocument.create(
			this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentStyle),
			languageIdSCSS,
			0,
			this.scan.cssText
		)
	}
	public getSCSSOffset(){
		return this.scan.cssOffset;
	}
	public getHTML(){
		return TextDocument.create(
			this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentView),
			languageIdHTML,
			0,
			this.scan.htmlText
		)
	}
	public getHTMLOffset(){
		return this.scan.htmlOffset;
	}
	public getJS(){
		return TextDocument.create(
			this.document.uri.replace(aventusExtension.Component, aventusExtension.ComponentLogic),
			languageIdJs,
			0,
			this.scan.scriptText
		)
	}
	public getJSOffset(){
		return this.scan.scriptOffset;
	}

	private analyze() {
		let text = this.document.getText();
		let regexScript = /<script>((\s|\S)*)<\/script>/g;
		let regexTemplate = /<template>((\s|\S)*)<\/template>/g;
		let regexStyle = /<style>((\s|\S)*)<\/style>/g;
		
		let scriptMatch = regexScript.exec(text);
		if (scriptMatch) {
			this.scan.scriptOffset = scriptMatch.index + 8;
			let endIndex = scriptMatch.index + scriptMatch[0].length - 9;
			this.scan.scriptText = text.substring(this.scan.scriptOffset, endIndex)
		}
		else{
			this.scan.scriptOffset = -1;
			this.scan.scriptText = "";
		}

		let styleMatch = regexStyle.exec(text);
		if (styleMatch) {
			this.scan.cssOffset = styleMatch.index + 7;
			let endIndex = styleMatch.index + styleMatch[0].length - 8;
			this.scan.cssText = text.substring(this.scan.cssOffset, endIndex)
		}
		else{
			this.scan.cssOffset = -1;
			this.scan.cssText = "";
		}

		let htmlMatch = regexTemplate.exec(text);
		if (htmlMatch) {
			this.scan.htmlOffset = htmlMatch.index + 10;
			let endIndex = htmlMatch.index + htmlMatch[0].length - 11;
			this.scan.htmlText = text.substring(this.scan.htmlOffset, endIndex)
		}
		else{
			this.scan.htmlOffset = -1;
			this.scan.htmlText = "";
		}
	}
}