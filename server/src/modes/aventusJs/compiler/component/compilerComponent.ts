import { scssMode } from '../../../../mode';
import { ArrayType, ClassModel, DefaultClassModel, FieldModel, ImportNode, Module, parseStruct, TypeKind } from '../../../../ts-file-parser';
import { AventusConfig } from '../../config';
import { compileDocTs, createErrorTs, createErrorTsPos, removeDecoratorFromClassContent, removeWhiteSpaceLines, replaceFirstExport } from '../utils';
import { compilerTemplate } from './compilerTemplate';
import * as cheerio from 'cheerio';
import { aventusExtension } from '../../aventusDoc';
import { compileScss, ScssCompilerResult } from '../../../aventusSCSS/compiler/compileScss';
import { AVENTUS_DEF_BASE_PATH } from '../../../libLoader';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { CompileComponentResult, configTS, CustomClassInfo, HTMLDoc, ItoPrepare, SCSSDoc, TYPES } from './def';
import { loadFields, transpileMethod, transpileMethodNoRun } from './utils';
import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { uriToPath } from '../../utils';

const ts = require("typescript");


export function compileComponent(document: TextDocument, config: AventusConfig): CompileComponentResult {
	let specialTag = config.identifier;
	let specialTagLower = specialTag.toLowerCase();
	let baliseName = "";
	let componentPath = uriToPath(document.uri)
	let folderTemp = componentPath.split("/");
	let scriptName = folderTemp.pop() || '';
	let folderPath = folderTemp.join("/");
	let result: CompileComponentResult = {
		success: false,
		diagnostics: [],
		result: {
			nameCompiled: '',
			nameDoc: '',
			src: '',
			doc: '',
			dependances: [],
			htmlDoc: {},
			scssVars: {}
		}
	}

	const getView = () => {
		let htmlName = scriptName.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentView);
		if (existsSync(folderPath + '/' + htmlName)) {
			return readFileSync(folderPath + '/' + htmlName, 'utf8')
		}
		result.diagnostics.push(createErrorTs(document, "Can't find a view inside " + folderPath + " for " + scriptName));
		return "";
	}
	const getStylePath = () => {
		let styleName = scriptName.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle);
		if (existsSync(folderPath + '/' + styleName)) {
			return folderPath + '/' + styleName
		}
		result.diagnostics.push(createErrorTs(document, "Can't find a style file for " + folderPath + " for " + scriptName));
		return "";
	}
	let view = getView().replace(/<!--[\s\S]*?-->/g, '').trim();
	let realScriptContent = readFileSync(componentPath, 'utf8');
	let script = realScriptContent.trim().replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
	let stylePath = getStylePath();
	let style: ScssCompilerResult;
	if (stylePath != "") {
		style = compileScss(getStylePath());
		if (!style.success) {
			result.diagnostics.push(createErrorTs(document, style.errorInfo));
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

	let template = compilerTemplate;

	let jsonStructure = parseStruct(realScriptContent, {}, componentPath);
	if (jsonStructure.functions.length > 0) {
		for (let fct of jsonStructure.functions) {
			result.diagnostics.push(createErrorTsPos(document, "You can't declare function outside of your class", fct.start, fct.end))
		}
	}
	if (jsonStructure.variables.length > 0) {
		for (let variable of jsonStructure.variables) {
			result.diagnostics.push(createErrorTsPos(document, "You can't declare variable outside of your class", variable.start, variable.end))
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
					result.diagnostics.push(createErrorTs(document, "Only one class is allowed inside a file. Get " + classInfo.name + " and " + jsonStructure.classes[i].name));
				}
			}
			else {
				result.diagnostics.push(createErrorTs(document, "Only class that implements DefaultComponent can be used"));
			}
		}

	}
	if (classInfo.name == "") {
		result.diagnostics.push(createErrorTs(document, "Can't found a class to compile inside"))
		return result;
	}
	let dependances: string[] = [];
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

	let htmlDoc: HTMLDoc = {

	};

	for (let decorator of classInfo.decorators) {
		if (decorator.name == 'overrideView') {
			classInfo.overrideView = true;
		}
		else if (decorator.name == 'Debugger') {
			if (decorator.arguments.length > 0) {
				for (let arg of decorator.arguments) {
					if (arg.writeCompiled) {
						classInfo.debuggerOption.writeCompiled = arg.writeCompiled;
					}
				}

			}
		}
	}

	if (classInfo.extends[0]?.typeName == "WebComponent") {
		classInfo.overrideView = true;
	}
	const _loadParent = (jsonStruct: Module, isFirst: boolean = true) => {
		if (jsonStruct.classes.length > 0) {
			let fields = loadFields(jsonStruct.classes[0], isFirst);
			toPrepare.allFields = {
				...toPrepare.allFields,
				...fields
			}

			let classParentStruct: ClassModel[] = [];

			/*const serverFolder = getServerFolder();
			const baseAventusEndPath = "/aventus/base/src";
			const test_path = join(serverFolder, baseAventusEndPath);
			console.log(test_path);*/
			let testStruct = parseStruct(readFileSync(AVENTUS_DEF_BASE_PATH, 'utf8'), {}, AVENTUS_DEF_BASE_PATH);
			testStruct.classes.forEach(classInfo => {
				// Check if classInfo implements DefaultComponent
				let foundDefaultComponent = false;
				for (let implement of classInfo.implements) {
					if (implement.typeName == 'DefaultComponent') {
						foundDefaultComponent = true;
						break;
					}
				}

				if (foundDefaultComponent) {
					classParentStruct.push(classInfo);
				}
			});


			if (jsonStruct.classes[0].extends.length > 0 && jsonStruct.classes[0].extends[0].typeName != "WebComponent") {
				for (let classInfo of classParentStruct) {
					if (classInfo.name === jsonStruct.classes[0].extends[0].typeName) {
						let fields = loadFields(classInfo, false);
						toPrepare.allFields = {
							...toPrepare.allFields,
							...fields
						}
						return;
					}
				}

				for (let importTemp of jsonStruct._imports) {
					for (let name of importTemp.clauses) {
						if (name == jsonStruct.classes[0].extends[0].typeName) {
							let newPath = importTemp.absPathString;
							let parentScript = readFileSync(newPath, 'utf8').trim().replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
							newPath = newPath.replace(/\\/g, "/");
							let parentStructure = parseStruct(parentScript, {}, newPath);
							console.log(name)
							_loadParent(parentStructure, false);
							return;
						}
					}
				}
				result.diagnostics.push(createErrorTs(document, "can't found the path for parent " + jsonStruct.classes[0].extends[0].typeName));
			}
		}

	}
	_loadParent(jsonStructure);
	var $: cheerio.CheerioAPI;
	const _createClassname = () => {
		let splitted = classInfo.name.match(/[A-Z][a-z]+/g);
		if (splitted) {
			const specialTagClassName = config.components?.disableIdentifier ? "" : specialTag;
			if (specialTagClassName.length > 0 && splitted[0].toLowerCase() != specialTagClassName.toLowerCase()) {
				result.diagnostics.push(createErrorTs(document, "Your class must start with " + specialTagClassName))
			}
			baliseName = splitted.join("-").toLowerCase();
			template = template.replace(/\$classname/g, classInfo.name);
			template = template.replace(/\$balisename/g, baliseName);

			let parentClass = 'WebComponent';
			if (classInfo.extends.length > 0) {
				parentClass = classInfo.extends[0].typeName;
				dependances.push(classInfo.extends[0].typeName);
			}
			template = template.replace(/\$parentClass/g, parentClass);
			htmlDoc = {
				[baliseName]: {
					name: baliseName,
					description: classInfo.documentation.join("\r\n"),
					attributes: {}
				}
			};
		}
	}
	const _prepareView = () => {
		$ = cheerio.load(toPrepare.view);
		const _getId = (el): string => {
			let attr = $(el).attr('_id');
			if (attr) {
				return attr;
			}
			$(el).attr('_id', classInfo.name.toLowerCase() + '_' + toPrepare.idElement);
			toPrepare.idElement++;
			return classInfo.name.toLowerCase() + '_' + (toPrepare.idElement - 1);
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
			if (el.name == "for") {
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
			if (el.name == "av-for") {
				let itemFound = false;
				let inFound = false;
				let itemName = "";
				let inName = "";
				let indexName = "";
				let dependances: string[] = [];
				let parent = $(el).parent();
				while (parent[0].name != 'body') {
					if (parent[0].name == "av-for") {
						dependances.push(_getId($(parent)));
					}
					parent = $(parent).parent();
				}
				for (var key in el.attribs) {
					if (key === 'item') {
						itemFound = true;
						if (["__itemName", "__template", "__inName"].indexOf(key) != -1) {
							result.diagnostics.push(createErrorTs(document, "You can't use __template, __itemName or __inName as name for item inside av-for"));
						}
						itemName = el.attribs[key];
					}
					else if (key == "in") {
						inFound = true;
						if (dependances.length == 0) {
							toPrepare.variablesPerso[el.attribs[key].split(".")[0]] = '';
						}
						inName = el.attribs[key];
					}
					else if (key == "index") {
						indexName = el.attribs[key];
					}
				}
				if (!inFound || !itemFound) {
					result.diagnostics.push(createErrorTs(document, "Your loop must have an attribute item and an attribute in"));
					return;
				}

				let idTemp = _getId($(el));
				toPrepare.loop[idTemp] = {};
				for (let key in toPrepare.actionByComponent) {
					if (key.startsWith(itemName + ".") || key == itemName || (indexName != '' && key == indexName)) {
						for (let compAction of toPrepare.actionByComponent[key]) {
							if (!toPrepare.loop[idTemp][compAction.componentId]) {
								toPrepare.loop[idTemp][compAction.componentId] = [];
							}
							let newData = {
								isProperty: compAction.hasOwnProperty("prop"),
								propName: compAction.prop ? compAction.prop : '',
								value: compAction.value
							}
							let found = false;
							for (let alreadyIn of toPrepare.loop[idTemp][compAction.componentId]) {
								if (alreadyIn.isProperty == newData.isProperty && alreadyIn.propName == newData.propName && alreadyIn.value == newData.value) {
									found = true;
									break;
								}
							}
							if (!found) {
								toPrepare.loop[idTemp][compAction.componentId].push(newData)
							}
						}
						delete toPrepare.actionByComponent[key];
					}
				}
				let html = $(el).html();

				if (!html) {
					html = "";
				}
				$(el).html('');
				toPrepare.loop[idTemp].__template = html.replace(/\n/g, "");
				toPrepare.loop[idTemp].__itemName = itemName;
				toPrepare.loop[idTemp].__inName = inName;
				toPrepare.loop[idTemp].__indexName = indexName;
				toPrepare.loop[idTemp].__dependances = dependances;
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
		const foundedMutable: string[] = [];
		const _createTemplateHtml = () => {
			let body = $('body').html()?.replace('&#xFEFF;', '');
			if (!body) {
				body = "";
			}
			let removeBody = body;
			template = template.replace(/\$template/g, body);

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

			template = template.replace(/\$slotHTML/g, slots.join(","))
			template = template.replace(/\$blockHTML/g, blocks.join(","))

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
			template = template.replace(/\$overrideView/g, overrideViewFct)

		}

		const _selectedEl = () => {
			var selectedElTxt = '';
			var recuSelectedEl = (current, root) => {
				for (var key in current) {
					if (typeof (current[key]) == 'object') {
						result.diagnostics.push(createErrorTs(document, 'dont know when to use this kind'));
						// selectedElTxt += root + '.' + key + ' = {};\r\n';
						// recuSelectedEl(current[key], root + '.' + key);
					} else {
						selectedElTxt += root + '.' + key + ' = ' + current[key] + ';\r\n';
					}
				}
			}
			for (var key in toPrepare.variablesPerso) {
				selectedElTxt += toPrepare.variablesPerso[key]
			}
			template = template.replace(/\$mapSelectedEl/g, selectedElTxt);

		}
		const _constructor = () => {
			let constructorBody = classInfo.constructorBody;
			if (constructorBody.length > 0) {
				let transformedBody = "function(){" + constructorBody.replace(/super\(\);?/g, '') + "}";
				constructorBody = `__endConstructor() { super.__endConstructor(); ${transpileMethod(transformedBody, [])} }`
			}
			template = template.replace(/\$constructor/g, constructorBody);
			if (classInfo.isAbstract) {
				template = template.replace(/\$isAbstract/g, 'constructor() { super(); if (this.constructor == ' + classInfo.name + ') { throw "can\'t instanciate an abstract class"; } }')
			}
			else {
				template = template.replace(/\$isAbstract/g, '');

			}
		}
		const _createFields = () => {
			var upgradeAttributes = "";
			var getterSetter = "";
			var attributesChanged = {};
			var attributesChangedTxt = ''
			var defaultValue = '';
			var variablesWatched: string[] = [];
			var variablesWatchedTxt = '';
			var variablesSimple = "";
			let listBool: string[] = [];
			let statesTxt = "";
			let variableProxyTxt = "";
			let variableProxy = {};


			const _createAttribute = (field: FieldModel, args: any[] = []) => {
				if (!field.type) {
					return;
				}
				let type = field.type.typeName.toLowerCase();
				if (!TYPES.hasOwnProperty(type)) {
					result.diagnostics.push(createErrorTsPos(document, "can't use the the type " + type + " as property", field.start, field.end));
				}
				if (field.name.toLowerCase() != field.name) {
					result.diagnostics.push(createErrorTsPos(document, "an attribute must be in lower case", field.start, field.end));
				}
				var _createDefaultValue = (key, defaultValueProp: string | undefined) => {
					key = key.toLowerCase();
					if (type == TYPES.boolean) {
						if (defaultValueProp) {
							defaultValue += "if(!this.hasAttribute('" + key + "')) {this.setAttribute('" + key + "' ,'true'); }\r\n";
						} else {
							//If default set to false, we refresh the attribute to set it to false and not undefined
							defaultValue += "if(!this.hasAttribute('" + key + "')) { this.attributeChangedCallback('" + key + "', false, false); }\r\n";
						}
					}
					else if (type == TYPES.date || type == TYPES.datetime) {
						if (!defaultValueProp) { defaultValueProp = "" }
						// defaultValue += "if(!this.hasAttribute('" + key + "')){ this.setAttribute('" + key + "', " + defaultValueProp + "); }\r\n";
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = " + defaultValueProp + "; }\r\n";

					}
					else {
						if (!defaultValueProp) { defaultValueProp = "" }
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = '" + defaultValueProp + "'; }\r\n";
						// defaultValue += "if(!this.hasAttribute('" + key + "')){ this.setAttribute('" + key + "', '" + defaultValueProp + "'); }\r\n";
					}
				}
				_createDefaultValue(field.name, field.valueConstraint?.value);

				var _createGetterSetter = (key) => {
					key = key.toLowerCase();
					if (type == TYPES.string) {
						getterSetter += `get '${key}'() {
                        return this.getAttribute('${key}');
                    }
                    set '${key}'(val) {
                        this.setAttribute('${key}',val);
                    }\r\n`;
					} else if (type == TYPES.number) {
						getterSetter += `get '${key}'() {
                        return Number(this.getAttribute('${key}'));
                    }
                    set '${key}'(val) {
                        this.setAttribute('${key}',val);
                    }\r\n`;
					}
					else if (type == TYPES.boolean) {
						listBool.push('"' + key + '"');
						getterSetter += `get '${key}'() {
                        return this.hasAttribute('${key}');
                    }
                    set '${key}'(val) {
                        if(val === 1 || val === 'true' || val === ''){
                            val = true;
                        }
                        else if(val === 0 || val === 'false' || val === null || val === undefined){
                            val = false;
                        }
                        if(val !== false && val !== true){
                            console.error("error setting boolean in ${key}");
                            val = false;
                        }
                        if (val) {
                            this.setAttribute('${key}', 'true');
                        } else{
                            this.removeAttribute('${key}');
                        }
                    }\r\n`;
					}
					else if (type == TYPES.date) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return luxon.DateTime.now();
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
                            if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISODate());
                            } else if(val instanceof Date){
                                val = luxon.DateTime.fromJSDate(val);
                                this.setAttribute('${key}', val.toISODate());
                            } else if (typeof val === 'string') {
                                val = luxon.DateTime.fromISO(val);
                                this.setAttribute('${key}', val.toISODate());
                            } else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
					else if (type == TYPES.datetime) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return luxon.DateTime.now();
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
                            if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISO());
                            } 
                            else if(val instanceof Date){
                                val = luxon.DateTime.fromJSDate(val);
                                this.setAttribute('${key}', val.toISO());
                            }
                            else if (typeof val === 'string') {
                                val = luxon.DateTime.fromISO(val);
                                this.setAttribute('${key}', val.toISO());
                            } else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
				}
				_createGetterSetter(field.name);

				upgradeAttributes += 'this.__upgradeProperty(\'' + field.name.toLowerCase() + '\');\r\n';
				variablesWatched.push(field.name.toLowerCase());
				attributesChanged[field.name] = '';



				if (args.length > 0) {
					attributesChanged[field.name] += transpileMethod(args[0], ["this"]) + '\r\n';
				}

				// html DOC
				htmlDoc[baliseName].attributes[field.name] = {
					name: field.name,
					description: field.documentation.join("\r\n"),
					values: []
				}

			}
			const _createMutableVariable = (field: FieldModel, args: any[] = []) => {
				if (field.type) {
					if (field.type.typeKind == TypeKind.BASIC) {

					}
					if (field.type.typeKind == TypeKind.ARRAY) {
						let arrayType: ArrayType = field.type as ArrayType;
						let name = arrayType.base.typeName;
					}
					let value = "";
					if (!field.valueConstraint || field.valueConstraint.value == undefined || field.valueConstraint.value == "undefined") {
						result.diagnostics.push(createErrorTsPos(document, "A mutable prop must be initialized", field.start, field.end));
					}
					else {
						// constraint is a function
						if (field.valueConstraint.isCallConstraint) {
							value = field.valueConstraint.value.name + `(${field.valueConstraint.value.arguments.join(", ")})`
						}
						else {
							if (field.type.typeName.toLowerCase() === TYPES.string) {
								value = `"${field.valueConstraint.value}"`;
							} else if (field.type.typeName.toLowerCase() === TYPES.date) {
								value = `luxon.DateTime.fromJSDate(${field.valueConstraint.value})`;
							} else if (TYPES[field.type.typeName.toLowerCase()]) {
								value = field.valueConstraint.value
							} else {
								value = JSON.stringify(field.valueConstraint.value);
							}
						}
					}
					if (value == '"undefined"') { value = "undefined" }
					let mutableAction = `this.__mutableActions["${field.name}"] = []`;
					let txtMutableFct = "";
					if (args.length > 0) {
						txtMutableFct = transpileMethodNoRun(args[0]);
					}
					mutableAction = `this.__mutableActions["${field.name}"] = [${txtMutableFct}];
						this.__mutableActionsCb["${field.name}"] = (action, path, value) => {
							for (let fct of this.__mutableActions["${field.name}"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["${field.name}"]){
								for(let fct of this.__onChangeFct["${field.name}"]){
									fct("${field.name}")
									/*if(path == ""){
										fct("${field.name}")
									}
									else{
										fct("${field.name}."+path);
									}*/
								}
							}
						}`;
					getterSetter += `get '${field.name}'() {
						return this.__mutable["${field.name}"];
					}
					set '${field.name}'(val) {
						/*if (this.__mutable["${field.name}"]) {
							this.__mutable["${field.name}"].__unsubscribe(this.__mutableActionsCb["${field.name}"]);
						}*/
						this.__mutable["${field.name}"] = val;

						if (val) {
							//this.__mutable["${field.name}"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["${field.name}"]);
							//this.__mutableActionsCb["${field.name}"](MutableAction.SET, '', this.__mutable["${field.name}"]);
						}
						else{
							//this.__mutable["${field.name}"] = undefined;
						}
					}\r\n`;
					variableProxy[field.name] = `${mutableAction}
					this["${field.name}"] = ${value}`;
					foundedMutable.push(field.name);
				}
			}
			const _createSimpleVariable = (field: FieldModel) => {
				if (!toPrepare.variablesPerso.hasOwnProperty(field.name)) {
					let value = "undefined";
					if (field.hasOwnProperty('valueConstraint')) {
						if (field.valueConstraint != null && field.valueConstraint.hasOwnProperty("value")) {
							value = JSON.stringify(field.valueConstraint.value);
						}
					}
					variablesSimple += `if(this.${field.name} === undefined) {this.${field.name} = ${value};}\r\n`;
				}
			}
			const _createStates = (field) => {
				var states = field.valueConstraint.value;
				let fctStateTxt = "";
				let slugGenerator = "";
				let defineStateName = "";
				for (var key in states) {
					if (key == "stateManagerName") {
						defineStateName = "__getStateManagerName(){retrun \"" + states[key] + "\";}\r\n"
					}
					else {
						var activeFct = "";
						if (states[key].active) {
							activeFct = transpileMethod(states[key].active.toString(), ["state"]);
							activeFct = activeFct.replace(/this/g, "that2");
						}
						var inactiveFct = "";
						if (states[key].inactive) {
							inactiveFct = transpileMethod(states[key].inactive.toString(), ["currentState", "nextState"]);
							inactiveFct = inactiveFct.replace(/this/g, "that2");
						}
						var askChange = "true;";
						if (states[key].askChange) {
							askChange = transpileMethod(states[key].askChange.toString(), ["currentState", "nextState"]);
							askChange = askChange.replace(/this/g, "that2");
						}

						var route = '"' + key + '"';
						let slugId = 0;
						if (key.endsWith("*")) {
							if (states[key].getSlug) {
								slugId++;
								var getSlugFct = states[key].getSlug.toString().trim();
								getSlugFct = getSlugFct.replace("getSlug()", "() => ");
								slugGenerator += `this.getSlugFct["getSlug${slugId}"] = ${getSlugFct}`;
								route = '"' + key.replace("*", "") + '"+this.getSlugFct["getSlug' + slugId + '"]()';
							}
						}
						if (route != '"default"') {
							fctStateTxt += `
                            this.statesList[${route}] = {
                                active(state){
                                    if(that2.currentState == "default"){
                                        that2.statesList["default"].inactive();
                                    }
                                    that2.currentState = state;
                                    ${activeFct}
                                },
                                inactive(currentState, nextState){
                                    ${inactiveFct}

                                    if(Object.keys(that2.statesList).indexOf(nextState) == -1){
                                        that2.currentState = "default";
                                        that2.statesList["default"].active();
                                    }
                                },
                                askChange(currentState, nextState){
                                    return ${askChange}
                                }
                            };\r\n`
						}
						else {
							fctStateTxt += `
                            this.statesList[${route}] = {
                                active(state){
                                    ${activeFct}
                                },
                                inactive(currentState, nextState){
                                    ${inactiveFct}
                                }
                            };\r\n`
						}
					}
				}

				statesTxt = defineStateName + slugGenerator + "\r\n" + fctStateTxt;
			}
			const _updateTemplate = () => {
				for (let fieldName in toPrepare.actionByComponent) {

					let stringToAdd = "";
					for (var i = 0; i < toPrepare.actionByComponent[fieldName].length; i++) {
						var current = toPrepare.actionByComponent[fieldName][i];
						current.value = current.value.trim().replace(/"/g, '\\"');
						// create value
						var matches = current.value.match(/\{\{(.*?)\}\}/g);
						current.value = '"' + current.value + '"';
						let check: string[] = [];
						if (!matches) {
							matches = [];
						}
						for (var j = 0; j < matches.length; j++) {
							var variableName = matches[j].replace(/\{\{|\}\}/g, '');
							check.push(`"${variableName}".startsWith(path)`)

							if (toPrepare.allFields[variableName]) {
								let type = toPrepare.allFields[variableName].type?.typeName.toLowerCase();

								if (type === TYPES.date) {
									current.value = current.value.replace(matches[j], '"+this.' + variableName + '.toISODate()+"');
								} else if (type === TYPES.datetime) {
									current.value = current.value.replace(matches[j], '"+this.' + variableName + '.toISO()+"');
								} else {
									current.value = current.value.replace(matches[j], '"+this.' + variableName + '+"');
								}
							} else {
								current.value = current.value.replace(matches[j], '"+this.' + variableName + '+"');
							}
						}
						let componentId = "'" + current.componentId + "'";
						if (current.hasOwnProperty('prop')) {
							//prop
							let prop = current.prop as string;
							if (toPrepare.allFields[prop]) {
								let propType = toPrepare.allFields[prop].type?.typeName.toLowerCase();

								if (propType == TYPES.string || propType == TYPES.number || propType == TYPES.date || propType == TYPES.datetime) {
									stringToAdd += `if(${check.join("||")}){
										for(var i = 0;i<this._components[${componentId}].length;i++){
											this._components[${componentId}][i].setAttribute("${prop.toLowerCase()}", ${current.value});
										}
									}`;
								}
								else if (propType == TYPES.boolean) {
									stringToAdd += `if(${check.join("||")}){
										for(var i = 0;i<this._components[${componentId}].length;i++){
											if (newValue) { 
												this._components[${componentId}][i].setAttribute("${prop.toLowerCase()}", "true"); 
											} 
											else { 
												this._components[${componentId}][i].removeAttribute("${prop.toLowerCase()}"); 
											}
										}
									}`;
								}
							}
						} else {
							//html
							stringToAdd += `if(${check.join("||")}){
									for(var i = 0;i<this._components[${componentId}].length;i++){
									this._components[${componentId}][i].innerHTML = ${current.value}.toString();
								}
							}`;
						}
					}
					attributesChanged[fieldName] = stringToAdd;
				}
			}
			let listToCheck = Object.keys(toPrepare.variablesPerso);
			for (let fieldName in toPrepare.allFields) {
				let field = toPrepare.allFields[fieldName];
				let index = listToCheck.indexOf(field.name);
				if (index != -1) {
					listToCheck.splice(index, 1);
				}
				if (field.inParent) {

					continue;
				}
				if (field.propType == "state") {
					_createStates(field);
					continue;
				}
				else if (field.propType == "attribute") {
					for (let decorator of field.decorators) {
						if (decorator.name == "attribute") {
							_createAttribute(field, decorator.arguments);
						}
					}
					continue;
				}
				else if (field.propType == "mutable") {
					for (let decorator of field.decorators) {
						if (decorator.name == "mutable") {
							_createMutableVariable(field, decorator.arguments);
						}
					}
				}
				else if (field.propType == "simple") {
					_createSimpleVariable(field);
				}
			}
			_updateTemplate();


			for (var key in attributesChanged) {
				if (attributesChanged[key] !== "") {
					let realKey = key.split(".")[0];
					if (toPrepare.allFields[realKey]) {
						if (!toPrepare.allFields[realKey].inParent || classInfo.overrideView) {
							attributesChangedTxt += `this.__onChangeFct['${realKey}'] = []\r\n`;
						} else {
							attributesChangedTxt += `if (!this.__onChangeFct['${realKey}']) {\r\nthis.__onChangeFct['${realKey}'] = []\r\n}\r\n`;
						}
						attributesChangedTxt += `this.__onChangeFct['${realKey}'].push((path) => {${attributesChanged[key]}})\r\n`;
					}
					else {
						result.diagnostics.push(createErrorTs(document, realKey + ' can\'t be found'));
					}
				}
			}
			for (var key in variableProxy) {
				if (variableProxy[key] !== "") {
					variableProxyTxt += `${variableProxy[key]}\r\n`
				}
			}

			for (let missingVar of listToCheck) {
				result.diagnostics.push(createErrorTs(document, "missing variable " + missingVar));
			}

			//#region writing into template
			if (statesTxt.length > 0) {
				statesTxt = `__createStates() { super.__createStates(); let that2 = this; ${statesTxt} }`
			}
			template = template.replace(/\$states/g, statesTxt);


			if (upgradeAttributes.length > 0) {
				upgradeAttributes = `__upgradeAttributes() { super.__upgradeAttributes(); ${upgradeAttributes} }`
			}
			template = template.replace(/\$upgradeAttributes/g, upgradeAttributes);

			if (attributesChangedTxt.length > 0) {
				attributesChangedTxt = `__registerOnChange() { super.__registerOnChange(); ${attributesChangedTxt} }`
			}
			template = template.replace(/\$registerOnChange/g, attributesChangedTxt);

			template = template.replace(/\$getterSetter/g, getterSetter);

			if (defaultValue.length > 0) {
				defaultValue = `__defaultValue() { super.__defaultValue(); ${defaultValue} }`
			}
			template = template.replace(/\$defaultValue/g, defaultValue);

			variablesWatchedTxt = '"' + variablesWatched.join('", "') + '"';
			if (variablesWatchedTxt.length > 2) {
				variablesWatchedTxt = `static get observedAttributes() {return [${variablesWatchedTxt}].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}`
			}
			else {
				variablesWatchedTxt = '';
			}
			template = template.replace(/\$watchingAttributes/g, variablesWatchedTxt);

			if (variablesSimple.length > 0) {
				variablesSimple = `__prepareVariables() { super.__prepareVariables(); ${variablesSimple} }`
			}
			template = template.replace(/\$variables/g, variablesSimple);

			if (listBool.length > 0) {
				template = template.replace(/\$listBool/g, `__listBoolProps() { return [${listBool.join(",")}].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }`);
			}
			else {
				template = template.replace(/\$listBool/g, "");
			}

			if (variableProxyTxt.length > 0) {
				variableProxyTxt = `__prepareMutables() {
					super.__prepareMutables();
					if (!this.__mutable) {
						this.__mutable = Object.transformIntoWatcher({}, (type, path, element) => {
							console.log("mutable", type, path, element);
							let action = this.__mutableActionsCb[path.split(".")[0]] || this.__mutableActionsCb[path.split("[")[0]];
							action(type, path, element);
						});
					}
					${variableProxyTxt}
				}`
			}
			template = template.replace(/\$mutables/g, variableProxyTxt);
			//#endregion
		}
		const _createMethods = () => {
			let methodsTxt = "";
			for (let method of classInfo.methods) {
				if (!method.isAbstract) {
					//remove comment 
					method.text = method.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
					// remove manual type
					let regexRemoveType = new RegExp(method.name + "\\(.*?\\)(:( *){((\\s|\\S)*?)})", "g")
					let matchType = regexRemoveType.exec(method.text);
					if (matchType) {
						method.text = method.text.replace(matchType[1], "");
					}

					let regexMethod = /{((\s|\S)*)}/g;
					let match = regexMethod.exec(method.text)
					if (match) {
						let methodTxt = ts.transpile(match[1], configTS).trim();
						// methodTxt = minify(methodTxt, { mangle: false }).code;

						let methodFinal = "";
						if (method.isStatic) {
							methodFinal += "static ";
						}
						if (method.isAsync) {
							methodFinal += "async ";
						}
						let args: string[] = [];
						for (let arg of method.arguments) {
							args.push(arg.name);
						}
						methodsTxt += methodFinal + " " + method.name + "(" + args.join(",") + "){" + methodTxt + "}\r\n";
					}

				}
			}
			template = template.replace(/\$methods/g, methodsTxt);
		}

		const _createEvents = () => {
			let eventsMapped = "";
			for (var i = 0; i < toPrepare.eventsPerso.length; i++) {
				var current = toPrepare.eventsPerso[i];
				let componentId = "'" + current.componentId + "'";
				eventsMapped += `if (ids == null || ids.indexOf(${componentId}) != -1) {
                    if (this._components[${componentId}]) {
                        for (var i = 0; i < this._components[${componentId}].length; i++) {
                            this._components[${componentId}][i].addEventListener('${current.event}', (e) => { this.${current.value}(e) })
                        }
                    }
                }`
			}
			for (let key in toPrepare.pressEvents) {
				let current = toPrepare.pressEvents[key];
				let onPressTxt = "";
				let onLongPressTxt = "";
				let onPressStopTxt = "";
				let delayTxt = "";
				if (current.hasOwnProperty("onPress")) {
					onPressTxt += `"onPress": (e) => {
                        this.${current["onPress"]}(e, this);
                     },`;
				}
				if (current.hasOwnProperty("onLongPress")) {
					onLongPressTxt += `"onLongPress": (e) => {
                        this.${current["onLongPress"]}(e, this);
                     },`;
				}
				if (current.hasOwnProperty("onStop")) {
					onPressStopTxt = `"onStop": (e) => {
                        this.${current["onStop"]}(e, this);
                    },`;
				}
				if (current.hasOwnProperty("onStart")) {
					onPressStopTxt = `"onStart": (e) => {
                        this.${current["onStart"]}(e, this);
                    },`;
				}
				if (current.hasOwnProperty("delay")) {
					delayTxt = `"delay": ${current["delay"]},`;
				}


				eventsMapped += `
                new PressManager({
                    "element": this._components['${key}'],
                    ${onPressTxt}
                    ${onLongPressTxt}
                    ${onPressStopTxt}
                    ${delayTxt}
                });
                `
			}
			if (eventsMapped.length > 0) {
				eventsMapped = `__addEvents(ids = null) { super.__addEvents(ids); ${eventsMapped} }`;
			}
			template = template.replace(/\$eventsMapped/g, eventsMapped);
		}

		const _createForLoop = () => {
			const isIndex = (key, item) => {
				if (key == "") {
					return false;
				}
				if (item.__indexName == key) {
					return true;
				}
				for (let dependance of item.__dependances) {
					if (toPrepare.loop[dependance].__indexName == key) {
						return true;
					}
				}
				return false;
			}
			let loopTxt = "";
			for (var key in toPrepare.loop) {
				let item = toPrepare.loop[key];
				let firstInNamePart = item.__inName.split(".")[0];
				if (foundedMutable.indexOf(firstInNamePart) == -1) {
					let found = false;
					for (let dependance of item.__dependances) {
						if (toPrepare.loop[dependance].__itemName == firstInNamePart) {
							found = true;
							break;
						}
					}
					if (!found) {
						result.diagnostics.push(createErrorTs(document, 'variable ' + firstInNamePart + ' inside in of for loop must be mutable'));
					}
				}
				loopTxt += `this.__loopTemplate['${key}'] = \`${item.__template}\`;\r\n`;
				let itemName = item.__itemName;
				let indexName = item.__indexName;
				let itemClone = { ...item };
				delete itemClone.__inName;
				delete itemClone.__itemName;
				delete itemClone.__template;
				delete itemClone.__dependances;
				delete itemClone.__indexName;
				let wrapperActionsSelector = {};
				let forActionsCreateSelector = {};
				let variablesForItems = {};
				let resultDefinition: string[] = [];
				for (let componentId in itemClone) {
					for (let i = 0; i < itemClone[componentId].length; i++) {
						let current: { isProperty: boolean, propName: string, value: string } = itemClone[componentId][i];
						let value = current.value.trim().replace(/"/g, '\\"');
						// create value
						var matches = value.match(/\{\{(.*?)\}\}/g);
						value = '"' + value + '"';
						if (!matches) {
							matches = [];
						}
						let isIndexItem = false;
						let variablesWatcher: string[] = [];
						let variables: { name: string, getValue: string }[] = [];
						for (var j = 0; j < matches.length; j++) {
							let variableName = matches[j].replace(/\{\{|\}\}/g, '');
							if (isIndex(variableName, item)) {
								isIndexItem = true;
								value = value.replace(matches[j], '"+element.__values["$index$_' + variableName + '"]+"');

								if (variablesWatcher.indexOf("$index$_" + variableName) == -1) {
									variablesWatcher.push("$index$_" + variableName);
									variables.push({
										name: "$index$_" + variableName,
										getValue: `indexes["${variableName}"]`,
									})
								}
							}
							else {
								variableName = variableName.replace(new RegExp(itemName + "\\.?", "g"), "");
								value = value.replace(matches[j], '"+element.__values["' + variableName + '"]+"');
								if (variablesWatcher.indexOf(variableName) == -1) {
									variablesWatcher.push(variableName);
									if (variableName == "") {
										variables.push({
											name: variableName,
											getValue: `data`,
										})
									}
									else {
										variables.push({
											name: variableName,
											getValue: `data["${variableName}"]`,
										})
									}
								}
							}

						}
						if (!wrapperActionsSelector[componentId]) {
							wrapperActionsSelector[componentId] = `let arr_${componentId} = Array.from(el.querySelectorAll('[_id="${componentId}"]'));`
							forActionsCreateSelector[componentId] = `for(let item of arr_${componentId}){
								item.__templates={};
								item.__values={};
								/**replaceValue*/
								/**replaceTemplate*/
								for(let propName in item.__templates){
									for(let callback of item.__templates[propName]){
										callback(item);
									}
								}
							}`

							variablesForItems[componentId] = [];

						}
						let _createVariable = (varTemp: { name: string, getValue: string }) => {
							variablesForItems[componentId].push(varTemp.name);
							resultDefinition.push(`result["${varTemp.name}"] = [];`);
							return `item.__values["${varTemp.name}"] = ${varTemp.getValue};
							result["${varTemp.name}"].push(item);
							item.__templates["${varTemp.name}"] = [];\r\n`
						}
						if (current.isProperty) {
							let txtCreate = ""
							let checkRawValue = variables.length == 1 && !variables[0].name.startsWith("$index$_") && value == '""+element.__values["' + variables[0].name + '"]+""';
							for (let varTemp of variables) {
								if (variablesForItems[componentId].indexOf(varTemp.name) == -1) {
									forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceValue*/", _createVariable(varTemp) + "/**replaceValue*/");
								}
								if (checkRawValue) {
									txtCreate += `item.__templates["${varTemp.name}"].push(((element) => {
										let varToCheck = element.__values["${varTemp.name}"];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["${current.propName}"] = varToCheck;
										}
										else{
											element.setAttribute("${current.propName}", ${value});
										}
									}));\r\n`
								}
								else {
									txtCreate += `item.__templates["${varTemp.name}"].push(((element) => element.setAttribute("${current.propName}", ${value})));\r\n`
								}
							}
							forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceTemplate*/", txtCreate + "/**replaceTemplate*/");
						}
						else {
							let txtCreate = "";
							for (let varTemp of variables) {
								if (variablesForItems[componentId].indexOf(varTemp.name) == -1) {
									forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceValue*/", _createVariable(varTemp) + "/**replaceValue*/");
								}
								txtCreate += `item.__templates["${varTemp.name}"].push(((element) => element.innerHTML = ${value}));\r\n`
							}
							forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceTemplate*/", txtCreate + "/**replaceTemplate*/");
						}
					}
				}
				loopTxt += `this.__prepareForCreate['${key}'] = (el, data, key, indexes) => {
					let result = {};
					${Object.values(wrapperActionsSelector).join("\r\n")}
					${resultDefinition.join("\r\n")}
					${Object.values(forActionsCreateSelector).join("\r\n")}
					return result;
				};
				`
			}

			if (loopTxt.length > 0) {
				loopTxt = "__prepareForLoop(){ super.__prepareForLoop(); " + loopTxt + " }"
			}
			template = template.replace(/\$loop/g, loopTxt);
		}

		var _createTranslations = () => {
			var applyTranslations = "";
			var allTranslations = "";
			let allLangs: string[] = [];

			if (existsSync(folderPath + '/_lang')) {
				var translationsKey: string[] = [];
				readdirSync(folderPath + '/_lang').forEach(file => {
					if (file.indexOf('.json') !== -1) {
						var lang = file.replace('.json', '');
						allLangs.push(lang);

						var translations = JSON.parse(readFileSync(folderPath + '/_lang/' + file, 'utf8'));

						const processTranslationsObject = (object, parentKey) => {
							for (let key in object) {
								let fullKey = parentKey ? parentKey + '.' + key : key;

								if (typeof object[key] === 'object') {
									processTranslationsObject(object[key], fullKey);
								} else {
									translationsKey.push(fullKey);
									allTranslations += "this._translations['" + lang + "']['" + fullKey + "'] = `" + object[key] + "`;\n";
								}
							}
						};

						processTranslationsObject(translations, undefined);
					}
				});

				Object.entries(toPrepare.actionByComponent).forEach(([key, uses]) => {
					if (!key.startsWith("lang.")) {
						return;
					}

					key = key.replace("lang.", "");

					if (translationsKey.indexOf(key) !== -1) {
						uses.forEach(use => {
							use.value = use.value.trim().replace(/"/g, '\\"');
							use.value = '"' + use.value + '"';

							var matches = use.value.match(/\{\{(.*?)\}\}/g);
							if (!matches) {
								matches = [];
							}
							for (var j = 0; j < matches.length; j++) {
								var variableName = matches[j].replace(/\{\{|\}\}/g, '');
								use.value = use.value.replace(matches[j], '"+this.getTranslation("' + variableName + '")+"');
							}

							applyTranslations += '\tthis._components["' + use.componentId + '"].innerHTML = ' + use.value + ';\r\n';
						});
					}
					delete toPrepare.actionByComponent[key]
				});
			}
			if (allLangs.length > 0) {
				template = template.replace(/\$allLangs/g, `__getLangTranslations() { return [${allLangs.join(",")}].concat(super.__getLangTranslations()).filter((v, i, a) => a.indexOf(v) === i); }`);
			}
			else {
				template = template.replace(/\$allLangs/g, "");
			}
			if (allTranslations.length > 0) {
				allTranslations = `__setTranslations() { super.__setTranslations(); ${allTranslations} }`
			}
			template = template.replace(/\$translations/g, allTranslations);

			if (applyTranslations.length > 0) {
				applyTranslations = `__applyTranslations() { super.__applyTranslations(); ${applyTranslations} }`
			}
			template = template.replace(/\$applyTranslations/g, applyTranslations);

		};



		_createTemplateHtml();
		let body = $('body').html()?.replace('&#xFEFF;', '');
		if (!body) {
			body = "";
		}
		template = template.replace(/\$template/g, body); // .replace is needed to remove odd unicode char at the start of the string
		template = template.replace(/\$style/g, toPrepare.style);
		template = template.replace(/\$maxId/g, toPrepare.idElement + "");
		_selectedEl();
		_constructor();
		_createTranslations();
		_createFields();
		_createMethods();
		_createEvents();
		_createForLoop();


	}
	_createClassname();
	_prepareView();
	_prepareFile();

	// remove empty line
	template = removeWhiteSpaceLines(template)
	// fs.writeFileSync(folderPath + '/compiled.js', template);
	if (classInfo.debuggerOption.writeCompiled) {
		writeFileSync(folderPath + '/compiled.js', template);
	}
	else if (existsSync(folderPath + '/compiled.js')) {
		unlinkSync(folderPath + '/compiled.js')
	}
	let struct = parseStruct(realScriptContent, {}, componentPath);
	let doc = "";
	if (struct.classes.length == 1) {
		let classContent = removeDecoratorFromClassContent(struct.classes[0]);
		classContent = replaceFirstExport(classContent);
		doc = compileDocTs(classContent);
	}
	let customCssProperties: SCSSDoc = {
		[baliseName]: scssMode.getCustomProperty(style.rawContent)
	}
	result.result.nameCompiled = classInfo.name;
	result.result.nameDoc = classInfo.name;
	result.result.src = template;
	result.result.doc = doc;
	result.result.dependances = dependances;
	result.result.htmlDoc = htmlDoc;
	result.result.scssVars = customCssProperties;
	result.success = result.diagnostics.length == 0;
	return result;

}