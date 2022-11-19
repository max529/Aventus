import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { AventusExtension } from '../../definition';
import { AventusFile, InternalAventusFile } from '../../files/AventusFile';
import { FilesManager } from '../../files/FilesManager';
import { AventusBaseFile } from "../BaseFile";

export class AventusHTMLFile extends AventusBaseFile {

    private diagnostics: Diagnostic[] = [];
    private compiledTxt: string = "";

    public get compileResult() {
        return this.compiledTxt;
    }

    protected async onValidate(): Promise<Diagnostic[]> {
        let diagnostics = await this.build.htmlLanguageService.doValidation(this.file);
        this.compile();
        return diagnostics;
    }
    protected async onContentChange(): Promise<void> {
        
    }
    protected async onSave() {
        let jsFile = FilesManager.getInstance().getByUri(this.file.uri.replace(AventusExtension.ComponentView, AventusExtension.ComponentLogic))
        if (jsFile && jsFile.uri.endsWith(AventusExtension.ComponentLogic)) {
            await (jsFile as InternalAventusFile).triggerSave(jsFile.document);
        }
    }
    private compile() {
        try {
            let newCompiledTxt = "";
            if (this.diagnostics.length == 0) {
                newCompiledTxt = this.file.content.replace(/<!--[\s\S]*?-->/g, '').trim();
            }
            if (newCompiledTxt != this.compiledTxt) {
                this.compiledTxt = newCompiledTxt;
                let jsFile = FilesManager.getInstance().getByUri(this.file.uri.replace(AventusExtension.ComponentView, AventusExtension.ComponentLogic))
                if (jsFile && jsFile.uri.endsWith(AventusExtension.ComponentLogic)) {
                    (jsFile as InternalAventusFile).triggerContentChange(jsFile.document);
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
        return null;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return this.build.htmlLanguageService.format(document, range, options);
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return [];
    }

}