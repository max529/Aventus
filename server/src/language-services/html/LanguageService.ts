import { getLanguageService, IAttributeData, ITagData, IValueData, LanguageService } from "vscode-html-languageservice";
import { CompletionItemKind, CompletionList, Diagnostic, FormattingOptions, Hover, Position, Range, TextEdit } from "vscode-languageserver";
import { AventusLanguageId } from "../../definition";
import { AventusFile } from '../../files/AventusFile';
import { Build } from "../../project/Build";
import { CustomTypeAttribute } from "../ts/component/compiler/def";
import { AventusDefinitionHTMLFile } from "../ts/definition/File";
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
    //#endregion

    //#region custom definition
    private rebuildDefinition() {
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

        this.customTagsData = [];
        for (let key in this.documentationInfo) {
            let current = this.documentationInfo[key];
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
    public addDefinition(defFile: AventusDefinitionHTMLFile): void {
        this.documentationInfoDef[defFile.file.uri] = defFile;
        this.rebuildDefinition();
    }
    public removeDefinition(defFile: AventusDefinitionHTMLFile): void {
        delete this.documentationInfoDef[defFile.file.uri];
        this.rebuildDefinition();
    }
    public addInternalDefinition(uri: string, doc: HTMLDoc) {
        this.internalDocumentation[uri] = doc;
        this.rebuildDefinition();
    }
    public removeInternalDefinition(uri: string) {
        delete this.internalDocumentation[uri];
        this.rebuildDefinition();
    }
    //#endregion
}