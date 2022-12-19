import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic, Location, CodeLens, WorkspaceEdit } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from '../../../files/AventusFile';
import { TsCompileResult } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusStaticFile extends AventusTsFile {

    protected get extension(): string {
        return AventusExtension.Static;
    }
    protected override mustBeAddedToLanguageService(): boolean {
        return false;
    }
    protected async onValidate(): Promise<Diagnostic[]> {
        return [];
    }
    protected async onContentChange(): Promise<void> {
        
    }
    protected async onSave() {
        let result: TsCompileResult = {
            nameCompiled: [],
            nameDoc: [],
            src: this.file.content,
            docInvisible: '',
            docVisible: '',
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
    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }
    protected async onRename(document: AventusFile, position: Position, newName: string): Promise<WorkspaceEdit | null> {
        return null;
    }
}