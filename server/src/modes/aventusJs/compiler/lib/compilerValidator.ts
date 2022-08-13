import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseStruct } from '../../../../ts-file-parser/src/tsStructureParser';
import { AventusConfig } from '../../config';
import { uriToPath } from '../../utils';
import { createErrorTs, createErrorTsPos } from '../utils';

export function compileValidatorLib(document: TextDocument, config: AventusConfig): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];

	const specialTag = config.libs?.disableIdentifier ? "" : config.identifier;
	const struct = parseStruct(document.getText(), {}, uriToPath(document.uri));

	for (let enumTemp of struct.enumDeclarations) {
		if (!enumTemp.name.startsWith(specialTag)) {
			diagnostics.push(createErrorTsPos(document, `Enum name must start with "${specialTag}"`, enumTemp.start, enumTemp.end));
		}

		if (!enumTemp.isExported) {
			diagnostics.push(createErrorTsPos(document, 'Enum must be exported', enumTemp.start, enumTemp.end));
		}
	}
	for (let classTemp of struct.classes) {
		if (!classTemp.name.startsWith(specialTag)) {
			diagnostics.push(createErrorTsPos(document, `Class name must start with "${specialTag}"`, classTemp.start, classTemp.end));
		}

		if (!classTemp.isExported) {
			diagnostics.push(createErrorTsPos(document, 'Class must start with "export"', classTemp.start, classTemp.end));
		}
	}

	return diagnostics;
}