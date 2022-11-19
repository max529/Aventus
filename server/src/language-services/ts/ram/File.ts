import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from '../../../files/AventusFile';
import { Build } from '../../../project/Build';
import { createErrorTsPos } from "../../../tools";
import { genericTsCompile } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusRamFile extends AventusTsFile {

    protected get extension(): string {
        return AventusExtension.RAM;
    }
    constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.refreshFileParsed();
    }
    protected async onValidate(): Promise<Diagnostic[]> {
        this.diagnostics = this.tsLanguageService.doValidation(this.file);
        if (this.build.isCoreBuild) {
            this.validateRules({
                class_implement: ['RAMExtension', 'IRAMManager']
            })
        }
        else {
            this.validateRules({
                class_implement: ['Aventus.RAMExtension', 'Aventus.IRAMManager']
            })
        }
        return this.diagnostics;
    }
    protected async onContentChange(): Promise<void> {
        this.refreshFileParsed();
    }
    protected async onSave() {
        if (this.diagnostics.length == 0) {
            this.setCompileResult(genericTsCompile(this));
        }
        else {
            this.setCompileResult(this.getDefaultCompileResult());
        }
    }
    protected onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return this.tsLanguageService.doComplete(document, position);
    }
    protected onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return this.tsLanguageService.doResolve(item);
    }
    protected onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return this.tsLanguageService.doHover(document, position);
    }
    protected onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        return this.tsLanguageService.findDefinition(document, position);
    }
    protected onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return this.tsLanguageService.format(document, range, options);
    }
    protected onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return this.tsLanguageService.doCodeAction(document, range);
    }

}