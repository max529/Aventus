import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic, Location, CodeLens } from "vscode-languageserver";
import { AventusExtension } from '../../definition';
import { AventusFile, InternalAventusFile } from '../../files/AventusFile';
import { FilesManager } from '../../files/FilesManager';
import { Build } from '../../project/Build';
import { AventusBaseFile } from "../BaseFile";
import { AventusWebComponentLogicalFile } from '../ts/component/File';

export class AventusHTMLFile extends AventusBaseFile {

    public compiledVersion = -1;
    private compiledTxt: string = "";

    public get compileResult() {
        return this.compiledTxt;
    }
    constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.compile(false);
    }

    protected async onValidate(): Promise<Diagnostic[]> {
        let diagnostics = await this.build.htmlLanguageService.doValidation(this.file);
        return diagnostics;
    }
    protected async onContentChange(): Promise<void> {
    }
    protected async onSave() {
        this.compile();
    }
    private compile(triggerSave = true) {
        try {
            let newCompiledTxt = "";
            newCompiledTxt = this.file.content.replace(/<!--[\s\S]*?-->/g, '').trim();
            if (newCompiledTxt != this.compiledTxt) {
                this.compiledVersion++;
                this.compiledTxt = newCompiledTxt;
                let tsFile = this.build.tsFiles[this.file.uri.replace(AventusExtension.ComponentView, AventusExtension.ComponentLogic)];
                if (tsFile instanceof AventusWebComponentLogicalFile && triggerSave) {
                    tsFile.triggerSave();
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    protected async onDelete() {

    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return await this.build.htmlLanguageService.doComplete(document, position);
    }
    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return item;
    }
    protected onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return this.build.htmlLanguageService.doHover(document, position);
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return this.build.htmlLanguageService.onDefinition(this, position);
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return this.build.htmlLanguageService.format(document, range, options);
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