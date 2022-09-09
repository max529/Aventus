import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusConfig } from '../../config';
import { genericCompile } from '../utils';
import { compileValidatorSocket } from './compilerValidator';


export function compileSocket(document: TextDocument, config: AventusConfig): {
	nameCompiled: string[],
	nameDoc: string[],
	src: string,
	doc: string,
	dependances: string[]
} {
	if (compileValidatorSocket(document, config).length > 0) {
		return {
			nameCompiled: [],
			nameDoc: [],
			src: "",
			doc: "",
			dependances: []
		};
	}

	return genericCompile(document);
}