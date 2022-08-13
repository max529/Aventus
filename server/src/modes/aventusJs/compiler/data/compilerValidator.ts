import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseStruct } from '../../../../ts-file-parser/src/tsStructureParser';
import { AventusConfig } from '../../config';
import { uriToPath } from '../../utils';
import { createErrorTs, createErrorTsPos } from '../utils';

export function compileValidatorData(document: TextDocument, config: AventusConfig): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	const specialTag = config.data?.disableIdentifier ? "" : config.identifier;

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

		//#region found Data or IData
		let foundData = false;
		if (classTemp.isInterface) {
			if (classTemp.name != "IData") {
				for (let implement of classTemp.extends) {
					if (implement.typeName == 'IData') {
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
				if (implement.typeName == 'Data') {
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
				diagnostics.push(createErrorTsPos(document, 'Class must implement Data', classTemp.start, classTemp.end));
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