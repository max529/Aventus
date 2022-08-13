import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusConfig } from '../../config';
import { genericCompile } from '../utils';
import { compileValidatorLib } from './compilerValidator';

export function compileLib(document: TextDocument, config: AventusConfig): {
	nameCompiled: string[],
	nameDoc: string[],
	src: string,
	doc: string,
	dependances: string[],
} {
	if (compileValidatorLib(document, config).length > 0) {
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