import { EOL } from 'os';
import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic, Location, CodeLens } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClientConnection } from '../../../Connection';
import { AventusExtension, AventusLanguageId } from "../../../definition";
import { AventusFile, InternalAventusFile } from '../../../files/AventusFile';
import { Build } from "../../../project/Build";
import { ClassModel } from "../../../ts-file-parser";
import { AventusBaseFile } from "../../BaseFile";
import { AventusTsFile } from "../File";

export class AventusDefinitionFile extends AventusTsFile {
    private tsDef: AventusDefinitionTsFile;
    private tsFile: InternalAventusFile;
    private tsDefStart: number = 0;
    private htmlDef: AventusDefinitionHTMLFile;
    private htmlFile: InternalAventusFile;
    private scssDef: AventusDefinitionSCSSFile;
    private scssFile: InternalAventusFile;

    protected get extension(): string {
        return AventusExtension.Definition;
    }
    protected override mustBeAddedToLanguageService(): boolean {
        return false;
    }
    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        let resultBySection = this.getSplittedFiles();
        this.tsDef = resultBySection.tsDef;
        this.tsFile = resultBySection.tsFile;
        this.htmlDef = resultBySection.htmlDef;
        this.htmlFile = resultBySection.htmlFile;
        this.scssDef = resultBySection.scssDef;
        this.scssFile = resultBySection.scssFile;
        let outputPath = this.build.getOutputUri();
        //if (this.file.uri.replace(AventusExtension.Definition, ".js") != this.build.getOutputUri()) {
        this.tsLanguageService.addFile(this.tsDef);
        //}
    }
    private getSplittedFiles(): {
        tsDef: AventusDefinitionTsFile,
        tsFile: InternalAventusFile,
        scssDef: AventusDefinitionSCSSFile,
        scssFile: InternalAventusFile,
        htmlDef: AventusDefinitionHTMLFile,
        htmlFile: InternalAventusFile,
    } {
        let result = this.separeSection();
        let documentTs = TextDocument.create(this.file.uri, AventusLanguageId.TypeScript, this.file.version, result.jsTxt);
        let tsFile = new InternalAventusFile(documentTs);
        let tsDef = new AventusDefinitionTsFile(tsFile, this.build);

        let documentScss = TextDocument.create(this.file.uri, AventusLanguageId.SCSS, this.file.version, result.scssTxt);
        let scssFile = new InternalAventusFile(documentScss);
        let scssDef = new AventusDefinitionSCSSFile(scssFile, this.build);

        let documentHtml = TextDocument.create(this.file.uri, AventusLanguageId.HTML, this.file.version, result.htmlTxt);
        let htmlFile = new InternalAventusFile(documentHtml)
        let htmlDef = new AventusDefinitionHTMLFile(htmlFile, this.build);

        return {
            tsDef,
            tsFile,
            scssDef,
            scssFile,
            htmlDef,
            htmlFile
        };
    }

    private separeSection(): {
        jsTxt: string,
        scssTxt: string,
        htmlTxt: string
    } {
        this.tsDefStart = 0;
        if (this.file.content.match(/\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g)) {

            let jsToImport = /\/\/ region js \/\/((\s|\S)*)\/\/ end region js \/\//g.exec(this.file.content);
            let jsTxt = "";
            if (jsToImport) {
                this.tsDefStart = jsToImport.index + 15;
                jsTxt = jsToImport[1];
            }

            let scssToImport = /\/\/ region css \/\/((\s|\S)*)\/\/ end region css \/\//g.exec(this.file.content);
            let scssTxt = "";
            if (scssToImport) {
                scssTxt = scssToImport[1];
            }


            let htmlToImport = /\/\/ region html \/\/((\s|\S)*)\/\/ end region html \/\//g.exec(this.file.content);
            let htmlTxt = "";
            if (htmlToImport) {
                htmlTxt = htmlToImport[1];
            }

            return {
                jsTxt,
                scssTxt,
                htmlTxt
            };
        }

        else {
            this.tsDefStart = 0;
            return {
                jsTxt: this.file.content,
                scssTxt: '',
                htmlTxt: ''
            };
        }
    }

    protected async onValidate(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onContentChange(): Promise<void> {
        let result = this.separeSection();
        let documentTs = TextDocument.create(this.file.uri, AventusLanguageId.TypeScript, this.file.version, result.jsTxt);
        this.tsFile.triggerContentChange(documentTs);

        let documentScss = TextDocument.create(this.file.uri, AventusLanguageId.SCSS, this.file.version, result.scssTxt);
        this.scssFile.triggerContentChange(documentScss);

        let documentHtml = TextDocument.create(this.file.uri, AventusLanguageId.HTML, this.file.version, result.htmlTxt);
        this.htmlFile.triggerContentChange(documentHtml);
    }
    protected async onSave() {
    }
    protected override async onDelete(): Promise<void> {
        super.onDelete();
        //if (this.file.uri.replace(AventusExtension.Definition, ".js") != this.build.getOutputUri()) {
        this.tsLanguageService.removeFile(this);
        //}
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] };
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        let currentOffset = document.document.offsetAt(position);
        let newPosition = this.tsDef.file.document.positionAt(currentOffset - this.tsDefStart)
        return await (this.tsDef.file as InternalAventusFile).getHover(newPosition);
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        let currentOffset = document.document.offsetAt(position);
        let newPosition = this.tsDef.file.document.positionAt(currentOffset - this.tsDefStart)
        return await (this.tsDef.file as InternalAventusFile).getDefinition(newPosition);
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        let result: TextEdit[] = [];
        let convertedRanges: Range[] = [];
        let ctx = this.tsDef.file.content;
        let resultsTemp = await (this.tsDef.file as InternalAventusFile).getFormatting(options);
        for (let temp of resultsTemp) {
            if (convertedRanges.indexOf(temp.range) == -1) {
                convertedRanges.push(temp.range);
                temp.range.start = this.transformPosition(this.tsDef, temp.range.start, this, this.tsDefStart * -1);
                temp.range.end = this.transformPosition(this.tsDef, temp.range.end, this, this.tsDefStart * -1);
            }
            result.push(temp);
        }
        return result;
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }
    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }

    private transformPosition(fileFrom: AventusBaseFile, positionFrom: Position, fileTo: AventusBaseFile, offset: number): Position {
        let currentOffset = fileFrom.file.document.offsetAt(positionFrom);
        return fileTo.file.document.positionAt(currentOffset - offset);
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
        //if (this.file.uri.replace(AventusExtension.Definition, ".js") != this.build.getOutputUri()) {
        this.refreshFileParsed(false);
        this.loadDefinitionInsideBuild();
        this.build.tsDefFiles[this.file.uri] = this;
        this.build.rebuildDefinitionWebComponent();
        //}
    }


    private loadDefinitionInsideBuild() {
        try {
            let structJs = this.fileParsed;
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
                    if (classInfo.namespace.name != "") {
                        name = classInfo.namespace.name + "." + name;
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
    protected async onValidate(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onContentChange(): Promise<void> {
        //if (this.file.uri.replace(AventusExtension.Definition, ".js") != this.build.getOutputUri()) {
        this.refreshFileParsed(false);
        this.loadDefinitionInsideBuild();
        this.build.rebuildDefinitionWebComponent();
        //}
        // TODO : Maybe this ll trigger an infinite loop
        if (this.file.uri.replace(AventusExtension.Definition, ".js") != this.build.getOutputUri()) {
            //this.build.build();
        }
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
        return await this.tsLanguageService.doHover(document, position);
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return await this.tsLanguageService.findDefinition(document, position);
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return await this.tsLanguageService.format(document, range, options);
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }
    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }
}
export class AventusDefinitionSCSSFile extends AventusBaseFile {

    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.build.scssLanguageService.addDefinition(this);
    }

    protected async onValidate(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onContentChange(): Promise<void> {
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
    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }
    protected onGetBuild(): Build[] {
        return [this.build]
    }
}
export class AventusDefinitionHTMLFile extends AventusBaseFile {
    protected async onValidate(): Promise<Diagnostic[]> {
        return [];

    }
    protected async onContentChange(): Promise<void> {
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
    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }
    protected onGetBuild(): Build[] {
        return [this.build]
    }
}