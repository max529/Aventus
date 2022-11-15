import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from "../../../FilesManager";
import { TsCompileResult } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusStaticFile extends AventusTsFile {

    protected get extension(): string {
        return AventusExtension.Static;
    }
    protected override mustBeAddedToLanguageService(): boolean {
        return false;
    }
    protected async onContentChange(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onSave() {
        let result: TsCompileResult = {
            nameCompiled: [],
            nameDoc: [],
            src: this.file.content,
            doc: '',
            dependances: []
        }
        this.setCompileResult(result);
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return { isIncomplete: false, items: [] }
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