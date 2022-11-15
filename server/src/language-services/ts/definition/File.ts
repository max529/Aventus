import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClientConnection } from '../../../Connection';
import { AventusExtension, AventusLanguageId } from "../../../definition";
import { AventusFile, InternalAventusFile } from "../../../FilesManager";
import { Build } from "../../../project/Build";
import { ClassModel } from "../../../ts-file-parser";
import { parseDocument } from "../../../ts-file-parser/src/tsStructureParser";
import { AventusBaseFile } from "../../BaseFile";
import { AventusTsFile } from "../File";

export class AventusDefinitionFile extends AventusTsFile {
    private tsDef: AventusDefinitionTsFile | undefined;
    private htmlDef: AventusDefinitionHTMLFile | undefined;
    private scssDef: AventusDefinitionSCSSFile | undefined;

    protected get extension(): string {
        return AventusExtension.Definition;
    }
    protected override mustBeAddedToLanguageService(): boolean {
        return false;
    }
    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        let resultBySection = this.separeSection();
        this.tsDef = resultBySection.tsDef;
        this.htmlDef = resultBySection.htmlDef;
        this.scssDef = resultBySection.scssDef;
        this.tsLanguageService.addFile(this.tsDef);
    }

    private separeSection(): {
        tsDef: AventusDefinitionTsFile,
        scssDef: AventusDefinitionSCSSFile,
        htmlDef: AventusDefinitionHTMLFile
    } {

        if (this.file.content.match(/\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g)) {


            let jsToImport = /\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g.exec(this.file.content);
            let jsTxt = "";
            if (jsToImport) {
                jsTxt = jsToImport[1];
            }
            let documentTs = TextDocument.create(this.file.uri, AventusLanguageId.TypeScript, 0, jsTxt);
            let tsDef = new AventusDefinitionTsFile(new InternalAventusFile(documentTs), this.build);

            let cssToImport = /\/\/ region css \/\/((\s|\S)*)\/\/ end region css \/\//g.exec(this.file.content);
            let cssTxt = "";
            if (cssToImport) {
                cssTxt = cssToImport[1];
            }
            let documentScss = TextDocument.create(this.file.uri, AventusLanguageId.SCSS, 0, cssTxt);
            let scssDef = new AventusDefinitionSCSSFile(new InternalAventusFile(documentScss), this.build);

            let htmlToImport = /\/\/ region html \/\/((\s|\S)*)\/\/ end region html \/\//g.exec(this.file.content);
            let htmlTxt = "";
            if (htmlToImport) {
                htmlTxt = htmlToImport[1];
            }
            let documentHtml = TextDocument.create(this.file.uri, AventusLanguageId.HTML, 0, htmlTxt);
            let htmlDef = new AventusDefinitionHTMLFile(new InternalAventusFile(documentHtml), this.build);
            return {
                tsDef,
                scssDef,
                htmlDef
            };
        }

        else {
            let documentTs = TextDocument.create(this.file.uri, AventusLanguageId.TypeScript, 0, this.file.content);
            let tsDef = new AventusDefinitionTsFile(new InternalAventusFile(documentTs), this.build);
            let documentScss = TextDocument.create(this.file.uri, AventusLanguageId.SCSS, 0, '');
            let scssDef = new AventusDefinitionSCSSFile(new InternalAventusFile(documentScss), this.build);
            let documentHtml = TextDocument.create(this.file.uri, AventusLanguageId.HTML, 0, '');
            let htmlDef = new AventusDefinitionHTMLFile(new InternalAventusFile(documentHtml), this.build);
            return {
                tsDef,
                scssDef,
                htmlDef
            };
        }

    }

    protected async onContentChange(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onSave() {

    }
    protected override async onDelete(): Promise<void> {
        super.onDelete();
        if (this.file.path.replace(AventusExtension.Definition, ".js") != this.build.getOutputPath()) {
            this.tsLanguageService.removeFile(this);
        }
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] };
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return null;
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return null;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return [];
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }

}

export class AventusDefinitionTsFile extends AventusTsFile {
    private _classInfoByName: { [name: string]: ClassModel } = {};
    protected get extension(): string {
        return AventusExtension.Definition;
    }
    protected override mustBeAddedToLanguageService(): boolean {
        return false;
    }
    public get classInfoByName() {
        return this._classInfoByName;
    }
    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.loadDefinitionInsideBuild();
        this.build.tsDefFiles[this.file.uri] = this;
        this.build.rebuildDefinitionWebComponent();
    }

    private loadDefinitionInsideBuild() {
        try {
            let structJs = parseDocument(this.file.document);
            structJs.classes.forEach(classInfo => {
                // Check if classInfo implements DefaultComponent
                let foundDefaultComponent = false;
                for (let implement of classInfo.implements) {
                    if (implement.typeName == 'DefaultComponent' || implement.typeName == 'Aventus.DefaultComponent') {
                        foundDefaultComponent = true;
                        break;
                    }
                }

                if (foundDefaultComponent) {
                    let name = classInfo.name;
                    if (classInfo.moduleName != "") {
                        name = classInfo.moduleName + "." + name;
                    }
                    this._classInfoByName[name] = classInfo;
                }
            });
        } catch {
            let splitted = this.file.uri.split("/");
            let fileName = splitted[splitted.length - 1];
            ClientConnection.getInstance().showErrorMessage("There is an error inside file :" + fileName);
        }
    }
    protected async onContentChange(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onSave() {
    }
    protected async onDelete(): Promise<void> {
        super.onDelete();
        delete this.build.tsDefFiles[this.file.uri];
        this.build.rebuildDefinitionWebComponent();
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] };
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return null;
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return null;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return [];
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }

}
export class AventusDefinitionSCSSFile extends AventusBaseFile {

    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.build.scssLanguageService.addDefinition(this);
    }


    protected async onContentChange(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onSave() {
    }
    protected async onDelete() {
        this.build.scssLanguageService.removeDefinition(this);
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] };
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return null;
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return null;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return [];
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }

}
export class AventusDefinitionHTMLFile extends AventusBaseFile {
    protected async onContentChange(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onSave() {
    }
    protected async onDelete() {
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] };
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return null;
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return null;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return [];
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }

}