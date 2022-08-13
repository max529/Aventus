import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { extension } from '../../../../server';
import { ArrayType, ClassModel, DefaultClassModel, FieldModel, Module, parseStruct, TypeKind } from '../../../../ts-file-parser';
import { CustomClassInfo, ItoPrepare, TYPES } from './compilerComponent';
import { uriToPath } from './../../utils';
import { createErrorTs, createErrorTsPos } from '../utils';
import { AventusConfig } from '../../config';
import { aventusExtension } from '../../aventusDoc';
import { pathToFileURL } from 'url';
import { compileScss, ScssCompilerResult } from '../../../aventusSCSS/compiler/compileScss';

const fs = require("fs");
const path = require('path');
const ts = require("typescript");
const nodeSass = require('sass');
const cheerio = require('cheerio');


let currentDoc: TextDocument;
export function compileValidatorComponent(document: TextDocument, config: AventusConfig): Diagnostic[] {
	currentDoc = document;
	let result: Diagnostic[] = [];
	let specialTag = config.identifier;
	let specialTagLower = specialTag.toLowerCase();
	let componentPath = uriToPath(document.uri)
	let folderTemp = componentPath.split("/");
	let scriptName = folderTemp.pop();
	let folderPath = folderTemp.join("/");
	const getView = () => {
		let htmlName = scriptName?.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentView) || '';
		if (fs.existsSync(folderPath + '/' + htmlName)) {
			return fs.readFileSync(folderPath + '/' + htmlName, 'utf8')
		}
		result.push(createErrorTs(currentDoc, "Can't find a view inside " + folderPath + " for " + scriptName))
		return "";
	}
	const getStylePath = () => {
		let styleName = scriptName?.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle) || '';
		if (fs.existsSync(folderPath + '/' + styleName)) {
			return folderPath + '/' + styleName
		}
		result.push(createErrorTs(currentDoc, "Can't find a style file for " + folderPath + " for " + scriptName))
		return "";
	}
	let view = getView().replace(/<!--[\s\S]*?-->/g, '').trim();
	let script = document.getText()
	let stylePath = getStylePath();
	let style: ScssCompilerResult;
	if (stylePath != "") {
		style = compileScss(getStylePath());
		if (!style.success) {
			result.push(createErrorTs(currentDoc, style.errorInfo));
		}
	}
	else {
		style = {
			success: true,
			content: "",
			rawContent: "",
			errorInfo: "",
			importedPath: []
		}
	}

	let jsonStructure = parseStruct(script, {}, componentPath);

	if (jsonStructure.functions.length > 0) {
		for (let fct of jsonStructure.functions) {
			result.push(createErrorTsPos(currentDoc, "You can't declare function outside of your class", fct.start, fct.end))
		}
	}
	if (jsonStructure.variables.length > 0) {
		for (let variable of jsonStructure.variables) {
			result.push(createErrorTsPos(currentDoc, "You can't declare variable outside of your class", variable.start, variable.end))
		}
	}
	let customClassInfo: CustomClassInfo = {
		debuggerOption: {},
	}
	let classInfo: ClassModel & CustomClassInfo = {
		...DefaultClassModel,
		...customClassInfo
	};
	for (let i = 0; i < jsonStructure.classes.length; i++) {
		if (!jsonStructure.classes[i].isInterface) {
			let foundDefaultComponent = false;
			for (let implement of jsonStructure.classes[i].implements) {
				if (implement.typeName == 'DefaultComponent') {
					foundDefaultComponent = true;
					break;
				}
			}
			if (foundDefaultComponent) {
				if (classInfo.name === "") {
					classInfo = {
						...jsonStructure.classes[i],
						...customClassInfo
					}
				}
				else {
					result.push(createErrorTs(currentDoc, "Only one class is allowed inside a file. Get " + classInfo.name + " and " + jsonStructure.classes[i].name));
				}
			}
			else {
				result.push(createErrorTs(currentDoc, "Only class that implements DefaultComponent can be used"));
			}
		}
	}
	if (classInfo.name == "") {
		result.push(createErrorTs(currentDoc, "Can't found a class to compile inside"))
		return result;
	}
	let toPrepare: ItoPrepare = {
		variablesPerso: {},
		eventsPerso: [],
		pressEvents: {},
		allFields: {},
		actionByComponent: {},
		loop: {},
		idElement: 0,
		style: style.content,
		script: classInfo,
		view: view,
	}

	for (let decorator of classInfo.decorators) {
		if (decorator.name == 'overrideView') {
			classInfo.overrideView = true;
		}
		else if (decorator.name == 'Debugger') {
			if (decorator.arguments.length > 0) {
				// TODO pas sur
				classInfo.debuggerOption = { ...classInfo.debuggerOption, ...decorator.arguments }
			}
		}
	}

	if (classInfo.extends[0]?.typeName == "WebComponent") {
		classInfo.overrideView = true;
	}
	const _loadParent = (jsonStruct: Module, isFirst: boolean = true) => {
		if (jsonStruct.classes.length > 0) {
			// let fields = loadFields(jsonStruct.classes[0], isFirst);
			// toPrepare.allFields = {
			// 	...toPrepare.allFields,
			// 	...fields
			// }

			if (jsonStruct.classes[0].extends.length > 0 && jsonStruct.classes[0].extends[0].typeName != "WebComponent") {
				for (let importTemp of jsonStruct._imports) {
					for (let name of importTemp.clauses) {
						if (name == jsonStruct.classes[0].extends[0].typeName) {
							let newPath = importTemp.absPathString;
							let parentScript = fs.readFileSync(newPath, 'utf8').trim().replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
							newPath = newPath.replace(/\\/g, "/");
							let parentStructure = parseStruct(parentScript, {}, newPath);
							_loadParent(parentStructure, false);
							return;
						}
					}
				}
				//result.push(createErrorTs(currentDoc, "can't found the path for parent " + jsonStruct.classes[0].extends[0].typeName));
			}
		}

	}
	_loadParent(jsonStructure);
	var $;
	const _createClassname = () => {
		let splitted = classInfo.name.match(/[A-Z][a-z]+/g);
		if (splitted) {
			const specialTagClassName = config.components?.disableIdentifier ? "" : specialTag;
			if (specialTagClassName.length > 0 && splitted[0].toLowerCase() != specialTagClassName.toLowerCase()) {
				result.push(createErrorTs(currentDoc, "Your class must start with " + specialTagClassName))
			}
			let parentClass = 'WebComponent';
			if (classInfo.extends.length > 0) {
				parentClass = classInfo.extends[0].typeName;
			}
		}
	}
	const _prepareView = () => {
		$ = cheerio.load(toPrepare.view);
		const _getId = (el) => {
			if ($(el).attr('_id')) {
				return $(el).attr('_id');
			} else {
				$(el).attr('_id', classInfo.name.toLowerCase() + '_' + toPrepare.idElement);
				toPrepare.idElement++;
				return classInfo.name.toLowerCase() + '_' + (toPrepare.idElement - 1);
			}
		}
		let createPressEvent = (el) => {
			let _id = _getId(el);
			if (!toPrepare.pressEvents.hasOwnProperty(_id)) {
				toPrepare.pressEvents[_id] = {};
			}
			return toPrepare.pressEvents[_id]
		}
		let pressEventMap = {
			[specialTagLower + '-press']: "onPress",
			[specialTagLower + '-longpress']: "onLongPress",
			[specialTagLower + '-drag']: "onDrag",
			[specialTagLower + '-press-stop']: "onStop",
			[specialTagLower + '-press-start']: "onStart",
			[specialTagLower + '-longpress-delay']: "delay",
		};
		const _checkAttribut = (el) => {
			for (var key in el.attribs) {
				if (key === specialTagLower + '-element') {
					const _addElement = () => {
						var _id = _getId(el);
						var value = el.attribs[key].split('.');
						let varName = value[0];
						var selectorFctTxt = `get ${varName} () {
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="$id"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }\r\n`
						if (varName.endsWith("[]")) {
							varName = varName.replace("[]", "");
							selectorFctTxt = `get ${varName} () {
                            var list = Array.from(this.shadowRoot.querySelectorAll('[_id="$id"]'));
                            return list;
                        }\r\n`
						}

						if (!toPrepare.variablesPerso.hasOwnProperty(varName)) {
							if (value.length == 1) {
								toPrepare.variablesPerso[varName] = selectorFctTxt.replace(/\$id/g, _id);
							} else {
								toPrepare.variablesPerso[varName] = ''
							}
						}

						$(el).removeAttr(key);
					}
					_addElement();
				}
				else if (pressEventMap.hasOwnProperty(key)) {
					let value = el.attribs[key];
					let pressEvent = createPressEvent(el);
					pressEvent[pressEventMap[key]] = value;
				}
				else if (key.startsWith(specialTagLower + '-')) {
					var _addClick = () => {
						var _id = _getId(el);
						var value = el.attribs[key];
						toPrepare.eventsPerso.push({
							componentId: _id,
							value: value,
							event: key.replace(specialTagLower + '-', '')
						});
						$(el).removeAttr(key);
					}
					_addClick();
				}
				else {
					var _addProp = () => {
						var matches = el.attribs[key].match(/\{\{(.*?)\}\}/g);
						if (matches && matches.length > 0) {
							var variables: string[] = [];
							for (var i = 0; i < matches.length; i++) {
								let variableName = matches[i].replace(/\{\{|\}\}/g, '').trim();
								variables.push(variableName);
								el.attribs[key] = el.attribs[key].replace(matches[i], '{{' + variableName.toLowerCase() + '}}');
							}

							var _id = _getId(el);
							for (var i = 0; i < variables.length; i++) {
								let variableName = variables[i];
								if (!toPrepare.actionByComponent.hasOwnProperty(variableName)) {
									toPrepare.actionByComponent[variableName] = [];
								}

								toPrepare.actionByComponent[variableName].push({
									componentId: _id,
									prop: key.toLowerCase(),
									value: el.attribs[key]
								});


							}
							$(el).removeAttr(key);
						}
					}
					_addProp();
				}
			}


		}
		var _checkHTML = (el) => {
			if (el.type != 'tag') {
				return;
			}
			el = $(el);
			var containsElement = el.html().match(/<(\s|\S)*>(\s|\S)*<\/(\s|\S)*>/);
			// si la balise contient une autre balise on ne fait rien
			if (!containsElement || containsElement.length == 0) {
				// on regarde si le text contient une variable
				var matches = el.html().match(/\{\{(.*?)\}\}/g);
				if (matches && matches.length > 0) {
					let variables: string[] = [];
					// pour chaque variable
					for (var i = 0; i < matches.length; i++) {
						let variableName = matches[i].replace(/\{\{|\}\}/g, '').trim();
						variables.push(variableName);
						// on la normalize (on enleve les espaces)
						el.html(el.html().replace(matches[i], '{{' + variableName + '}}'));
					}

					var _id = _getId(el);
					for (var i = 0; i < variables.length; i++) {
						let variableName = variables[i];
						if (!toPrepare.actionByComponent.hasOwnProperty(variableName)) {
							toPrepare.actionByComponent[variableName] = [];
						}

						toPrepare.actionByComponent[variableName].push({
							componentId: _id,
							value: el.html()
						});
					}
					el.html('')
				}

			}
		}
		var _checkLoopIf = (el) => {
			if (el.name == "for") {
				let itemFound = false;
				let inFound = false;
				let itemName = "";
				for (var key in el.attribs) {
					if (key === 'item') {
						itemFound = true;
						itemName = el.attribs['item'];
						toPrepare.variablesPerso[itemName] = '';
					}
					else if (key == "in") {
						inFound = true;
						toPrepare.variablesPerso[el.attribs['item']] = '';
					}
				}
				if (!inFound || !itemFound) {
					result.push(createErrorTs(currentDoc, "Your loop must have an attribute item and an attribute in"))
					return;
				}
				const divTemp = $('<div style="display:none;"></div>')
				let idTemp = _getId(divTemp);
				toPrepare.loop[idTemp] = {};
				for (let key in toPrepare.actionByComponent) {
					if (key.startsWith(itemName + ".") || key == itemName) {
						toPrepare.loop[idTemp][key] = toPrepare.actionByComponent[key];
						delete toPrepare.actionByComponent[key];
					}
				}
				$(el).replaceWith(divTemp);
				let html = $(el).html();
			}
		}
		var _recuCheck = (el) => {
			_checkAttribut(el);
			_checkHTML(el);
			if (el.children) {
				for (var i = 0; i < el.children.length; i++) {
					_recuCheck(el.children[i]);
				}
			}
			_checkLoopIf(el);
		}

		_recuCheck($._root);
	}
	const _prepareFile = () => {

		const _createTemplateHtml = () => {
			let body = $('body').html().replace('&#xFEFF;', '');
			let removeBody = body;

			let regexBlock = /<block( name="(.*)")?>((\s|\S)*?)<\/block>/g
			let blocks: string[] = [];
			let slots: string[] = [];
			let result: RegExpExecArray | null;
			while (result = regexBlock.exec(body)) {
				blocks.push("'" + result[2] + "':`" + result[3] + "`")
				removeBody = removeBody.replace(result[0], '');
			}
			removeBody = removeBody.trim();
			if (removeBody.length > 0) {
				blocks.push("'default':`" + removeBody + "`")
			}

			let regexSlot = /<slot( name="(.*)")?>(\s|\S)*?<\/slot>/g
			while (result = regexSlot.exec(body)) {
				if (!result[2]) {
					result[2] = "default";
				}
				slots.push("'" + result[2] + "':`" + result[0] + "`")
			}


			let overrideViewFct = "";
			if (!classInfo.overrideView) {
				overrideViewFct = `
                let newHtml = parentInfo.html
                for (let blockName in info.blocks) {
                    if (!parentInfo.slots.hasOwnProperty(blockName)) {
                        throw "can't found slot with name " + blockName;
                    }
                    newHtml = newHtml.replace(parentInfo.slots[blockName], info.blocks[blockName]);
                }
                info.html = newHtml;
                `;
			}

		}

		const _selectedEl = () => {
			var selectedElTxt = '';
			for (var key in toPrepare.variablesPerso) {
				selectedElTxt += toPrepare.variablesPerso[key]
			}

		}

		const _createFields = () => {
			var attributesChanged = {};
			var variablesWatched: string[] = [];

			const _createAttribute = (field: FieldModel, args: any[] = []) => {
				let type = field.type?.typeName.toLowerCase() || '';
				if (!TYPES.hasOwnProperty(type)) {
					result.push(createErrorTsPos(currentDoc, "can't use the the type " + type + " as property", field.start, field.end));
				}
				if (field.name.toLowerCase() != field.name) {
					result.push(createErrorTsPos(currentDoc, "an attribute must be in lower case", field.start, field.end));
				}
				variablesWatched.push(field.name.toLowerCase());
				attributesChanged[field.name] = '';
			}
			const _createMutableVariable = (field: FieldModel, args: any[] = []) => {
				if (field.type) {
					if (field.type.typeKind == TypeKind.BASIC) {

					}
					if (field.type.typeKind == TypeKind.ARRAY) {
						let arrayType: ArrayType = field.type as ArrayType;
						let name = arrayType.base.typeName;
					}
					if (!field.valueConstraint || field.valueConstraint.value == undefined || field.valueConstraint.value == "undefined") {
						result.push(createErrorTsPos(document, "A mutable prop must be initialized", field.start, field.end));
					}

				}
			}

			let listToCheck = Object.keys(toPrepare.variablesPerso);
			for (let field of classInfo.fields) {
				let found = false;
				if (field.name == "states") {
					continue;
				}
				for (let decorator of field.decorators) {
					if (decorator.name == "attribute") {
						_createAttribute(field, decorator.arguments);
						found = true;
						break;
					}
					else if (decorator.name == "mutable") {
						_createMutableVariable(field, decorator.arguments);
						found = true;
						break;
					}
				}
				if (!found) {
				}
				let index = listToCheck.indexOf(field.name);
				if (index != -1) {
					listToCheck.splice(index, 1);
				}
			}


			for (let missingVar of listToCheck) {
				createErrorTs(currentDoc, "missing variable " + missingVar);
			}

		}






		_createTemplateHtml();

		_selectedEl();
		_createFields();
	}
	_createClassname();
	_prepareView();
	_prepareFile();


	return result;

}