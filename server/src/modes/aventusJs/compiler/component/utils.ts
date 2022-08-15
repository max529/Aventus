const ts = require("typescript");
import { ClassModel } from '../../../../ts-file-parser';
import { configTS, CustomFieldModel } from './def';

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
				propType: 'state',
				inParent: !isBase,
			}
			found = true;
		}
		for (let decorator of field.decorators) {
			if (decorator.name == "attribute") {
				result[field.name] = {
					...field,
					propType: 'attribute',
					inParent: !isBase,
				}
				found = true;
				break;
			}
			else if (decorator.name == "mutable") {
				result[field.name] = {
					...field,
					propType: 'mutable',
					inParent: !isBase,
				}
				found = true;
				break;
			}
		}
		if (!found) {
			result[field.name] = {
				...field,
				propType: 'simple',
				inParent: !isBase,
			}
		}
	}
	return result;
}
