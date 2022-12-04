import { getLanguageService, IAttributeData, ITagData, IValueData, LanguageService } from "vscode-html-languageservice";
import { CompletionItemKind, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Location, Position, Range, TextEdit } from "vscode-languageserver";
import { AventusLanguageId } from "../../definition";
import { AventusFile } from '../../files/AventusFile';
import { Build } from "../../project/Build";
import { CustomTypeAttribute } from "../ts/component/compiler/def";
import { AventusWebComponentLogicalFile } from '../ts/component/File';
import { AventusDefinitionHTMLFile } from "../ts/definition/File";
import { AventusHTMLFile } from './File';
import { HTMLDoc } from "./helper/definition";


export class AventusHTMLLanguageService {
    private languageService: LanguageService;
    private build: Build;
    private id: number = 0;
    private isAutoComplete: boolean = false;

    private customTagsData: ITagData[] = [];
    private documentationInfo: HTMLDoc = {};
    private documentationInfoDef: { [key: string]: AventusDefinitionHTMLFile } = {};
    private internalDocumentation: { [key: string]: HTMLDoc } = {};
    private internalDocumentationReverse: { [className: string]: AventusWebComponentLogicalFile } = {};

    public constructor(build: Build) {
        this.build = build;
        this.languageService = this.getHTMLLanguageService();
    }

    public getInternalDocumentation(): HTMLDoc {
        let result: HTMLDoc = {};
        for (let uri in this.internalDocumentation) {
            try {
                result = {
                    ...result,
                    ...this.internalDocumentation[uri]
                }
            }
            catch (e) { }
        }
        return result;
    }

    //#region init language service
    public getHTMLLanguageService(): LanguageService {
        return getLanguageService({
            useDefaultDataProvider: true,
            customDataProviders: [
                {
                    getId: this.getId.bind(this),
                    isApplicable(languageId) {
                        return languageId == AventusLanguageId.HTML;
                    },
                    provideTags: this.provideTags.bind(this),
                    provideAttributes: this.provideAttributes.bind(this),
                    provideValues: this.provideValues.bind(this)
                }
            ]
        });
    }
    public getId(): string {
        return this.id + "";
    }
    public provideTags(): ITagData[] {
        return this.customTagsData;
    }
    public provideAttributes(tag: string): IAttributeData[] {
        let result: IAttributeData[] = [];
        if (this.documentationInfo[tag]) {
            let attrs = this.documentationInfo[tag].attributes;
            for (let attrName in attrs) {
                let current = attrs[attrName];
                if (this.isAutoComplete) {
                    result.push({
                        name: "!!" + current.name,
                        description: JSON.stringify({
                            description: current.description,
                            type: current.type,
                        })
                    })
                }
                else {
                    result.push({
                        name: current.name,
                        description: current.description
                    })
                }
            }
        }
        return result;
    }
    public provideValues(tag: string, attribute: string): IValueData[] {
        if (this.documentationInfo[tag] && this.documentationInfo[tag].attributes[attribute]) {
            return this.documentationInfo[tag].attributes[attribute].values;
        }
        return [];
    }

    //#endregion

