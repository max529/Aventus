import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument } from '../../../../ts-file-parser/src/tsStructureParser';
import { AventusConfig } from '../../config';
import { uriToPath } from '../../utils';
import { createErrorTs, createErrorTsPos } from '../utils';

export function compileValidatorData(document: TextDocument, config: AventusConfig): Diagnostic[] {
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

		//#region found Data or IData
		let foundData = false;
		if (classTemp.isInterface) {
			if (classTemp.name != "IData") {
				for (let implement of classTemp.extends) {
					if (implement.typeName == 'IData' || implement.typeName == 'Aventus.IData') {
						foundData = true;
						break;
					}
				}
			}
			else {
				foundData = true;
			}
		}
		else {
			for (let implement of classTemp.implements) {
				if (implement.typeName == 'IData' || implement.typeName == 'Aventus.IData') {
					foundData = true;
					break;
				}
			}
		}

		if (!foundData) {
			if (classTemp.isInterface) {
				diagnostics.push(createErrorTsPos(document, 'Interface must extends IData', classTemp.start, classTemp.end));
			}
			else {
				diagnostics.push(createErrorTsPos(document, 'Class must implement IData', classTemp.start, classTemp.end));
			}
		}
		//#endregion

		for (let field of classTemp.fields) {
			if (!field.valueConstraint) {
				diagnostics.push(createErrorTsPos(document, `Property '${field.name}' has no initializer and is not definitely assigned.`, field.start, field.end));
			}
		}
	}

	return diagnostics;
}