const ts = require("typescript");
import { Diagnostic } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { jsMode } from '../../../../mode';
import { BasicType, ClassModel, FieldModel, TypeKind, TypeModel, UnionType } from '../../../../ts-file-parser';
import { getAlias } from '../../../../ts-file-parser/src/tsStructureParser';
import { aventusExtension } from '../../aventusDoc';
import { pathToUri } from '../../utils';
import { createErrorTsPos } from '../utils';
import { configTS, CustomFieldModel, CustomTypeAttribute, TYPES } from './def';

function prepareMethodToTranspile(methodTxt) {
	methodTxt = methodTxt.trim();
	if (methodTxt.startsWith("function")) {
		methodTxt = methodTxt.replace("function", "");
		methodTxt = methodTxt.trim();
	}
	if (!methodTxt.match(/^\(.*?\)( *?)=>/g) && !methodTxt.match(/^\S*?( *?)=>/g)) {
		methodTxt = methodTxt.replace(/^.*?\(/g, "(");
		let match = methodTxt.match(/^\(.*?\)/g);
		methodTxt = methodTxt.replace(match[0], match[0] + " => ");
	}
	return methodTxt;
}
export function transpileMethod(methodTxt, paramsName: any[] = []) {
	methodTxt = prepareMethodToTranspile(methodTxt);
	let method = ts.transpile(methodTxt, configTS).trim();
	method = method.substring(0, method.length - 1);
	method = "(" + method + ")(" + paramsName.join(",") + ")";
	// method = minify(method, { mangle: false }).code;
	return method;
}
export function transpileMethodNoRun(methodTxt) {
	methodTxt = prepareMethodToTranspile(methodTxt);
	let method = ts.transpile(methodTxt, configTS).trim();
	method = method.substring(0, method.length - 1);
	method = "(" + method + ")";
	// method = minify(method, { mangle: false }).code;
	return method;
}
export function loadFields(classInfo: ClassModel, isBase: boolean): { [key: string]: CustomFieldModel } {
	let result: { [key: string]: CustomFieldModel } = {};
	for (let field of classInfo.fields) {
		let found = false;
		if (field.name == "states") {
			result[field.name] = {
				...field,
				propType: 'State',
				inParent: !isBase,
			}
			found = true;
		}
		for (let decorator of field.decorators) {
			if (decorator.name == "Attribute") {
				result[field.name] = {
					...field,
					propType: 'Attribute',
					inParent: !isBase,
				}
				found = true;
				break;
			}
			else if (decorator.name == "Property") {
				result[field.name] = {
					...field,
					propType: 'Property',
					inParent: !isBase,
				}
				found = true;
				break;
			}
			else if (decorator.name == "Watch") {
				result[field.name] = {
					...field,
					propType: 'Watch',
					inParent: !isBase,
				}
				found = true;
				break;
			}
			else if (decorator.name == "ViewElement") {
				result[field.name] = {
					...field,
					propType: 'ViewElement',
					inParent: !isBase,
					arguments: decorator.arguments
				}
				found = true;
				break;
			}
		}
		if (!found) {
			result[field.name] = {
				...field,
				propType: 'Simple',
				inParent: !isBase,
			}
		}
	}
	return result;
}

export function getTypeForAttribute(currentDoc: TextDocument, field: FieldModel) {
	let result: {
		realType: CustomTypeAttribute,
		diagnostics: Diagnostic[],
		definedValues: {
			name: string,
			description: string,
		}[]
	} = {
		realType: 'string',
		diagnostics: [],
		definedValues: [],
	}
	const _loadTypeRecu = (type: TypeModel): boolean => {
		if (type.typeKind == TypeKind.UNION) {
			let unionType: UnionType = type as UnionType;
			for (let option of unionType.options) {
				if (option.typeName == TYPES.literal) {
					let literalType = option as BasicType;
					_loadTypeRecu(literalType);
				}
				else {
					result.diagnostics.push(createErrorTsPos(currentDoc, "Can't use the type " + option.typeName + " inside union", field.start, field.end));
					return false;
				}
			}
			return true;
		}
		else if (type.typeName == TYPES.literal) {
			result.realType = 'string';
			let literalType = type as BasicType;
			result.definedValues.push({
				name: literalType.basicName,
				description: '',
			})
			return true;
		}
		else {
			for (let TYPE in TYPES) {
				if (TYPES[TYPE] == type.typeName) {
					result.realType = TYPES[TYPE];
					return true;
				}
			}

			// check alias
			let basicType = type as BasicType;
			if (basicType.modulePath) {
				let uri = pathToUri(basicType.modulePath);
				let aliasNode = getAlias(basicType.typeName, uri);
				if(aliasNode && aliasNode.type){
					return _loadTypeRecu(aliasNode.type);
				}
			}

		}
		return false;
	}
	if (field.type && _loadTypeRecu(field.type)) {
		return result;
	}
	else {
		result.diagnostics.push(createErrorTsPos(currentDoc, "can't use the the type " + field.type?.typeName + " as attribute / property", field.start, field.end));
	}
	return result;
}