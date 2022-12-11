import { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AventusExtension } from "../../../../definition";
import { Build } from "../../../../project/Build";
import { createErrorTs, createErrorTsPos, createErrorTsSection, pathToUri } from "../../../../tools";
import { AliasNode, BasicType, ClassModel, DefaultClassModel, EnumDeclaration, FieldModel, Module, TypeKind, TypeModel, UnionType } from "../../../../ts-file-parser";
import { getAlias } from "../../../../ts-file-parser/src/tsStructureParser";
import { AventusHTMLFile } from "../../../html/File";
import { AventusSCSSFile } from "../../../scss/File";
import { AventusWebComponentLogicalFile } from "../File";
import { CompileComponentResult, CompilerClassInfo, CustomClassInfo, CustomFieldModel, CustomTypeAttribute, TYPES } from "./def";
import { AventusWebcomponentTemplate } from "./Template";
import * as cheerio from 'cheerio';
import { ElementType } from "htmlparser2";
import { transpile } from "typescript";
import { AventusTsLanguageService, getSectionStart } from "../../LanguageService";
import { existsSync, readdirSync, readFileSync } from "fs";
import { EOL } from "os";
import { HTMLDoc } from "../../../html/helper/definition";
import { SCSSDoc } from "../../../scss/helper/CSSNode";
import { AventusSCSSLanguageService } from "../../../scss/LanguageService";
import { AventusFile } from '../../../../files/AventusFile';


export class AventusWebcomponentCompiler {
    public static getVersion(logicalFile: AventusWebComponentLogicalFile, build: Build) {
        let version = {
            ts: logicalFile.file.version,
            scss: -1,
            html: -1
        }
        let scssFile: AventusSCSSFile | undefined;
        let htmlFile: AventusHTMLFile | undefined;
        if (logicalFile.file.uri.endsWith(AventusExtension.Component)) {
            scssFile = build.wcFiles[logicalFile.file.uri].style;
            htmlFile = build.wcFiles[logicalFile.file.uri].view;
        }
        else {
            scssFile = build.scssFiles[logicalFile.file.uri.replace(AventusExtension.ComponentLogic, AventusExtension.ComponentStyle)];
            htmlFile = build.htmlFiles[logicalFile.file.uri.replace(AventusExtension.ComponentLogic, AventusExtension.ComponentView)];
        }

        if (scssFile) { version.scss = scssFile.compiledVersion; }
        if (htmlFile) { version.html = htmlFile.compiledVersion; }
        return version;
    }

    private file: AventusFile;
    private logicalFile: AventusWebComponentLogicalFile;
    private jsTxt: string = "";
    private scssTxt: string = "";
    private htmlTxt: string = "";
    private template: string;
    private document: TextDocument;
    private build: Build;
    private jsonStructure: Module;
    private classInfo: CompilerClassInfo | undefined;
    private className: string = "";
    private parentClassName: string = "";
    private tagName: string = "";
    private jQuery: cheerio.CheerioAPI;
    private htmlDoc: HTMLDoc | undefined;
    private otherContent: string = "";
    private otherDocVisible: string = "";
    private otherDocInvisible: string = "";
    private otherDebugTxt: string = "";
    //#region variable to use for preparation
    private variablesIdInView: { [name: string]: { id: string, type: string } } = {};
    private eventsPerso: { componentId: string, value: string, event: string }[] = [];
    private pressEvents: { [id: string]: {} } = {};
    private allFields: { [fieldName: string]: CustomFieldModel } = {};
    private actionByComponent: {
        [varName: string]: {
            componentId: string,
            prop?: string,
            value: string
        }[]
    } = {};
    private loop: {} = {};
    private idElement: number = 0;
    private listBoolProperties: string[] = [];
    private propertiesChanged: { [propName: string]: string } = {};
    private foundedWatch: string[] = [];
    private result: CompileComponentResult = {
        diagnostics: [],
        writeCompiled: false,
        missingViewElements: { position: -1, elements: {} },
        componentName: '',
        result: {
            nameCompiled: [],
            nameDoc: [],
            debug: '',
            src: '',
            docVisible: '',
            docInvisible: '',
            dependances: [],
            htmlDoc: {},
            scssDoc: {}
        }
    }
    private fullClassName: string = '';
    //#endregion

    public constructor(logicalFile: AventusWebComponentLogicalFile, build: Build) {
        this.logicalFile = logicalFile;
        let name = logicalFile.file.uri;
        let scssFile: AventusSCSSFile | undefined;
        let htmlFile: AventusHTMLFile | undefined;
        if (logicalFile.file.uri.endsWith(AventusExtension.Component)) {
            this.file = build.wcFiles[logicalFile.file.uri].logic.file;
            scssFile = build.wcFiles[logicalFile.file.uri].style;
            htmlFile = build.wcFiles[logicalFile.file.uri].view;
        }
        else {
            this.file = logicalFile.file;
            scssFile = build.scssFiles[logicalFile.file.uri.replace(AventusExtension.ComponentLogic, AventusExtension.ComponentStyle)];
            htmlFile = build.htmlFiles[logicalFile.file.uri.replace(AventusExtension.ComponentLogic, AventusExtension.ComponentView)];
        }
        this.scssTxt = scssFile ? scssFile.compileResult : '';
        this.htmlTxt = htmlFile ? htmlFile.compileResult : '';
        this.htmlTxt = this.htmlTxt.replace(/\\\{\{(.*?)\}\}/g, "|!*$1*!|");
        this.jsTxt = this.file.content;
        this.result.diagnostics = build.tsLanguageService.doValidation(this.file);
        this.jQuery = cheerio.load(this.htmlTxt);

        this.template = AventusWebcomponentTemplate();
        this.document = logicalFile.file.document;
        this.build = build;
        this.jsonStructure = logicalFile.fileParsed;
    }


