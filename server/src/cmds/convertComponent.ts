import { existsSync, fstat, readFileSync, rename, renameSync, writeFileSync } from 'fs';
import { normalize } from 'path';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { aventusExtension } from '../modes/aventusJs/aventusDoc';
import { getFolder, uriToPath } from '../modes/aventusJs/utils';


const REVERSE_TYPES = {
	'string': 'string',
	'bool': 'boolean',
	'number': 'number',
	'date': "Date",
	"datetime": 'DateTime'
}
var TYPES = {
	String: 'string',
	Boolean: 'bool',
	Number: 'number',
	Date: 'date',
	DateTime: 'datetime'
}
const specialTag = "Dt";
export class ConvertComponent {
	static cmd: string = "aventus.convertComponent";
	constructor(params: ExecuteCommandParams) {
		if (params.arguments) {
			let compPath = uriToPath(params.arguments[0].external);
			let folder = getFolder(compPath);
			compPath = compPath.replace(/\\/g, "/");
			let script: any = readFileSync(compPath, 'utf8');
			script = script.trim().replace('export default', '{self :') + '}'
			script = script.replace(/super\(\);*/g, '/*super()*/');
			let comments = loadComments(script);
			script = eval('(' + script + ')')

			//#region module name
			let arr = compPath.split("/");
			let modulename = "";
			for (let i = arr.length - 2; i >= 0; i--) {
				if (arr[i] != 'default') {
					modulename = arr[i];
					break;
				}
			}

			var splitted = modulename.replace(/_/g, '-').split('-');
			for (var i = 0; i < splitted.length; i++) {
				splitted[i] = splitted[i].charAt(0).toUpperCase() + splitted[i].slice(1);
			}
			var classname = specialTag + splitted.join('');
			let classDoc = "";
			if (script.self.description) {
				classDoc = `/**
 * ${script.self.description} 
 */`
			}
			let template = `$imports
${classDoc}$override
export$abstract class $className extends $parentName implements DefaultComponent {

	//#region static
	$statics		
	//#endregion
			
			
	//#region props
	$props		
	//#endregion
			
			
	//#region variables
	$variables		
	//#endregion
			
			
	//#region states
	$states		
	//#endregion
			
			
	//#region constructor
	$constructor		
	//#endregion
			
			
	//#region methods
	$methods
	$postCreation			
	//#endregion
}`

			template = template.replace(/\$className/g, classname);
			//#endregion

			//#region abstract
			if (script.self.abstract) {
				template = template.replace(/\$abstract/g, ' abstract');
			}
			else {
				template = template.replace(/\$abstract/g, '');
			}
			//#endregion

			//#region parent
			let parentName = "WebComponent";
			let overrideView = ''
			let importPath = ''
			if (script.self.extends) {
				if (script.self.extends.overrideView) {
					overrideView = '@overrideView';
				}
				arr.pop();
				let extendPath = arr.join("/") + "/" + script.self.extends.path;
				extendPath = normalize(extendPath).replace(/\\/g, "/");
				arr = extendPath.split("/");
				for (let i = arr.length - 1; i >= 0; i--) {
					if (arr[i] != 'default') {
						parentName = arr[i];
						break;
					}
				}
				var splitted = parentName.replace(/_/g, '-').split('-');
				for (var i = 0; i < splitted.length; i++) {
					splitted[i] = splitted[i].charAt(0).toUpperCase() + splitted[i].slice(1);
				}
				parentName = specialTag + splitted.join('');
				importPath = `import { ${parentName} } from "${script.self.extends.path}/script";`
			}
			template = template.replace(/\$override/g, overrideView);
			template = template.replace(/\$parentName/g, parentName);
			template = template.replace(/\$imports/g, importPath);
			//#endregion

			//#region props
			let propTxt = "";
			if (script.self.props) {
				for (let key in script.self.props) {
					let prop = script.self.props[key];
					let doc = ""
					if (prop.description) {
						doc = `/**
	 * ${prop.description}
	 */
	`
					}
					let onChange = ''
					if (prop.onChange) {
						let match = prop.onChange.toString().match(/\{((\s|\S)*)\}/g)[0];
						match = match.substring(1, match.length - 1).trim().replace(/this/g, 'target');
						onChange = `(target: ${classname}) => {
					${match}
				}`
					}
					let defaultValue = "";
					if (prop.defaultValue) {
						defaultValue = ' = "' + prop.defaultValue + '"';
					}
					propTxt += `
	${doc}@attribute(${onChange})
	${key}: ${REVERSE_TYPES[prop.type]}${defaultValue}
`
				}
			}
			template = template.replace(/\$props/g, propTxt);
			//#endregion

			//#region variables
			let varsTxt = "";
			if (script.self.variables) {
				for (const property in script.self.variables) {
					let type = 'any';
					let value = script.self.variables[property];
					if (Array.isArray(value)) {
						value = JSON.stringify(script.self.variables[property])
					}
					else if (typeof value == "string") {
						type = 'string';
						value = JSON.stringify(script.self.variables[property])
					}
					else if (typeof value == "boolean") {
						type = 'boolean';
					}
					else if (!isNaN(Number(script.self.variables[property]))) {
						type = 'number'
					}
					else {
						value = JSON.stringify(script.self.variables[property])
					}
					varsTxt += `${property}: ${type} = ${value};\r\n`;
				}
			}
			template = template.replace(/\$variables/g, varsTxt);
			//#endregion

			//#region methods + events
			let methodTxt = "";
			if (script.self.methods) {
				for (let method in script.self.methods) {
					if (comments.hasOwnProperty(method)) {
						methodTxt += comments[method];
					}
					methodTxt += script.self.methods[method].toString().replace(/\/\*super\(\)\*\//g, 'super.' + method + '();') + '\r\n'
				}
			}
			if (script.self.events) {
				for (let method in script.self.events) {
					if (comments.hasOwnProperty(method)) {
						methodTxt += comments[method];
					}
					methodTxt += script.self.events[method].toString().replace(/\/\*super\(\)\*\//g, 'super.' + method + '();') + '\r\n'
				}
			}
			template = template.replace(/\$methods/g, methodTxt);
			//#endregion

			//#region static
			let staticTxt = "";
			if (script.self.static) {
				for (let method in script.self.static) {
					staticTxt += "static " + script.self.static[method].toString().replace(/\/\*super\(\)\*\//g, 'super.' + method + '();') + '\r\n'
				}
			}
			template = template.replace(/\$statics/g, staticTxt);
			//#endregion

			//#region postCreation
			let postCreationTxt = "";
			if (script.self._postCreation) {
				let content = script.self._postCreation.toString().match(/\{(\s|\S)*\}/)[0]
				content = content.substring(1, content.length - 1).trim().replace(/\/\*super\(\)\*\//g, 'super.postCreation();')
				postCreationTxt = `protected override postCreation(): void {
						${content}
					}`
			}
			template = template.replace(/\$postCreation/g, postCreationTxt);
			//#endregion

			//#region constructor
			let constructorCreationTxt = "";
			if (script.self._constructor) {
				let content = script.self._constructor.toString().match(/\{(\s|\S)*\}/)[0]
				content = content.substring(1, content.length - 1).trim();
				constructorCreationTxt = `constructor(){
						super();
						${content}
					}`

			}
			template = template.replace(/\$constructor/g, constructorCreationTxt);
			//#endregion

			//#region states
			let statesTxt = "";
			if (script.self.states) {
				let objectKeys = Object.keys(script.self.states);
				for (let state in script.self.states) {
					let fcts: string[] = [];
					for (let fct in script.self.states[state]) {
						fcts.push(script.self.states[state][fct].toString());
					}
					statesTxt += `"${state}":{\r\n${fcts.join(",\r\n")}}`;
					if (state === objectKeys[objectKeys.length - 1]) {
						statesTxt += "\r\n";
					} else {
						statesTxt += ",\r\n";
					}
				}
				let ctxState = JSON.stringify(script.self.states)
				statesTxt = ` states?: ComponentStates = {
						${statesTxt}}`;
			}
			template = template.replace(/\$states/g, statesTxt);
			//#endregion
			let finalPath = compPath.substring(0, compPath.length - 2) + 'ts';
			finalPath = finalPath.replace("script.ts", modulename + aventusExtension.ComponentLogic);
			writeFileSync(finalPath, template);

			if (existsSync(folder + "/index.html")) {
				renameSync(folder + "/index.html", folder + "/" + modulename + aventusExtension.ComponentView)
			}
			if (existsSync(folder + "/style.scss")) {
				renameSync(folder + "/style.scss", folder + "/" + modulename + aventusExtension.ComponentStyle)
			}
		}
	}
}

function loadComments(script) {
	let comments = {};
	var matches = script.match(/^(?!.*\/\/).*\/\*\*(\s|\S)*?\*\//gm);
	if (matches) {
		for (let i = 0; i < matches.length; i++) {
			let index = script.indexOf(matches[i]);
			let partAfter = script.slice(index + matches[i].length);
			let matchName = partAfter.match(/.*\(/g)
			if (matchName) {
				let fctName = matchName[0].replace("\(", "").trim();
				comments[fctName] = matches[i] + "\r\n";
			}
		}
	}
	return comments;
}
