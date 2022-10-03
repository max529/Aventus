import { htmlMode, jsMode, scssMode, wcMode } from '../../../../mode';
import { ArrayType, BasicType, ClassModel, DefaultClassModel, FieldModel, ImportNode, Module, TypeKind, UnionType } from '../../../../ts-file-parser';
import { AventusConfig } from '../../config';
import { compileDocTs, createErrorTs, createErrorTsPos, removeComments, removeDecoratorFromClassContent, removeWhiteSpaceLines, replaceFirstExport } from '../utils';
import { compilerTemplate } from './compilerTemplate';
import * as cheerio from 'cheerio';
import { aventusExtension } from '../../aventusDoc';
import { compileScss, ScssCompilerResult } from '../../../aventusSCSS/compiler/compileScss';
import { AVENTUS_DEF_BASE_PATH } from '../../../libLoader';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { CompileComponentResult, configTS, CustomClassInfo, CustomFieldModel, HTMLDoc, ItoPrepare, SCSSDoc, TYPES } from './def';
import { getTypeForAttribute, loadFields, transpileMethod, transpileMethodNoRun } from './utils';
import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { pathToUri, uriToPath } from '../../utils';
import { AventusJSProgram } from '../../program';
import { AventusWcDoc } from '../../../aventusWc/doc';
import { EOL } from 'os';
import { getClass, parseDocument } from '../../../../ts-file-parser/src/tsStructureParser';

const ts = require("typescript");

interface PrepareDocumentResult {
	folderPath: string,
	scriptDocument: TextDocument,
	cssResult: ScssCompilerResult
	htmlText: string,
	diagnostics: Diagnostic[]
}
function prepareDocument(document: TextDocument, virtualDoc: boolean): PrepareDocumentResult {
	let result: PrepareDocumentResult = {
		folderPath: "",
		scriptDocument: document,
		cssResult: {
			success: true,
			content: "",
			rawContent: "",
			errorInfo: "",
			importedPath: []
		},
		htmlText: "",
		diagnostics: []
	}
	let componentPath = "";
	if (virtualDoc) {
		componentPath = uriToPath(document.uri.replace(aventusExtension.ComponentLogic, aventusExtension.Component));
		let wcDoc = wcMode.getDocumentByUri(document.uri.replace(aventusExtension.ComponentLogic, aventusExtension.Component));
		if (wcDoc) {
			result.scriptDocument = wcDoc.getJSInfo().document;
			result.cssResult = compileScss(componentPath.replace(aventusExtension.Component, aventusExtension.ComponentStyle), wcDoc.getSCSSInfo().text);
			if (!result.cssResult.success) {
				result.diagnostics.push(createErrorTs(document, result.cssResult.errorInfo));
			}
			result.htmlText = wcDoc.getHTMLInfo().text.replace(/<!--[\s\S]*?-->/g, '').trim();
		}
	}
	else {
		componentPath = uriToPath(document.uri);
		result.scriptDocument = document;
		let styleUri = document.uri.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle);
		let styleDoc = scssMode.getFile(styleUri);
		if (styleDoc) {
			result.cssResult = compileScss(componentPath.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentStyle), styleDoc.getText());
			if (!result.cssResult.success) {
				result.diagnostics.push(createErrorTs(document, result.cssResult.errorInfo));
			}
		}
		let viewUri = document.uri.replace(aventusExtension.ComponentLogic, aventusExtension.ComponentView);
		let htmlDoc = htmlMode.getFile(viewUri);
		if (htmlDoc) {
			result.htmlText = htmlDoc.getText().replace(/<!--[\s\S]*?-->/g, '').trim();
		}
	}

	let folderTemp = componentPath.split("/");
	let scriptName = folderTemp.pop() || '';
	result.folderPath = folderTemp.join("/");
	result.htmlText = result.htmlText.replace(/\\\{\{(.*?)\}\}/g, "|!*$1*!|")
	return result;
}

