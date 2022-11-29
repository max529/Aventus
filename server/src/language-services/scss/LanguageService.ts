import postcss from 'postcss';
import * as postcssSorting from 'postcss-sorting';
import * as postcssScss from 'postcss-scss';
import { CSSFormatConfiguration, getSCSSLanguageService, LanguageService } from "vscode-css-languageservice";
import { CodeAction, CodeActionContext, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Location, Position, Range, TextEdit } from "vscode-languageserver";
import { Build } from '../../project/Build';
import { getNodePath, SCSSDoc, Node, NodeType, CustomCssProperty } from './helper/CSSNode';
import { AventusDefinitionSCSSFile } from '../ts/definition/File';
import { TextDocument } from "vscode-languageserver-textdocument";
import { AventusFile } from '../../files/AventusFile';



export class AventusSCSSLanguageService {
    private languageService: LanguageService;
    private build: Build;
    private documentationInfo: SCSSDoc = {};
    private documentationInfoDef: { [key: string]: AventusDefinitionSCSSFile } = {};
    private internalDocumentation: { [uri: string]: SCSSDoc } = {};

    public getInternalDocumentation(): SCSSDoc {
        let result: SCSSDoc = {};
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

    public constructor(build: Build) {
        this.build = build;
        this.languageService = getSCSSLanguageService();
    }

    public async doValidation(file: AventusFile): Promise<Diagnostic[]> {
        let diagnostics: Diagnostic[] = [];
        diagnostics = this.languageService.doValidation(file.document, this.languageService.parseStylesheet(file.document));
        // care css-lcurlyexpected  => be sure to have utf-8 encoding
        for (let i = 0; i < diagnostics.length; i++) {
            if (diagnostics[i].code == "emptyRules") {
                diagnostics.splice(i, 1);
                i--;
            }
        }
        return diagnostics;
    }
    public async doComplete(file: AventusFile, position: Position): Promise<CompletionList> {
        let founded: string[] = [];
        let result: CompletionList = { isIncomplete: false, items: [] };
        result = this.languageService.doComplete(file.document, position, this.languageService.parseStylesheet(file.document));
        let lastEl = this.getTree(file, position).reverse()[0];
        if (this.documentationInfo[lastEl]) {
            for (let child of this.documentationInfo[lastEl]) {
                if (founded.indexOf(child.name) == -1) {
                    founded.push(child.name);
                    result.items.push({
                        label: child.name,
                    })
                }
            }
        }
        return result;
    }

    public async doHover(file: AventusFile, position: Position): Promise<Hover | null> {
        return this.languageService.doHover(file.document, position, this.languageService.parseStylesheet(file.document));
    }

    public async findDefinition(file: AventusFile, position: Position): Promise<Definition | null> {
        return this.languageService.findDefinition(file.document, position, this.languageService.parseStylesheet(file.document))
    }
    async format(file: AventusFile, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
        let formatConfig: CSSFormatConfiguration = {
            ...formatParams,
            preserveNewLines: true,
            spaceAroundSelectorSeparator: true,
            insertFinalNewline: true,
            insertSpaces: false,
            tabSize: 4,
        }
        let document = file.document;
        let result = await this.languageService.format(document, range, formatConfig);
        if (result.length == 1) {
            let start = document.offsetAt(result[0].range.start)
            let end = document.offsetAt(result[0].range.end)
            let length = document.getText().length;
            if (start == 0 && end == length) {
                let orderResult = await postcss([postcssSorting({
                    order: [
                        'custom-properties',
                        'dollar-variables',
                        'declarations',
                        'at-rules',
                        'rules',
                    ],
                    'properties-order': 'alphabetical'
                })]).process(result[0].newText, {
                    parser: postcssScss,
                    from: './temp.scss',
                    to: './temp.scss'
                })
                result[0].newText = orderResult.css;
            }
        }
        return result;

    }
    async doCodeAction(file: AventusFile, range: Range): Promise<CodeAction[]> {
        let docSCSS = this.languageService.parseStylesheet(file.document)
        let codeActionContext = CodeActionContext.create(this.languageService.doValidation(file.document, docSCSS))
        return this.languageService.doCodeActions2(file.document, range, codeActionContext, docSCSS);
    }
    public async onReferences(file: AventusFile, position: Position): Promise<Location[]> {
        let docSCSS = this.languageService.parseStylesheet(file.document)
        return this.languageService.findReferences(file.document, position, docSCSS);
    }


    //#region custom definition
    private rebuildDefinition() {
        this.documentationInfo = {};
        for (let uri in this.documentationInfoDef) {
            let content = this.documentationInfoDef[uri].file.content;
            if (content != "") {
                try {
                    let doc: SCSSDoc = JSON.parse(content);
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
    }
    public addDefinition(defFile: AventusDefinitionSCSSFile): void {
        this.documentationInfoDef[defFile.file.uri] = defFile;
        this.rebuildDefinition();
    }
    public removeDefinition(defFile: AventusDefinitionSCSSFile): void {
        delete this.documentationInfoDef[defFile.file.uri];
        this.rebuildDefinition();
    }
    public addInternalDefinition(uri: string, doc: SCSSDoc) {
        this.internalDocumentation[uri] = doc;
        this.rebuildDefinition();
    }
    public removeInternalDefinition(uri: string) {
        delete this.internalDocumentation[uri];
        this.rebuildDefinition();
    }
    //#endregion

    private getTree(file: AventusFile, position: Position): string[] {
        let result: string[] = [];
        if (this.languageService) {
            let doc = this.languageService.parseStylesheet(file.document);
            let offset = file.document.offsetAt(position);
            let path = getNodePath(doc as Node, offset);
            for (let node of path) {
                if (node.type == NodeType.Ruleset) {
                    let nodeDef = node.getChild(0);
                    if (nodeDef) {
                        let ruleName = nodeDef.getText();
                        result.push(ruleName);
                    }
                }
            }
        }
        return result;
    }

    public static getCustomProperty(srcCode: string): CustomCssProperty[] {
        let document = TextDocument.create("temp.scss", "scss", 1, srcCode);
        let result: CustomCssProperty[] = [];
        const _loadCustomProperty = (node: Node) => {
            if (node.type == NodeType.CustomPropertyDeclaration) {
                let nodeParent: Node | null = node;
                while (nodeParent && nodeParent["selectors"] == undefined) {
                    nodeParent = nodeParent.parent;
                }
                if (nodeParent) {
                    let selectorText = nodeParent["selectors"].getText();
                    if (selectorText == ":host") {
                        let propertyNode = node.getChild(0);
                        let expressionNode = node.getChild(1);
                        if (propertyNode && expressionNode) {
                            if (propertyNode.getText().startsWith("--internal")) {
                                let externalName = propertyNode.getText().replace("--internal-", "--");
                                if (expressionNode.getText().indexOf(externalName) != -1) {
                                    result.push({
                                        name: externalName
                                    })
                                }
                            }
                        }
                    }
                }
            }
            else if (node.hasChildren()) {
                for (let childNode of node.getChildren()) {
                    _loadCustomProperty(childNode);
                }
            }
        }

        let doc = getSCSSLanguageService().parseStylesheet(document);
        let path = getNodePath(doc as Node, 0);
        for (let pathTemp of path) {
            _loadCustomProperty(pathTemp);
        }
        return result;
    }
}