    //#region language service function
    public async doValidation(file: AventusFile): Promise<Diagnostic[]> {
        return [];
    }
    public async doComplete(file: AventusFile, position: Position): Promise<CompletionList> {
        let docHTML = this.languageService.parseHTMLDocument(file.document);
        if (docHTML) {
            this.isAutoComplete = true;
            let result = this.languageService.doComplete(file.document, position, docHTML);
            this.isAutoComplete = false;
            for (let temp of result.items) {
                if (temp.label.startsWith("!!")) {
                    temp.kind = CompletionItemKind.Snippet;
                    if (temp.textEdit) {
                        let newLabel = temp.label.replace("!!", "");
                        temp.textEdit.newText = temp.textEdit.newText.replace(temp.label, newLabel)
                        if (temp.documentation) {
                            let customInfo: {
                                description: string,
                                type: CustomTypeAttribute
                            } = JSON.parse(temp.documentation["value"]);

                            if (customInfo.description == "") {
                                delete temp.documentation;
                            }

                            if (customInfo.type == 'boolean') {
                                temp.textEdit.newText = temp.textEdit.newText.split("=")[0];
                            }
                        }
                        temp.label = newLabel;
                    }
                }
                if (temp.kind == CompletionItemKind.Property && temp.textEdit) {
                    if (!temp.textEdit.newText.endsWith(">")) {
                        temp.textEdit.newText += "></" + temp.textEdit.newText + ">";
                    }
                }
            }
            return result;
        }
        return { isIncomplete: false, items: [] };
    }
    public async doHover(file: AventusFile, position: Position): Promise<Hover | null> {
        let docHTML = this.languageService.parseHTMLDocument(file.document);
        if (docHTML) {
            return this.languageService.doHover(file.document, position, docHTML)
        }
        return null;
    }
    public async format(file: AventusFile, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
        return this.languageService.format(file.document, range, formatParams);
    }
    public async onDefinition(file: AventusHTMLFile, position: Position): Promise<Definition | null> {
        let offset = file.file.document.offsetAt(position);
        let node = this.languageService.parseHTMLDocument(file.file.document).findNodeAt(offset);
        if (node.tag) {
            let info = this.documentationInfo[node.tag];
            if (info) {
                // search local
                let internalInfo = this.internalDocumentationReverse[info.class];
                if (internalInfo) {
                    let startPos = internalInfo.file.document.positionAt(0);
                    let endPos = internalInfo.file.document.positionAt(0);
                    return Location.create(internalInfo.file.uri, Range.create(startPos, endPos));
                }
                // search inside def
                let defintionInfo = file.build.getWebComponentDefinition(info.class);
                if (defintionInfo) {
                    let defintionFile = file.build.getWebComponentDefinitionFile(info.class);
                    if (defintionFile) {
                        let startPos = defintionFile.file.document.positionAt(defintionInfo.nameStart);
                        let endPos = defintionFile.file.document.positionAt(defintionInfo.nameEnd);
                        return Location.create(defintionFile.file.uri, Range.create(startPos, endPos));
                    }

                }
            }
        }
        return null;
    }
    //#endregion

    //#region custom definition
    public rebuildDefinition() {
        this.documentationInfo = {};
        for (let uri in this.documentationInfoDef) {
            let content = this.documentationInfoDef[uri].file.content;
            if (content != "") {
                try {
                    let doc: HTMLDoc = JSON.parse(content);
                    this.documentationInfo = {
                        ...this.documentationInfo,
                        ...doc
                    }
                }
                catch (e) { }
            }
        }
        for (let uri in this.internalDocumentation) {
            let doc = this.internalDocumentation[uri];
            try {
                this.documentationInfo = {
                    ...this.documentationInfo,
                    ...doc
                }
            }
            catch (e) { }
        }

        this.customTagsData = [{
            name: 'block',
            attributes: [{
                name: "name"
            }]
        }];
        let nameDone: string[] = [];
        for (let key in this.documentationInfo) {
            let current = this.documentationInfo[key];
            if (nameDone.indexOf(current.name) == -1) {
                nameDone.push(current.name);
                let attrs: IAttributeData[] = []
                let temp: ITagData = {
                    name: current.name,
                    description: current.description,
                    attributes: attrs
                }
                for (let attrName in current.attributes) {
                    let currentAttr = current.attributes[attrName];
                    attrs.push({
                        name: currentAttr.name,
                        description: currentAttr.description,
                        values: currentAttr.values
                    })
                }
                this.customTagsData.push(temp);
            }
        }
    }
    public addDefinition(defFile: AventusDefinitionHTMLFile): void {
        this.documentationInfoDef[defFile.file.uri] = defFile;
        this.rebuildDefinition();
    }
    public removeDefinition(defFile: AventusDefinitionHTMLFile): void {
        delete this.documentationInfoDef[defFile.file.uri];
        this.rebuildDefinition();
    }
    public addInternalDefinition(uri: string, doc: HTMLDoc, fromFile: AventusWebComponentLogicalFile) {
        this.internalDocumentation[uri] = doc;
        for (let tagName in doc) {
            this.internalDocumentationReverse[doc[tagName].class] = fromFile;
        }
        this.rebuildDefinition();
    }
    public removeInternalDefinition(uri: string) {
        let oldDoc = this.internalDocumentation[uri];
        if (oldDoc) {
            for (let tagName in oldDoc) {
                delete this.internalDocumentationReverse[oldDoc[tagName].class];
            }
        }
        delete this.internalDocumentation[uri];
        this.rebuildDefinition();
    }
    //#endregion
}