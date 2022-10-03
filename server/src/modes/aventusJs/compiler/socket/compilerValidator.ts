import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument } from '../../../../ts-file-parser/src/tsStructureParser';
import { AventusConfig } from '../../config';
import { uriToPath } from '../../utils';
import { createErrorTsPos } from '../utils';

export function compileValidatorSocket(document: TextDocument, config: AventusConfig): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];

	const struct = parseDocument(document);

	for (let enumTemp of struct.enumDeclarations) {

		if (!enumTemp.isExported) {
			diagnostics.push(createErrorTsPos(document, 'Enum must be exported', enumTemp.start, enumTemp.end));
		}
	}

	for (let classTemp of struct.classes) {

		if (!classTemp.isExported) {
			diagnostics.push(createErrorTsPos(document, 'Class must start with "export"', classTemp.start, classTemp.end));
		}
		if (!classTemp.isInterface) {
			let foundData = false;
			for (let implement of classTemp.implements) {
				if (implement.typeName == 'ISocket' || implement.typeName == "Aventus.ISocket") {
					foundData = true;
					break;
				}
			}
			if (!foundData) {
				diagnostics.push(createErrorTsPos(document, 'Class must implement ISocket', classTemp.start, classTemp.end));
			}
		}
	}
	return diagnostics;
}