export function compileComponent(document: TextDocument, config: AventusConfig, program: AventusJSProgram, virtualDoc: boolean): CompileComponentResult {
	let specialTag = "";
	for (let build of config.build) {
		if (build.inputPathRegex) {
			if (uriToPath(document.uri).match(build.inputPathRegex)) {
				if (specialTag == "" || specialTag == build.componentPrefix) {
					specialTag = build.componentPrefix;
				}
				else {
					createErrorTs(document, "You can't have two identifier for the same file " + specialTag + " and " + build.componentPrefix);
				}
			}
		}
	}

	let baliseName = "";

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

	let documentInfo = prepareDocument(document, virtualDoc);
	let documentPath = uriToPath(document.uri);
	let template = compilerTemplate;

	let jsonStructure = parseDocument(documentInfo.scriptDocument);
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
				if (implement.typeName == 'Aventus.DefaultComponent' || implement.typeName == 'DefaultComponent') {
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
		variablesInView: {},
		eventsPerso: [],
		pressEvents: {},
		allFields: {},
		actionByComponent: {},
		loop: {},
		idElement: 0,
		style: documentInfo.cssResult.content,
		script: classInfo,
		view: documentInfo.htmlText,
	}

	let htmlDoc: HTMLDoc = {

	};

	for (let decorator of classInfo.decorators) {
		if (decorator.name == 'OverrideView') {
			classInfo.overrideView = true;
		}
		else if (decorator.name == 'Debugger') {
			if (decorator.arguments.length > 0) {
				for (let arg of decorator.arguments) {
					if (arg.writeCompiled) {
						classInfo.debuggerOption.writeCompiled = arg.writeCompiled;
					}
					if (arg.enableWatchHistory) {
						classInfo.debuggerOption.enableWatchHistory = arg.enableWatchHistory
					}
				}

			}
		}
	}

	if (classInfo.extends[0]?.typeName == "WebComponent" || classInfo.extends[0]?.typeName == "Aventus.WebComponent") {
		classInfo.overrideView = true;
	}
	const _loadParent = (jsonStruct: Module, isFirst: boolean = true) => {
		if (jsonStruct.classes.length > 0) {
			let fields = loadFields(jsonStruct.classes[0], isFirst);
			toPrepare.allFields = {
				...toPrepare.allFields,
				...fields
			}





			if (jsonStruct.classes[0].extends.length > 0 && jsonStruct.classes[0].extends[0].typeName != "WebComponent" && jsonStruct.classes[0].extends[0].typeName != "Aventus.WebComponent") {
				// search parent inside local import
				for (let importTemp of jsonStruct._imports) {
					for (let name of importTemp.clauses) {
						if (name == jsonStruct.classes[0].extends[0].typeName) {
							let newPath = importTemp.absPathString.replace(/\\/g, "/");
							let newUri = pathToUri(newPath);
							let parentScript = jsMode.getFile(newUri);
							if (parentScript) {
								let parentStructure = parseDocument(parentScript);
								_loadParent(parentStructure, false);
							}
							return;
						}
					}
				}
				// search parent inside definition file
				let classInfoInDef = program.tryGetClassInDef(jsonStruct.classes[0].extends[0].typeName);
				if (classInfoInDef) {
					let fields = loadFields(classInfoInDef, false);
					toPrepare.allFields = {
						...toPrepare.allFields,
						...fields
					}
					return;
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
			if (specialTag.length > 0 && splitted[0].toLowerCase() != specialTag.toLowerCase()) {
				// no special tag => add one
				splitted.splice(0, 0, specialTag.toLowerCase());
			}
			baliseName = splitted.join("-").toLowerCase();
			template = template.replace(/\$classname/g, classInfo.name);
			template = template.replace(/\$balisename/g, baliseName);

			let parentClass = 'Aventus.WebComponent';
			if (classInfo.extends.length > 0) {
				parentClass = classInfo.extends[0].typeName;
				dependances.push(classInfo.extends[0].typeName);
			}
			template = template.replace(/\$parentClass/g, parentClass);
			htmlDoc = {
				[baliseName]: {
					name: baliseName,
					description: classInfo.documentation.join(EOL),
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
			['@press']: "onPress",
			['@longpress']: "onLongPress",
			['@drag']: "onDrag",
			['@press-stop']: "onStop",
			['@press-start']: "onStart",
			['@longpress-delay']: "delay",
		};
		const _checkAttribut = (el) => {
			for (var key in el.attribs) {
				if (key === "@element") {
					const _addElement = () => {
						var _id = _getId(el);
						var value = el.attribs[key].split('.');
						let varName = value[0];

						if (!toPrepare.variablesInView.hasOwnProperty(varName)) {
							if (value.length == 1) {
								toPrepare.variablesInView[varName] = _id;
							} else {
								toPrepare.variablesInView[varName] = ''
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
				else if (key.startsWith("@")) {
					var _addClick = () => {
						var _id = _getId(el);
						var value = el.attribs[key];
						toPrepare.eventsPerso.push({
							componentId: _id,
							value: value,
							event: key.replace("@", '')
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
							toPrepare.variablesInView[el.attribs[key].split(".")[0]] = '';
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
		const foundedWatch: string[] = [];
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
			let upgradeAttributes = "";
			let getterSetter = "";
			let attributesChanged = {};
			let attributesChangedTxt = ''
			let defaultValue = '';
			let variablesWatched: string[] = [];
			let variablesWatchedTxt = '';
			let variablesSimple = "";
			let listBool: string[] = [];
			let statesTxt = "";
			let variableProxyTxt = "";
			let variableProxyInit = "";
			let variableProxy = {};
			let variablesInViewStatic = '';
			let variablesInViewDynamic = '';
			let variablesStatic = "";


			const _createAttribute = (field: FieldModel) => {
				if (!field.type) {
					return;
				}

				let formattedType = getTypeForAttribute(document, field);

				for (let diag of formattedType.diagnostics) {
					result.diagnostics.push(diag);
				}
				if (formattedType.diagnostics.length > 0) {
					return;
				}


				if (field.name.toLowerCase() != field.name) {
					result.diagnostics.push(createErrorTsPos(document, "an attribute must be in lower case", field.start, field.end));
				}
				var _createDefaultValue = (key, defaultValueProp: string | undefined) => {
					key = key.toLowerCase();
					if (formattedType?.realType == TYPES.boolean) {
						if (defaultValueProp) {
							defaultValue += "if(!this.hasAttribute('" + key + "')) {this.setAttribute('" + key + "' ,'true'); }" + EOL;
						} else {
							//If default set to false, we refresh the attribute to set it to false and not undefined
							defaultValue += "if(!this.hasAttribute('" + key + "')) { this.attributeChangedCallback('" + key + "', false, false); }" + EOL;
						}
					}
					else if (formattedType?.realType == TYPES.date || formattedType?.realType == TYPES.datetime) {
						if (defaultValueProp === undefined) {
							return;
						}
						if (!defaultValueProp) { defaultValueProp = "" }
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = " + defaultValueProp + "; }" + EOL;

					}
					else {
						if (defaultValueProp === undefined) {
							return;
						}
						if (!defaultValueProp) { defaultValueProp = "" }
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = '" + defaultValueProp + "'; }" + EOL;
					}
				}
				_createDefaultValue(field.name, field.valueConstraint?.value);

				var _createGetterSetter = (key) => {
					key = key.toLowerCase();
					if (formattedType?.realType == TYPES.string) {
						getterSetter += `get '${key}'() {
                        return this.getAttribute('${key}');
                    }
                    set '${key}'(val) {
						if(val === undefined || val === null){this.removeAttribute('${key}')}
                        else{this.setAttribute('${key}',val)}
                    }${EOL}`;
					} else if (formattedType?.realType == TYPES.number) {
						getterSetter += `get '${key}'() {
                        return Number(this.getAttribute('${key}'));
                    }
                    set '${key}'(val) {
						if(val === undefined || val === null){this.removeAttribute('${key}')}
                        else{this.setAttribute('${key}',val)}
                    }${EOL}`;
					}
					else if (formattedType?.realType == TYPES.boolean) {
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
                    }${EOL}`;
					}
					else if (formattedType?.realType == TYPES.date) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return undefined;
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
							if(val === undefined || val === null){this.removeAttribute('${key}')}
                            else if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISODate());
                            }
							else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
					else if (formattedType?.realType == TYPES.datetime) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return undefined;
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
							if(val === undefined || val === null){this.removeAttribute('${key}')}
                            else if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISO());
                            } 
                            else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
				}
				_createGetterSetter(field.name);


				// html DOC
				htmlDoc[baliseName].attributes[field.name] = {
					name: field.name,
					description: field.documentation.join(EOL),
					type: formattedType.realType,
					values: formattedType.definedValues
				}

			}
			const _createProperty = (field: FieldModel, args: any[] = []) => {
				if (!field.type) {
					return;
				}

				let formattedType = getTypeForAttribute(document, field);

				for (let diag of formattedType.diagnostics) {
					result.diagnostics.push(diag);
				}
				if (formattedType.diagnostics.length > 0) {
					return;
				}

				if (field.name.toLowerCase() != field.name) {
					result.diagnostics.push(createErrorTsPos(document, "a property must be in lower case", field.start, field.end));
				}
				var _createDefaultValue = (key, defaultValueProp: string | undefined) => {
					key = key.toLowerCase();
					if (formattedType?.realType == TYPES.boolean) {
						if (defaultValueProp) {
							defaultValue += "if(!this.hasAttribute('" + key + "')) {this.setAttribute('" + key + "' ,'true'); }" + EOL;
						} else {
							//If default set to false, we refresh the attribute to set it to false and not undefined
							defaultValue += "if(!this.hasAttribute('" + key + "')) { this.attributeChangedCallback('" + key + "', false, false); }" + EOL;
						}
					}
					else if (formattedType?.realType == TYPES.date || formattedType?.realType == TYPES.datetime) {
						if (defaultValueProp === undefined) {
							return;
						}
						if (!defaultValueProp) { defaultValueProp = "" }
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = " + defaultValueProp + "; }" + EOL;

					}
					else {
						if (defaultValueProp === undefined) {
							return;
						}
						if (!defaultValueProp) { defaultValueProp = "" }
						defaultValue += "if(!this.hasAttribute('" + key + "')){ this['" + key + "'] = '" + defaultValueProp + "'; }" + EOL;
					}
				}
				_createDefaultValue(field.name, field.valueConstraint?.value);

				var _createGetterSetter = (key) => {
					key = key.toLowerCase();
					if (formattedType?.realType == TYPES.string) {
						getterSetter += `get '${key}'() {
                        return this.getAttribute('${key}');
                    }
                    set '${key}'(val) {
						if(val === undefined || val === null){this.removeAttribute('${key}')}
						else{this.setAttribute('${key}',val)}
                    }`+ EOL;
					} else if (formattedType?.realType == TYPES.number) {
						getterSetter += `get '${key}'() {
                        return Number(this.getAttribute('${key}'));
                    }
                    set '${key}'(val) {
						if(val === undefined || val === null){this.removeAttribute('${key}')}
                        else{this.setAttribute('${key}',val)}
                    }`+ EOL;
					}
					else if (formattedType?.realType == TYPES.boolean) {
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
                    }`+ EOL;
					}
					else if (formattedType?.realType == TYPES.date) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return undefined;
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
							if(val === undefined || val === null){this.removeAttribute('${key}')}
                            else if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISODate());
                            } else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
					else if (formattedType?.realType == TYPES.datetime) {
						getterSetter += `
                        get '${key}'() {
                            if(!this.hasAttribute('${key}')) {
                                return undefined;
                            }
                            return luxon.DateTime.fromISO(this.getAttribute('${key}'));
                        }
                        set '${key}'(val) {
							if(val === undefined || val === null){this.removeAttribute('${key}')}
                            else if (val instanceof luxon.DateTime) {
                                this.setAttribute('${key}', val.toISO());
                            } 
                            else {
                                throw new Error("Invalid date");
                            }
                        }
                        `;
					}
				}
				_createGetterSetter(field.name);

				upgradeAttributes += 'this.__upgradeProperty(\'' + field.name.toLowerCase() + '\');' + EOL;
				variablesWatched.push(field.name.toLowerCase());
				attributesChanged[field.name] = '';



				if (args.length > 0) {
					attributesChanged[field.name] += transpileMethod(args[0], ["this"]) + ';' + EOL;
				}

				// html DOC
				htmlDoc[baliseName].attributes[field.name] = {
					name: field.name,
					description: field.documentation.join(EOL),
					type: formattedType.realType,
					values: formattedType.definedValues
				}
			}
			const _createWatchVariable = (field: FieldModel, args: any[] = []) => {
				// if (field.type.typeKind == TypeKind.BASIC) {

				// }
				// if (field.type.typeKind == TypeKind.ARRAY) {
				// 	let arrayType: ArrayType = field.type as ArrayType;
				// 	let name = arrayType.base.typeName;
				// }
				let value = "";
				if (!field.valueConstraint || field.valueConstraint.value == undefined || field.valueConstraint.value == "undefined") {
					result.diagnostics.push(createErrorTsPos(document, "A watchable prop must be initialized", field.start, field.end));
				}
				else {
					// constraint is a function
					if (field.valueConstraint.isCallConstraint) {
						value = field.valueConstraint.value.name + `(${field.valueConstraint.value.arguments.join(", ")})`
					}
					else {
						if (field.type) {
							if (field.type.typeName.toLowerCase() === TYPES.string) {
								value = `"${field.valueConstraint.value}"`;
							} else if (field.type.typeName.toLowerCase() === TYPES.date) {
								value = `luxon.DateTime.fromJSDate(${field.valueConstraint.value})`;
							} else if (TYPES[field.type.typeName.toLowerCase()]) {
								value = field.valueConstraint.value
							} else if (field.valueConstraint.value.startsWith && field.valueConstraint.value.startsWith("new ")) {
								value = field.valueConstraint.value;
							} else {
								value = JSON.stringify(field.valueConstraint.value);
							}
						}
						else {
							value = JSON.stringify(field.valueConstraint.value);
						}
					}
				}
				if (value == '"undefined"') { value = "undefined" }
				let watchAction = `this.__watchActions["${field.name}"] = []`;
				let txtWatchFct = "";
				if (args.length > 0) {
					txtWatchFct = transpileMethodNoRun(args[0]);
				}
				watchAction = `this.__watchActions["${field.name}"] = [${txtWatchFct}];
						this.__watchActionsCb["${field.name}"] = (action, path, value) => {
							for (let fct of this.__watchActions["${field.name}"]) {
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
						return this.__watch["${field.name}"];
					}
					set '${field.name}'(val) {
						this.__watch["${field.name}"] = val;
					}`+ EOL;
				variableProxy[field.name] = `${watchAction}`;
				variableProxyInit += `this["${field.name}"] = ${value};`;
				foundedWatch.push(field.name);
			}
			const _createSimpleVariable = (field: CustomFieldModel) => {
				if (toPrepare.variablesInView.hasOwnProperty(field.name)) {
					result.diagnostics.push(createErrorTsPos(document, "Please add @ViewElement", field.start, field.end));
					return;
				}
				let value = "undefined";
				if (field.hasOwnProperty('valueConstraint')) {
					if (field.valueConstraint != null && field.valueConstraint.hasOwnProperty("value")) {
						value = JSON.stringify(field.valueConstraint.value);
					}
				}
				if (field.isStatic) {
					variablesStatic += `static ${field.name} = ${value};` + EOL;
				}
				else {
					variablesSimple += `if(this.${field.name} === undefined) {this.${field.name} = ${value};}` + EOL;
				}

			}
			const _createViewVariable = (field: CustomFieldModel) => {
				if (!toPrepare.variablesInView.hasOwnProperty(field.name)) {
					result.diagnostics.push(createErrorTsPos(document, "Can't find this variable inside the view", field.start, field.end));
				}
				else {
					let id = toPrepare.variablesInView[field.name];
					if (id != "") {
						let isArray: boolean = false;
						if (field.type?.typeKind == TypeKind.ARRAY) {
							isArray = true;
						}
						if (field.propType == "ViewElement") {
							if (field.arguments && field.arguments[0] && field.arguments[0]["useLive"]) {
								if (isArray) {
									variablesInViewDynamic += `get ${field.name} () {
										var list = Array.from(this.shadowRoot.querySelectorAll('[_id="${id}"]'));
										return list;
									}`+ EOL
								}
								else {
									variablesInViewDynamic += `get ${field.name} () {
										return this.shadowRoot.querySelector('[_id="${id}"]');
									}`+ EOL
								}
								return;
							}
							else {
								if (isArray) {
									variablesInViewStatic += `this.${field.name} = Array.from(this.shadowRoot.querySelectorAll('[_id="${id}"]'));` + EOL
								}
								else {
									variablesInViewStatic += `this.${field.name} = this.shadowRoot.querySelector('[_id="${id}"]');` + EOL
								}
							}
						}
						else {
							result.diagnostics.push(createErrorTsPos(document, "You must add the decorator ViewElement", field.start, field.end));
						}



					}
				}
			}
			const _createStates = (field) => {
				var states = field.valueConstraint.value;
				let fctStateTxt = "";
				let slugGenerator = "";
				let defineStateName = "";
				for (var key in states) {
					if (key == "stateManagerName") {
						defineStateName = "__getStateManagerName(){retrun \"" + states[key] + "\";}" + EOL
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
                            };`+ EOL
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
                            };`+ EOL
						}
					}
				}

				statesTxt = defineStateName + slugGenerator + EOL + fctStateTxt;
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
							if (toPrepare.allFields[fieldName]) {
								let propType = toPrepare.allFields[fieldName].type?.typeName.toLowerCase();

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
					if (attributesChanged[fieldName]) {
						attributesChanged[fieldName] += stringToAdd;
					} else {
						attributesChanged[fieldName] = stringToAdd;
					}
				}
			}
			let listToCheck = Object.keys(toPrepare.variablesInView);
			const _removeFieldToCheck = (field: CustomFieldModel) => {
				let index = listToCheck.indexOf(field.name);
				if (index != -1) {
					listToCheck.splice(index, 1);
				}
			}
			for (let fieldName in toPrepare.allFields) {
				let field = toPrepare.allFields[fieldName];

				if (field.inParent) {
					_removeFieldToCheck(field);
					if (toPrepare.variablesInView.hasOwnProperty(field.name)) {
						// allow override value
						_createSimpleVariable(field);
					}
					continue;
				}
				if (field.propType == "State") {
					_createStates(field);
					continue;
				}
				else if (field.propType == "Attribute") {
					_createAttribute(field);
					continue;
				}
				else if (field.propType == "Property") {
					for (let decorator of field.decorators) {
						if (decorator.name == "Property") {
							_createProperty(field, decorator.arguments);
						}
					}
					continue;
				}
				else if (field.propType == "Watch") {
					_removeFieldToCheck(field);
					for (let decorator of field.decorators) {
						if (decorator.name == "Watch") {
							_createWatchVariable(field, decorator.arguments);
						}
					}
				}
				else if (field.propType == "ViewElement") {
					_removeFieldToCheck(field);
					_createViewVariable(field);
				}
				else if (field.propType == "Simple") {
					_removeFieldToCheck(field);
					_createSimpleVariable(field);
				}
			}
			_updateTemplate();


			for (var key in attributesChanged) {
				if (attributesChanged[key] !== "") {
					let realKey = key.split(".")[0];
					if (toPrepare.allFields[realKey]) {
						if (!toPrepare.allFields[realKey].inParent || classInfo.overrideView) {
							attributesChangedTxt += `this.__onChangeFct['${realKey}'] = []` + EOL;
						} else {
							attributesChangedTxt += `if (!this.__onChangeFct['${realKey}']) {\r\nthis.__onChangeFct['${realKey}'] = []${EOL}}` + EOL;
						}
						attributesChangedTxt += `this.__onChangeFct['${realKey}'].push((path) => {${attributesChanged[key]}})` + EOL;
					}
					else {
						result.diagnostics.push(createErrorTs(document, realKey + ' can\'t be found'));
					}
				}
			}
			for (var key in variableProxy) {
				if (variableProxy[key] !== "") {
					variableProxyTxt += `${variableProxy[key]}` + EOL
				}
			}

			for (let missingVar of listToCheck) {
				result.diagnostics.push(createErrorTs(document, "missing variable " + missingVar));
			}

			//#region writing into template
			template = template.replace(/\$variablesStatic/g, variablesStatic);
			template = template.replace(/\$variablesInViewDynamic/g, variablesInViewDynamic);
			if (variablesInViewStatic.length > 0) {
				variablesInViewStatic = `__mapSelectedElement() { super.__mapSelectedElement(); ${variablesInViewStatic}}`;
			}
			template = template.replace(/\$variablesInViewStatic/g, variablesInViewStatic);

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

			let debugWatchTxt = '';
			if (classInfo.debuggerOption.enableWatchHistory) {
				debugWatchTxt = `if(this.__watch){
	this.__watch.enableHistory();
	this.getWatchHistory = () => {
		return this.__watch.getHistory();
	}
	this.clearWatchHistory = () => {
		return this.__watch.clearHistory();
	}
}`
			}
			if (variableProxyTxt.length > 0) {

				variableProxyTxt = `__prepareWatchesActions() {
					${variableProxyTxt}
					super.__prepareWatchesActions();
					${debugWatchTxt}
				}`

				variableProxyTxt += `\r\n__initWatches() {
					super.__initWatches();
					${variableProxyInit}
				}`
			}
			else if (debugWatchTxt.length > 0) {
				variableProxyTxt = `__prepareWatchesActions() {
					super.__prepareWatchesActions();
					${debugWatchTxt}
				}`
			}
			template = template.replace(/\$watches/g, variableProxyTxt);
			//#endregion
		}
		const _createMethods = () => {
			let methodsTxt = "";
			for (let method of classInfo.methods) {
				if (!method.isAbstract) {
					//remove comment 
					method.text = method.text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
					// remove manual type
					let regexRemoveType = new RegExp(method.name + "\\(.*?\\)(:( *){((\\s|\\S)*?)})", "g")
					let matchType = regexRemoveType.exec(method.text);
					if (matchType) {
						method.text = method.text.replace(matchType[1], "");
					}

					let regexMethod = /\).*?{((\s|\S)*)}/g;
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
						methodsTxt += methodFinal + " " + method.name + "(" + args.join(",") + "){" + methodTxt + "}" + EOL;
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
					onPressTxt += `"onPress": (e, pressInstance) => {
                        this.${current["onPress"]}(e, pressInstance);
                     },`;
				}
				if (current.hasOwnProperty("onLongPress")) {
					onLongPressTxt += `"onLongPress": (e, pressInstance) => {
                        this.${current["onLongPress"]}(e, pressInstance);
                     },`;
				}
				if (current.hasOwnProperty("onStop")) {
					onPressStopTxt = `"onStop": (e, pressInstance) => {
                        this.${current["onStop"]}(e, pressInstance);
                    },`;
				}
				if (current.hasOwnProperty("onStart")) {
					onPressStopTxt = `"onStart": (e, pressInstance) => {
                        this.${current["onStart"]}(e, pressInstance);
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
				if (foundedWatch.indexOf(firstInNamePart) == -1) {
					let found = false;
					for (let dependance of item.__dependances) {
						if (toPrepare.loop[dependance].__itemName == firstInNamePart) {
							found = true;
							break;
						}
					}
					if (!found) {
						result.diagnostics.push(createErrorTs(document, 'variable ' + firstInNamePart + ' inside in of for loop must be watchable'));
					}
				}
				loopTxt += `this.__loopTemplate['${key}'] = \`${item.__template}\`;` + EOL;
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
							item.__templates["${varTemp.name}"] = [];` + EOL
						}
						if (current.isProperty) {
							let txtCreate = ""
							let checkRawValue = variables.length == 1 && !variables[0].name.startsWith("$index$_") && value == '""+element.__values["' + variables[0].name + '"]+""';
							for (let varTemp of variables) {
								if (variablesForItems[componentId].indexOf(varTemp.name) == -1) {
									forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceValue*/", _createVariable(varTemp) + "/**replaceValue*/");
								}
								if (checkRawValue) {
									txtCreate += `item.__templates["${varTemp.name}"].push(((element, forceRefreshView = false) => {
										let varToCheck = element.__values["${varTemp.name}"];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["${current.propName}"] = varToCheck;
										}
										else{
											element.setAttribute("${current.propName}", ${value});
										}

										if (forceRefreshView) {
											if(element.__onChangeFct && element.__onChangeFct["${current.propName}"]){
												for(let fct of element.__onChangeFct["${current.propName}"]){
													fct("${current.propName}")
												}
											}
										}
									}));`+ EOL
								}
								else {
									txtCreate += `item.__templates["${varTemp.name}"].push(((element) => element.setAttribute("${current.propName}", ${value})));` + EOL
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
								txtCreate += `item.__templates["${varTemp.name}"].push(((element) => element.innerHTML = ${value}));` + EOL
							}
							forActionsCreateSelector[componentId] = forActionsCreateSelector[componentId].replace("/**replaceTemplate*/", txtCreate + "/**replaceTemplate*/");
						}
					}
				}
				loopTxt += `this.__prepareForCreate['${key}'] = (el, data, key, indexes) => {
					let result = {};
					${Object.values(wrapperActionsSelector).join(EOL)}
					${resultDefinition.join(EOL)}
					${Object.values(forActionsCreateSelector).join(EOL)}
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

			if (!virtualDoc && existsSync(documentInfo.folderPath + '/_lang')) {
				var translationsKey: string[] = [];
				readdirSync(documentInfo.folderPath + '/_lang').forEach(file => {
					if (file.indexOf('.json') !== -1) {
						var lang = file.replace('.json', '');
						allLangs.push(lang);

						var translations = JSON.parse(readFileSync(documentInfo.folderPath + '/_lang/' + file, 'utf8'));

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

							applyTranslations += '\tthis._components["' + use.componentId + '"].innerHTML = ' + use.value + ';' + EOL;
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
		_constructor();
		_createTranslations();
		_createFields();
		_createMethods();
		_createEvents();
		_createForLoop();

		template = template.replace(/\|\!\*(.*?)\*\!\|/g, "{{$1}}")

	}
	_createClassname();
	_prepareView();
	_prepareFile();

	// remove empty line
	template = removeWhiteSpaceLines(template)
	// fs.writeFileSync(folderPath + '/compiled.js', template);
	if (classInfo.debuggerOption.writeCompiled) {
		writeFileSync(documentInfo.folderPath + '/compiled.js', template);
	}
	else if (existsSync(documentInfo.folderPath + '/compiled.js')) {
		unlinkSync(documentInfo.folderPath + '/compiled.js')
	}
	let struct = parseDocument(documentInfo.scriptDocument);
	let doc = "";
	if (struct.classes.length == 1) {
		let classContent = removeComments(removeDecoratorFromClassContent(struct.classes[0]));
		classContent = replaceFirstExport(classContent);
		doc = compileDocTs(classContent);
	}
	let customCssProperties: SCSSDoc = {
		[baliseName]: scssMode.getCustomProperty(documentInfo.cssResult.rawContent)
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