    public compile(): CompileComponentResult {
        let classInfo = this.getClassInfo();

        if (classInfo) {
            this.classInfo = classInfo;
            let normalCompile = AventusTsLanguageService.compileTs(this.classInfo, this.logicalFile);
            this.result.result.dependances = normalCompile.dependances;
            this.fullClassName = normalCompile.classDoc;
            this.result.result.nameCompiled.push(normalCompile.classScript);
            this.result.result.nameDoc.push(normalCompile.classDoc);
            this.prepareHTMLDocObject();
            this.loadParent(this.jsonStructure);
            this.prepareViewRecu(this.jQuery._root);
            this.prepareOtherContent();
            this.writeFile();

            let finalSrc = this.otherContent;
            if (finalSrc.length > 0 && !finalSrc.endsWith("\n")) {
                finalSrc += EOL;
            }
            finalSrc += this.template;

            let finalDocVisible = this.otherDocVisible;
            let finalDocInvisible = this.otherDocInvisible;
            if (finalDocVisible.length > 0 && !finalDocVisible.endsWith("\n")) {
                finalDocVisible += EOL;
            }
            if (finalDocInvisible.length > 0 && !finalDocInvisible.endsWith("\n")) {
                finalDocInvisible += EOL;
            }
            if (classInfo.isExported) {
                finalDocVisible += normalCompile.doc;
            }
            else {
                finalDocInvisible += normalCompile.doc;
            }

            this.result.writeCompiled = classInfo.debuggerOption.writeCompiled ? true : false;
            if (this.result.writeCompiled) {
                this.result.result.debug = this.otherDebugTxt + finalSrc;
            }

            this.result.result.src = finalSrc;
            this.result.result.docVisible = finalDocVisible;
            this.result.result.docInvisible = finalDocInvisible;
            this.result.result.htmlDoc = this.htmlDoc ? this.htmlDoc : {};
            this.result.result.scssDoc = this.prepareDocSCSS();
        }
        return this.result;
    }
    //#region load info from files

    private getClassInfo(): CompilerClassInfo | null {

        if (this.jsonStructure.functions.length > 0) {
            for (let fct of this.jsonStructure.functions) {
                this.result.diagnostics.push(createErrorTsPos(this.document, "You can't declare function outside of your class", fct.start, fct.end))
            }
        }
        if (this.jsonStructure.variables.length > 0) {
            for (let variable of this.jsonStructure.variables) {
                this.result.diagnostics.push(createErrorTsPos(this.document, "You can't declare variable outside of your class", variable.start, variable.end))
            }
        }
        let customClassInfo: CustomClassInfo = {
            debuggerOption: {},
            overrideView: {
                enable: false,
                removeViewVariables: []
            }
        }
        let classInfo: CompilerClassInfo = {
            ...DefaultClassModel,
            ...customClassInfo
        };

        for (let i = 0; i < this.jsonStructure.functions.length; i++) {
            let fct = this.jsonStructure.functions[i];
            this.result.diagnostics.push(createErrorTsPos(this.document, "You can't write function outside of your class", fct.start, fct.end))
        }

        for (let i = 0; i < this.jsonStructure.classes.length; i++) {
            if (!this.jsonStructure.classes[i].isInterface) {
                let foundDefaultComponent = false;
                for (let implement of this.jsonStructure.classes[i].implements) {
                    if (implement.typeName == 'Aventus.DefaultComponent' || implement.typeName == 'DefaultComponent') {
                        foundDefaultComponent = true;
                        break;
                    }
                }
                if (foundDefaultComponent) {
                    if (classInfo.name === "") {
                        classInfo = {
                            ...this.jsonStructure.classes[i],
                            ...customClassInfo
                        }
                    }
                    else {
                        let txt = "Only one class is allowed inside a file. Get " + classInfo.name + " and " + this.jsonStructure.classes[i].name;
                        this.result.diagnostics.push(createErrorTsPos(this.document, txt, classInfo.nameStart, classInfo.nameEnd));
                        this.result.diagnostics.push(createErrorTsPos(this.document, txt, this.jsonStructure.classes[i].nameStart, this.jsonStructure.classes[i].nameEnd));
                    }
                }
                else {
                    this.result.diagnostics.push(createErrorTsPos(this.document, "Only class that implements DefaultComponent can be used", classInfo.nameStart, classInfo.nameEnd));
                }
            }
        }

        if (classInfo.name == "") {
            this.result.diagnostics.push(createErrorTs(this.document, "Can't found a web component class to compile inside"))
            return null;
        }
        for (let decorator of classInfo.decorators) {
            if (decorator.name == 'OverrideView') {
                classInfo.overrideView.enable = true;
                if (decorator.arguments.length > 0) {
                    for (let arg of decorator.arguments) {
                        if (arg.removeViewVariables) {
                            classInfo.overrideView.removeViewVariables = arg.removeViewVariables;
                        }
                    }

                }
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
            classInfo.overrideView.enable = true;
        }
        this.getClassName(classInfo);



        return classInfo;
    }
    private prepareHTMLDocObject() {
        if (this.classInfo && !this.classInfo.isAbstract) {
            this.htmlDoc = {
                [this.tagName]: {
                    class: this.fullClassName,
                    name: this.tagName,
                    description: this.classInfo.documentation.join(EOL),
                    attributes: {}
                }
            };
        }
    }
    private getClassName(classInfo: CompilerClassInfo) {
        let splittedName = classInfo.name.match(/[A-Z][a-z]+/g);
        if (splittedName) {
            let componentPrefix = this.build.getComponentPrefix();
            if (componentPrefix.length > 0 && splittedName[0].toLowerCase() != componentPrefix.toLowerCase()) {
                // no special tag => add one
                splittedName.splice(0, 0, componentPrefix.toLowerCase());
            }
            this.tagName = splittedName.join("-").toLowerCase();
            this.className = classInfo.name;
            this.parentClassName = 'Aventus.WebComponent';
            if (classInfo.extends.length > 0) {
                if (classInfo.extends[0].typeKind == TypeKind.BASIC) {
                    let namespace = (classInfo.extends[0] as BasicType).nameSpace;
                    if (namespace != "") {
                        namespace += "."
                    }
                    this.parentClassName = namespace + (classInfo.extends[0] as BasicType).basicName;
                }
                else {
                    this.parentClassName = classInfo.extends[0].typeName;
                }
            }
        }
    }

    private loadParent(jsonStruct: Module, isFirst: boolean = true) {
        if (jsonStruct.classes.length > 0) {
            let fields = this.loadFields(jsonStruct.classes[0], isFirst);
            this.allFields = {
                ...this.allFields,
                ...fields
            }

            if (jsonStruct.classes[0].extends.length > 0 && jsonStruct.classes[0].extends[0].typeName != "WebComponent" && jsonStruct.classes[0].extends[0].typeName != "Aventus.WebComponent") {
                // search parent inside local import
                let nameToUse = jsonStruct.classes[0].extends[0].typeName;
                if (jsonStruct.classes[0].extends[0].typeKind == TypeKind.BASIC) {
                    let namespace = (jsonStruct.classes[0].extends[0] as BasicType).nameSpace;
                    if (namespace) { namespace += '.' }
                    nameToUse = namespace + (jsonStruct.classes[0].extends[0] as BasicType).basicName;
                }
                for (let importTemp of jsonStruct._imports) {
                    for (let name of importTemp.clauses) {

                        if (name == nameToUse) {
                            let newPath = importTemp.absPathString.replace(/\\/g, "/");
                            let newUri = pathToUri(newPath);
                            let parentScript = this.build.tsFiles[newUri];
                            if (parentScript) {
                                this.loadParent(parentScript.fileParsed, false);
                            }
                            return;
                        }
                    }
                }
                // search parent inside definition file
                let classInfoInDef = this.build.getWebComponentDefinition(nameToUse);
                if (classInfoInDef) {
                    let fields = this.loadFields(classInfoInDef, false);
                    this.allFields = {
                        ...this.allFields,
                        ...fields
                    }
                    return;
                }
                if (this.classInfo) {
                    this.result.diagnostics.push(createErrorTsPos(this.document, "can't found the path for parent " + jsonStruct.classes[0].extends[0].typeName, this.classInfo.nameStart, this.classInfo.nameEnd));
                }
                else {
                    this.result.diagnostics.push(createErrorTs(this.document, "can't found the path for parent " + jsonStruct.classes[0].extends[0].typeName));
                }
            }
        }
    }

    private loadFields(classInfo: ClassModel, isBase: boolean): { [key: string]: CustomFieldModel } {
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
    private prepareOtherContent() {
        this.otherContent = "";

        let elementCompile = (cls: ClassModel | EnumDeclaration | AliasNode) => {
            let result = AventusTsLanguageService.compileTs(cls, this.logicalFile);
            this.otherContent += result.compiled;
            if (cls.isExported) {
                this.otherDocVisible += result.doc;
            }
            else {
                this.otherDocInvisible += result.doc;
            }
            this.otherDebugTxt += result.debugTxt;
            if (result.classScript.length > 0) {
                this.result.result.nameCompiled.push(result.classScript);
            }
            if (result.classDoc.length > 0) {
                this.result.result.nameDoc.push(result.classDoc);
            }
            for (let dependance of result.dependances) {
                if (this.result.result.dependances.indexOf(dependance) == -1) {
                    this.result.result.dependances.push(dependance);
                }
            }
        }

        for (let _class of this.jsonStructure.classes) {
            if (_class.isInterface) {
                elementCompile(_class);
            }
        }
        for (let enm of this.jsonStructure.enumDeclarations) {
            elementCompile(enm);

        }
        for (let alias of this.jsonStructure.aliases) {
            elementCompile(alias);
        }
    }
    //#endregion

    //#region prepare view
    private prepareViewRecu(el: cheerio.AnyNode) {
        if (el.hasOwnProperty("attribs")) {
            let element = el as cheerio.Element;
            this.prepareViewCheckAttribute(element);
            this.prepareViewCheckHTML(element);
        }
        if (el["children"]) {
            for (var i = 0; i < el["children"].length; i++) {
                if (el["children"][i].type != ElementType.Text) {
                    this.prepareViewRecu(el["children"][i]);
                }
            }
        }
        if (el.hasOwnProperty("attribs")) {
            let element = el as cheerio.Element;
            this.prepareViewCheckLoop(element);
        }
    }
    private prepareViewGetId(el: cheerio.Element) {
        let attr = this.jQuery(el).attr('_id');
        if (attr) {
            return attr;
        }
        let idTxt = this.className.toLowerCase() + '_' + this.idElement;
        this.jQuery(el).attr('_id', idTxt);
        this.idElement++;
        return idTxt;
    }
    private prepareViewCheckAttribute(el: cheerio.Element) {
        let pressEventMap = {
            ['@press']: "onPress",
            ['@longpress']: "onLongPress",
            ['@drag']: "onDrag",
            ['@press-stop']: "onStop",
            ['@press-start']: "onStart",
            ['@longpress-delay']: "delay",
        };
        for (let key in el.attribs) {
            if (key === "@element") {
                let _id = this.prepareViewGetId(el);
                let value = el.attribs[key].split('.');
                let varName = value[0];

                if (!this.variablesIdInView.hasOwnProperty(varName)) {

                    if (value.length == 1) {
                        this.variablesIdInView[varName] = {
                            id: _id,
                            type: el.name
                        }
                    } else {
                        this.variablesIdInView[varName] = {
                            id: '',
                            type: el.name
                        }
                    }
                }
                this.jQuery(el).removeAttr(key);
            }
            else if (pressEventMap.hasOwnProperty(key)) {
                let value = el.attribs[key];
                let _id = this.prepareViewGetId(el);
                if (!this.pressEvents.hasOwnProperty(_id)) {
                    this.pressEvents[_id] = {};
                }
                let pressEvent = this.pressEvents[_id];
                pressEvent[pressEventMap[key]] = value;
            }
            else if (key.startsWith("@")) {
                let _id = this.prepareViewGetId(el);
                let value = el.attribs[key];
                this.eventsPerso.push({
                    componentId: _id,
                    value: value,
                    event: key.replace("@", '')
                });
                this.jQuery(el).removeAttr(key);
            }
            else {
                let matches = el.attribs[key].match(/\{\{(.*?)\}\}/g);
                if (matches && matches.length > 0) {
                    let variables: string[] = [];
                    for (var i = 0; i < matches.length; i++) {
                        let variableName = matches[i].replace(/\{\{|\}\}/g, '').trim();
                        variables.push(variableName);
                        el.attribs[key] = el.attribs[key].replace(matches[i], '{{' + variableName.toLowerCase() + '}}');
                    }

                    let _id = this.prepareViewGetId(el);
                    for (var i = 0; i < variables.length; i++) {
                        let variableName = variables[i];
                        if (!this.actionByComponent.hasOwnProperty(variableName)) {
                            this.actionByComponent[variableName] = [];
                        }

                        this.actionByComponent[variableName].push({
                            componentId: _id,
                            prop: key.toLowerCase(),
                            value: el.attribs[key]
                        });


                    }
                    this.jQuery(el).removeAttr(key);
                }
            }
        }
    }
    private prepareViewCheckHTML(el: cheerio.Element) {
        if (el.type != 'tag') {
            return;
        }
        if (el.name == "for") {
            return;
        }

        let elHTML = this.jQuery(el);
        let htmlTxt = elHTML.html();
        if (!htmlTxt) {
            htmlTxt = "";
        }
        let containsElement = htmlTxt.match(/<(\s|\S)*>(\s|\S)*<\/(\s|\S)*>/);
        // si la balise contient une autre balise on ne fait rien
        if (!containsElement || containsElement.length == 0) {
            // on regarde si le text contient une variable
            let matches = htmlTxt.match(/\{\{(.*?)\}\}/g);
            if (matches && matches.length > 0) {
                let variables: string[] = [];
                // pour chaque variable
                for (let i = 0; i < matches.length; i++) {
                    let variableName = matches[i].replace(/\{\{|\}\}/g, '').trim();
                    variables.push(variableName);
                    // on la normalize (on enleve les espaces)
                    elHTML.html(htmlTxt.replace(matches[i], '{{' + variableName + '}}'));
                }

                let _id = this.prepareViewGetId(el);
                for (let i = 0; i < variables.length; i++) {
                    let variableName = variables[i];
                    if (!this.actionByComponent.hasOwnProperty(variableName)) {
                        this.actionByComponent[variableName] = [];
                    }

                    this.actionByComponent[variableName].push({
                        componentId: _id,
                        value: htmlTxt
                    });
                }
                elHTML.html('')
            }
        }
    }
    private prepareViewCheckLoop(el: cheerio.Element) {
        if (el.name == "av-for") {
            let itemFound = false;
            let inFound = false;
            let itemName = "";
            let inName = "";
            let indexName = "";
            let dependances: string[] = [];
            let parent = this.jQuery(el).parent();
            while (parent[0].name != 'body') {
                if (parent[0].name == "av-for") {
                    dependances.push(this.prepareViewGetId(parent[0]));
                }
                parent = this.jQuery(parent).parent();
            }
            for (var key in el.attribs) {
                if (key === 'item') {
                    itemFound = true;
                    if (["__itemName", "__template", "__inName"].indexOf(key) != -1) {
                        this.result.diagnostics.push(createErrorTs(this.document, "You can't use __template, __itemName or __inName as name for item inside av-for"));
                    }
                    itemName = el.attribs[key];
                }
                else if (key == "in") {
                    inFound = true;
                    if (dependances.length == 0) {
                        this.variablesIdInView[el.attribs[key].split(".")[0]].id = '';
                    }
                    inName = el.attribs[key];
                }
                else if (key == "index") {
                    indexName = el.attribs[key];
                }
            }
            if (!inFound || !itemFound) {
                this.result.diagnostics.push(createErrorTs(this.document, "Your loop must have an attribute item and an attribute in"));
                return;
            }
            let idTemp = this.prepareViewGetId(el);
            this.loop[idTemp] = {};
            for (let key in this.actionByComponent) {
                if (key.startsWith(itemName + ".") || key == itemName || (indexName != '' && key == indexName)) {
                    for (let compAction of this.actionByComponent[key]) {
                        if (!this.loop[idTemp][compAction.componentId]) {
                            this.loop[idTemp][compAction.componentId] = [];
                        }
                        let newData = {
                            isProperty: compAction.hasOwnProperty("prop"),
                            propName: compAction.prop ? compAction.prop : '',
                            value: compAction.value
                        }
                        let found = false;
                        for (let alreadyIn of this.loop[idTemp][compAction.componentId]) {
                            if (alreadyIn.isProperty == newData.isProperty && alreadyIn.propName == newData.propName && alreadyIn.value == newData.value) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            this.loop[idTemp][compAction.componentId].push(newData)
                        }
                    }
                    delete this.actionByComponent[key];
                }
            }
            let html = this.jQuery(el).html();

            if (!html) {
                html = "";
            }
            this.jQuery(el).html('');
            this.loop[idTemp].__template = html.replace(/\n/g, "");
            this.loop[idTemp].__itemName = itemName;
            this.loop[idTemp].__inName = inName;
            this.loop[idTemp].__indexName = indexName;
            this.loop[idTemp].__dependances = dependances;
        }
    }

    //#endregion

    //#region prepare file
    private writeFile() {
        this.writeFileName();
        this.writeFileTemplateHtml();
        this.writeFileReplaceVar("style", this.scssTxt);
        this.writeFileReplaceVar("maxId", this.idElement);
        this.writeFileConstructor();
        this.writeFileTranslations();
        this.writeFileFields();
        this.writeFileMethods();
        this.writeFileEvents();
        this.writeFileLoop();
        this.template = this.template.replace(/\|\!\*(.*?)\*\!\|/g, "{{$1}}");
        this.template = this.removeWhiteSpaceLines(this.template);


    }
    private writeFileReplaceVar(variable: string, value: string | number) {
        let regex = new RegExp("\\$" + variable + "\\$", "g");
        this.template = this.template.replace(regex, value + "");
    }
    private writeFileName() {
        this.result.componentName = this.className;
        this.writeFileReplaceVar("classname", this.className)
        this.writeFileReplaceVar("parentClass", this.parentClassName);
        if (this.classInfo?.isAbstract) {
            this.writeFileReplaceVar("definition", "")
        }
        else {
            this.writeFileReplaceVar("definition", "window.customElements.define('" + this.tagName + "', " + this.className + ");")
        }
    }
    private writeFileTemplateHtml() {
        let body = this.jQuery('body').html()?.replace('&#xFEFF;', '');
        if (!body) {
            body = "";
        }
        let removeBody = body;
        this.writeFileReplaceVar("template", body);

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
        this.writeFileReplaceVar("slotHTML", slots.join(","));
        this.writeFileReplaceVar("blockHTML", blocks.join(","));

        let overrideViewFct = "";
        if (!this.classInfo?.overrideView.enable) {
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
        this.writeFileReplaceVar("overrideView", overrideViewFct);
    }
    private writeFileConstructor() {
        if (this.classInfo) {
            let constructorBody = this.classInfo.constructorBody;
            if (constructorBody.length > 0) {
                let transformedBody = "function(){" + constructorBody.replace(/super\(\);?/g, '') + "}";
                constructorBody = `__endConstructor() { super.__endConstructor(); ${this.transpileMethod(transformedBody, [])} }`
            }
            this.writeFileReplaceVar("constructor", constructorBody);

            let abstractConstrustor = '';
            if (this.classInfo.isAbstract) {
                abstractConstrustor = 'constructor() { super(); if (this.constructor == ' + this.className + ') { throw "can\'t instanciate an abstract class"; } }';
            }
            this.writeFileReplaceVar("isAbstract", abstractConstrustor);

        }
    }
    private writeFileTranslations() {
        var applyTranslations = "";
        var allTranslations = "";
        let allLangs: string[] = [];
        // TODO improve this system to use aventus file instead of json file
        if (existsSync(this.file.folderPath + '/_lang')) {
            var translationsKey: string[] = [];
            readdirSync(this.file.folderPath + '/_lang').forEach(file => {
                if (file.indexOf('.json') !== -1) {
                    var lang = file.replace('.json', '');
                    allLangs.push(lang);

                    var translations = JSON.parse(readFileSync(this.file.folderPath + '/_lang/' + file, 'utf8'));

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

            Object.entries(this.actionByComponent).forEach(([key, uses]) => {
                if (!key.startsWith("lang.")) {
                    return;
                }

                key = key.replace("lang.", "");

                if (translationsKey.indexOf(key) !== -1) {
                    uses.forEach(use => {
                        use.value = use.value.trim().replace(/"/g, '\\"');
                        use.value = '"' + use.value + '"';

                        var matches = use.value.match(/\{\{(.*?)\}\}/g);
                        if (matches) {
                            for (var j = 0; j < matches.length; j++) {
                                var variableName = matches[j].replace(/\{\{|\}\}/g, '');
                                use.value = use.value.replace(matches[j], '"+this.getTranslation("' + variableName + '")+"');
                            }
                        }

                        applyTranslations += '\tthis._components["' + use.componentId + '"].innerHTML = ' + use.value + ';' + EOL;
                    });
                }
                delete this.actionByComponent[key]
            });
        }
        let allLangTxt = '';
        if (allLangs.length > 0) {
            allLangTxt = `__getLangTranslations() { return [${allLangs.join(",")}].concat(super.__getLangTranslations()).filter((v, i, a) => a.indexOf(v) === i); }`;
        }
        this.writeFileReplaceVar("allLangs", allLangTxt);

        if (allTranslations.length > 0) {
            allTranslations = `__setTranslations() { super.__setTranslations(); ${allTranslations} }`
        }
        this.writeFileReplaceVar("translations", allTranslations);

        if (applyTranslations.length > 0) {
            applyTranslations = `__applyTranslations() { super.__applyTranslations(); ${applyTranslations} }`
        }
        this.writeFileReplaceVar("applyTranslations", applyTranslations);
    }

    //#region field
    private writeFileFields() {
        let varNameToCheck = Object.keys(this.variablesIdInView);
        const removeVarNameToCheck = (field: CustomFieldModel) => {
            let index = varNameToCheck.indexOf(field.name);
            if (index != -1) {
                varNameToCheck.splice(index, 1);
            }
        }
        let simpleVariables: CustomFieldModel[] = [];
        let attributes: CustomFieldModel[] = [];
        let properties: { field: CustomFieldModel, args: any[] }[] = [];
        let watches: { field: CustomFieldModel, args: any[] }[] = [];
        let views: CustomFieldModel[] = [];
        for (let fieldName in this.allFields) {
            let field = this.allFields[fieldName];

            if (field.inParent && !this.classInfo?.overrideView.enable) {
                removeVarNameToCheck(field);
                continue;
            }
            if (field.propType == "State") {
                // only one by file
                this.writeFileFieldsStates(field);
                continue;
            }
            else if (field.propType == "Attribute") {
                attributes.push(field);
                continue;
            }
            else if (field.propType == "Property") {
                for (let decorator of field.decorators) {
                    if (decorator.name == "Property") {
                        properties.push({
                            field: field,
                            args: decorator.arguments
                        })
                    }
                }
                continue;
            }
            else if (field.propType == "Watch") {
                removeVarNameToCheck(field);
                for (let decorator of field.decorators) {
                    if (decorator.name == "Watch") {
                        watches.push({
                            field: field,
                            args: decorator.arguments
                        })
                    }
                }
            }
            else if (field.propType == "ViewElement") {
                removeVarNameToCheck(field);
                views.push(field);
            }
            else if (field.propType == "Simple") {
                removeVarNameToCheck(field);
                simpleVariables.push(field);
            }
        }

        this.writeFileFieldsSimpleVariable(simpleVariables);
        this.writeFileFieldsAttribute(attributes);
        this.writeFileFieldsProperty(properties);
        this.writeFileFieldsWatch(watches);
        this.writeFileFieldsView(views);

        // to prevent $states$ if no states are used
        this.writeFileReplaceVar("states", '')


        this.writeFileUpdateTemplate();
        let listBoolTxt = "";
        if (this.listBoolProperties.length > 0) {
            listBoolTxt = `__listBoolProps() { return [${this.listBoolProperties.join(",")}].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }`;
        }
        this.writeFileReplaceVar("listBool", listBoolTxt);

        for (let missingVar of varNameToCheck) {
            this.createMissingViewVar(missingVar);
            this.result.diagnostics.push(createErrorTsSection(this.document, "missing variable " + missingVar, "variables"));
        }

    }
    private createMissingViewVar(missingVar: string) {
        if (this.result.missingViewElements.position == -1) {
            let startPos = getSectionStart(this.file, "variables");
            this.result.missingViewElements.position = startPos;
        }
        if (this.result.missingViewElements.position != -1) {
            if (this.variablesIdInView[missingVar]) {
                let type = this.variablesIdInView[missingVar].type;
                let finalType = "";
                if (type == "div") { finalType = "HTMLDivElement"; }
                else if (type == "div") { finalType = "HTMLSpanElement"; }
                else if (type.indexOf('-') != -1) {
                    let splitted = type.split('-');
                    for (let split of splitted) {
                        finalType += split.slice(0, 1).toUpperCase() + split.slice(1, split.length)
                    }
                }
                else {
                    finalType = "HTMLElement";
                }
                this.result.missingViewElements.elements[missingVar] = finalType;
            }
        }
    }
    private getFieldConstraintValue(field: CustomFieldModel) {
        let value = "undefined";
        if (field.valueConstraint && field.valueConstraint.hasOwnProperty("value")) {
            if (field.valueConstraint.isCallConstraint) {
                value = field.valueConstraint.value.name + `(${field.valueConstraint.value.arguments.join(", ")})`
            }
            else if (field.type) {
                if (field.type.typeName.toLowerCase() === TYPES.string) {
                    value = `"${field.valueConstraint.value}"`;
                } else if (field.type.typeName.toLowerCase() === TYPES.date) {
                    value = `luxon.DateTime.fromJSDate(${field.valueConstraint.value})`;
                } else if (TYPES[field.type.typeName.toLowerCase()]) {
                    value = field.valueConstraint.value
                } else if (field.valueConstraint.value.startsWith && field.valueConstraint.value.startsWith("new ")) {
                    value = field.valueConstraint.value;
                } else if (field.valueConstraint.value instanceof Object) {
                    // TODO write a proper JSON manually
                    value = JSON.stringify(field.valueConstraint.value);
                } else {
                    value = JSON.stringify(field.valueConstraint.value);
                }
            }
            else {
                value = JSON.stringify(field.valueConstraint.value);
            }
        }
        else if (field.type) {
            if (field.type.typeName.toLowerCase() === TYPES.string) {
                value = `""`;
            } else if (field.type.typeName.toLowerCase() === TYPES.boolean) {
                value = "false";
            } else if (field.type.typeName.toLowerCase() === TYPES.number) {
                value = "0";
            }
        }
        if (value == '"undefined"') { value = "undefined" }
        return value;
    }
    private writeFileFieldsSimpleVariable(fields: CustomFieldModel[]) {
        let variablesStatic = "";
        let variablesSimple = "";
        for (let field of fields) {
            if (this.variablesIdInView.hasOwnProperty(field.name)) {
                this.result.diagnostics.push(createErrorTsPos(this.document, "Please add @ViewElement for " + field.name, field.start, field.end));
                return;
            }
            let value = this.getFieldConstraintValue(field);
            if (field.isStatic) {
                variablesStatic += `static ${field.name} = ${value};` + EOL;
            }
            else {
                variablesSimple += `if(this.${field.name} === undefined) {this.${field.name} = ${value};}` + EOL;
            }
        }
        this.writeFileReplaceVar('variablesStatic', variablesStatic);
        if (variablesSimple.length > 0) {
            variablesSimple = `__prepareVariables() { super.__prepareVariables(); ${variablesSimple} }`
        }
        this.writeFileReplaceVar('variables', variablesSimple);
    }
    private writeFileFieldsStates(field: CustomFieldModel) {
        if (field.valueConstraint) {
            let states = field.valueConstraint.value;
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
                        activeFct = this.transpileMethod(states[key].active.toString(), ["state"]);
                        activeFct = activeFct.replace(/this/g, "that2");
                    }
                    var inactiveFct = "";
                    if (states[key].inactive) {
                        inactiveFct = this.transpileMethod(states[key].inactive.toString(), ["currentState", "nextState"]);
                        inactiveFct = inactiveFct.replace(/this/g, "that2");
                    }
                    var askChange = "true;";
                    if (states[key].askChange) {
                        askChange = this.transpileMethod(states[key].askChange.toString(), ["currentState", "nextState"]);
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

            let statesTxt = defineStateName + slugGenerator + EOL + fctStateTxt;
            if (statesTxt.length > 0) {
                statesTxt = `__createStates() { super.__createStates(); let that2 = this; ${statesTxt} }`
            }
            this.writeFileReplaceVar("states", statesTxt)
        }
    }
    private writeFileFieldsAttribute(fields: CustomFieldModel[]) {
        let defaultValue = "";
        let getterSetter = "";
        for (let field of fields) {
            if (!field.type) {
                return;
            }

            let formattedType = this.getTypeForAttribute(this.document, field);

            for (let diag of formattedType.diagnostics) {
                this.result.diagnostics.push(diag);
            }
            if (formattedType.diagnostics.length > 0) {
                return;
            }


            if (field.name.toLowerCase() != field.name) {
                this.result.diagnostics.push(createErrorTsPos(this.document, "an attribute must be in lower case", field.start, field.end));
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
                    this.listBoolProperties.push('"' + key + '"');
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
            if (this.htmlDoc) {
                this.htmlDoc[this.tagName].attributes[field.name] = {
                    name: field.name,
                    description: field.documentation.join(EOL),
                    type: formattedType.realType,
                    values: formattedType.definedValues
                }
            }
        }

        if (defaultValue.length > 0) {
            defaultValue = `__defaultValue() { super.__defaultValue(); ${defaultValue} }`
        }
        this.writeFileReplaceVar("defaultValueAttr", defaultValue);
        this.writeFileReplaceVar("getterSetterAttr", getterSetter);
    }
    private writeFileFieldsProperty(properties: { field: CustomFieldModel, args: any[] }[]) {
        let defaultValue = "";
        let getterSetter = "";
        let upgradeAttributes = "";
        let variablesWatched: string[] = [];
        for (let property of properties) {
            let field = property.field;
            let args = property.args;
            if (!field.type) {
                return;
            }

            let formattedType = this.getTypeForAttribute(this.document, field);

            for (let diag of formattedType.diagnostics) {
                this.result.diagnostics.push(diag);
            }
            if (formattedType.diagnostics.length > 0) {
                return;
            }

            if (field.name.toLowerCase() != field.name) {
                this.result.diagnostics.push(createErrorTsPos(this.document, "a property must be in lower case", field.start, field.end));
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
                    this.listBoolProperties.push('"' + key + '"');
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
            this.propertiesChanged[field.name] = '';



            if (args.length > 0) {
                this.propertiesChanged[field.name] += this.transpileMethod(args[0], ["this"]) + ';' + EOL;
            }

            // html DOC
            if (this.htmlDoc) {
                this.htmlDoc[this.tagName].attributes[field.name] = {
                    name: field.name,
                    description: field.documentation.join(EOL),
                    type: formattedType.realType,
                    values: formattedType.definedValues
                }
            }
        }

        if (defaultValue.length > 0) {
            defaultValue = `__defaultValue() { super.__defaultValue(); ${defaultValue} }`
        }
        this.writeFileReplaceVar("defaultValueProp", defaultValue);
        this.writeFileReplaceVar("getterSetterProp", getterSetter);

        if (upgradeAttributes.length > 0) {
            upgradeAttributes = `__upgradeAttributes() { super.__upgradeAttributes(); ${upgradeAttributes} }`
        }
        this.writeFileReplaceVar("upgradeAttributes", upgradeAttributes);

        let variablesWatchedTxt = '';
        if (variablesWatched.length > 0) {
            variablesWatchedTxt = '"' + variablesWatched.join('", "') + '"';
            variablesWatchedTxt = `static get observedAttributes() {return [${variablesWatchedTxt}].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}`
        }
        this.writeFileReplaceVar("watchingAttributes", variablesWatchedTxt);
    }
    private writeFileFieldsWatch(watches: { field: CustomFieldModel, args: any[] }[]) {
        let getterSetter = "";
        let variableProxyInit = "";
        let variableProxyTxt = "";
        for (let watch of watches) {
            let field = watch.field;
            let args = watch.args;
            let value = this.getFieldConstraintValue(field);
            if (value == "undefined") {
                this.result.diagnostics.push(createErrorTsPos(this.document, "A watchable prop must be initialized", field.start, field.end));
            }
            let watchAction = `this.__watchActions["${field.name}"] = []`;
            let txtWatchFct = "";
            if (args.length > 0) {
                txtWatchFct = this.transpileMethodNoRun(args[0]);
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

            variableProxyTxt += `${watchAction}` + EOL;
            variableProxyInit += `this["${field.name}"] = ${value};`;
            this.foundedWatch.push(field.name);
        }

        let debugWatchTxt = '';
        if (this.classInfo?.debuggerOption.enableWatchHistory) {
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
        this.writeFileReplaceVar("watches", variableProxyTxt);
        this.writeFileReplaceVar("getterSetterWatch", getterSetter);
    }
    private writeFileFieldsView(fields: CustomFieldModel[]) {
        let variablesInViewDynamic = "";
        let variablesInViewStatic = "";
        for (let field of fields) {
            if (!this.variablesIdInView.hasOwnProperty(field.name)) {
                if (this.classInfo?.overrideView.enable) {
                    if (this.classInfo.overrideView.removeViewVariables.indexOf(field.name) == -1) {
                        this.result.diagnostics.push(createErrorTsPos(this.document, "Can't find the variable " + field.name + " inside the view", field.start, field.end));
                    }
                }
                else {
                    this.result.diagnostics.push(createErrorTsPos(this.document, "Can't find the variable " + field.name + " inside the view", field.start, field.end));
                }
            }
            else {
                let id = this.variablesIdInView[field.name].id;
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
                        this.result.diagnostics.push(createErrorTsPos(this.document, "You must add the decorator ViewElement", field.start, field.end));
                    }
                }
            }
        }

        this.writeFileReplaceVar("variablesInViewDynamic", variablesInViewDynamic);
        if (variablesInViewStatic.length > 0) {
            variablesInViewStatic = `__mapSelectedElement() { super.__mapSelectedElement(); ${variablesInViewStatic}}`;
        }
        this.writeFileReplaceVar("variablesInViewStatic", variablesInViewStatic);
    }
    private writeFileUpdateTemplate() {
        let propertiesChangedTxt = "";
        for (let fieldName in this.actionByComponent) {
            let stringToAdd = "";
            for (var i = 0; i < this.actionByComponent[fieldName].length; i++) {
                var current = this.actionByComponent[fieldName][i];
                current.value = current.value.trim().replace(/"/g, '\\"');
                // create value
                var matches = current.value.match(/\{\{(.*?)\}\}/g);
                current.value = '"' + current.value + '"';
                let check: string[] = [];
                if (matches) {
                    for (var j = 0; j < matches.length; j++) {
                        var variableName = matches[j].replace(/\{\{|\}\}/g, '');
                        check.push(`"${variableName}".startsWith(path)`)

                        if (this.allFields[variableName]) {
                            let type = this.allFields[variableName].type?.typeName.toLowerCase();

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
                }
                let componentId = "'" + current.componentId + "'";
                if (current.hasOwnProperty('prop')) {
                    //prop
                    let prop = current.prop as string;
                    let propType =  this.allFields[fieldName]?.type?.typeName.toLowerCase() || '';
                    if (propType == TYPES.boolean) {
                        stringToAdd += `if(${check.join("||")}){
                            for(var i = 0;i<this._components[${componentId}].length;i++){
                                if (this.${prop.toLowerCase()}) { 
                                    this._components[${componentId}][i].setAttribute("${prop.toLowerCase()}", "true"); 
                                } 
                                else { 
                                    this._components[${componentId}][i].removeAttribute("${prop.toLowerCase()}"); 
                                }
                            }
                        }`;
                    }
                    else {
                        stringToAdd += `if(${check.join("||")}){
                            for(var i = 0;i<this._components[${componentId}].length;i++){
                                this._components[${componentId}][i].setAttribute("${prop.toLowerCase()}", ${current.value});
                            }
                        }`;
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
            if (this.propertiesChanged[fieldName]) {
                this.propertiesChanged[fieldName] += stringToAdd;
            } else {
                this.propertiesChanged[fieldName] = stringToAdd;
            }
        }

        let keyInit: string[] = [];
        for (var key in this.propertiesChanged) {
            if (this.propertiesChanged[key] !== "") {
                let realKey = key.split(".")[0];
                if (this.allFields[realKey]) {
                    if (!this.allFields[realKey].inParent || this.classInfo?.overrideView) {
                        if (keyInit.indexOf(realKey) == -1) {
                            keyInit.push(realKey);
                            propertiesChangedTxt += `this.__onChangeFct['${realKey}'] = []` + EOL;
                        }
                    } else {
                        propertiesChangedTxt += `if (!this.__onChangeFct['${realKey}']) {\r\nthis.__onChangeFct['${realKey}'] = []${EOL}}` + EOL;
                    }
                    propertiesChangedTxt += `this.__onChangeFct['${realKey}'].push((path) => {${this.propertiesChanged[key]}})` + EOL;
                }
                else {

                    this.result.diagnostics.push(createErrorTsSection(this.document, realKey + ' can\'t be found', 'props'));
                }
            }
        }
        if (propertiesChangedTxt.length > 0) {
            propertiesChangedTxt = `__registerOnChange() { super.__registerOnChange(); ${propertiesChangedTxt} }`
        }
        this.writeFileReplaceVar("registerOnChange", propertiesChangedTxt)
    }
    //#endregion

    private writeFileMethods() {
        let methodsTxt = "";
        if (this.classInfo) {
            for (let method of this.classInfo.methods) {
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
                        let methodTxt = transpile(match[1], AventusTsLanguageService.getCompilerOptionsCompile()).trim();
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
        }
        this.writeFileReplaceVar("methods", methodsTxt);
    }
    private writeFileEvents() {
        let eventsMapped = "";
        for (var i = 0; i < this.eventsPerso.length; i++) {
            var current = this.eventsPerso[i];
            let componentId = "'" + current.componentId + "'";
            eventsMapped += `if (ids == null || ids.indexOf(${componentId}) != -1) {
                    if (this._components[${componentId}]) {
                        for (var i = 0; i < this._components[${componentId}].length; i++) {
                            this._components[${componentId}][i].addEventListener('${current.event}', (e) => { this.${current.value}(e) })
                        }
                    }
                }`
        }
        for (let key in this.pressEvents) {
            let current = this.pressEvents[key];
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
                new Aventus.PressManager({
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
        this.writeFileReplaceVar("eventsMapped", eventsMapped)
    }
    private writeFileLoop() {
        const isIndex = (key, item) => {
            if (key == "") {
                return false;
            }
            if (item.__indexName == key) {
                return true;
            }
            for (let dependance of item.__dependances) {
                if (this.loop[dependance].__indexName == key) {
                    return true;
                }
            }
            return false;
        }
        let loopTxt = "";
        for (var key in this.loop) {
            let item = this.loop[key];
            let firstInNamePart = item.__inName.split(".")[0];
            if (this.foundedWatch.indexOf(firstInNamePart) == -1) {
                let found = false;
                for (let dependance of item.__dependances) {
                    if (this.loop[dependance].__itemName == firstInNamePart) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.result.diagnostics.push(createErrorTs(this.document, 'variable ' + firstInNamePart + ' inside in of for loop must be watchable'));
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

                    let isIndexItem = false;
                    let variablesWatcher: string[] = [];
                    let variables: { name: string, getValue: string }[] = [];
                    if (matches) {
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

        this.writeFileReplaceVar("loop", loopTxt);
    }
    //#endregion

    //#region prepare doc


    private prepareDocSCSS() {
        let customCssProperties: SCSSDoc = {
            [this.tagName]: AventusSCSSLanguageService.getCustomProperty(this.scssTxt)
        }
        return customCssProperties;
    }
    //#endregion

    //#region tools
    private prepareMethodToTranspile(methodTxt: string): string {
        methodTxt = methodTxt.trim();
        if (methodTxt.startsWith("function")) {
            methodTxt = methodTxt.replace("function", "");
            methodTxt = methodTxt.trim();
        }
        if (!methodTxt.match(/^\(.*?\)( *?)=>/g) && !methodTxt.match(/^\S*?( *?)=>/g)) {
            methodTxt = methodTxt.replace(/^.*?\(/g, "(");
            let match = methodTxt.match(/^\(.*?\)/g);
            if (match) {
                methodTxt = methodTxt.replace(match[0], match[0] + " => ");
            }
        }
        return methodTxt;
    }
    private transpileMethod(methodTxt, paramsName: any[] = []) {
        methodTxt = this.prepareMethodToTranspile(methodTxt);
        let method = transpile(methodTxt, AventusTsLanguageService.getCompilerOptionsCompile()).trim();
        method = method.substring(0, method.length - 1);
        method = "(" + method + ")(" + paramsName.join(",") + ")";
        // method = minify(method, { mangle: false }).code;
        return method;
    }
    private transpileMethodNoRun(methodTxt) {
        methodTxt = this.prepareMethodToTranspile(methodTxt);
        let method = transpile(methodTxt, AventusTsLanguageService.getCompilerOptionsCompile()).trim();
        method = method.substring(0, method.length - 1);
        method = "(" + method + ")";
        // method = minify(method, { mangle: false }).code;
        return method;
    }
    private getTypeForAttribute(currentDoc: TextDocument, field: FieldModel) {
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
                    if (aliasNode && aliasNode.type) {
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
    private removeWhiteSpaceLines(txt: string) {
        return txt.replace(/^(?:[\t ]*(?:\r?\n|\r))+/gm, '');
    }
    //#endregion
}

