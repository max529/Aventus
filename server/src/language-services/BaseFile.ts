import { CodeAction, CompletionItem, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Position, Range, TextEdit } from "vscode-languageserver";
import { AventusFile, InternalAventusFile } from "../FilesManager";
import { Build } from "../project/Build";


export abstract class AventusBaseFile {
    protected _file: AventusFile;
    protected build: Build;

    public get file() {
        return this._file;
    }

    public constructor(file: AventusFile, build: Build) {
        this._file = file;
        this.build = build;
        this.addEvents();

    }


    private uuidEvents = {
        onContentChange: '',
        onSave: '',
        onDelete: '',
        onCompletion: '',
        onCompletionResolve: '',
        onHover: '',
        onDefinition: '',
        onFormatting: '',
        onCodeAction: '',
    }
    private addEvents(): void {
        this.uuidEvents.onContentChange = this.file.onContentChange(this.onContentChange.bind(this));
        this.uuidEvents.onSave = this.file.onSave(this.onSave.bind(this));
        this.uuidEvents.onDelete = this.file.onDelete(this._onDelete.bind(this));
        this.uuidEvents.onCompletion = this.file.onCompletion(this.onCompletion.bind(this));
        this.uuidEvents.onCompletionResolve = this.file.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.uuidEvents.onHover = this.file.onHover(this.onHover.bind(this));
        this.uuidEvents.onDefinition = this.file.onDefinition(this.onDefinition.bind(this));
        this.uuidEvents.onFormatting = this.file.onFormatting(this.onFormatting.bind(this));
        this.uuidEvents.onCodeAction = this.file.onCodeAction(this.onCodeAction.bind(this));
    }
    public removeEvents(): void {
        this.file.removeOnContentChange(this.uuidEvents.onContentChange);
        this.file.removeOnSave(this.uuidEvents.onSave);
        this.file.removeOnDelete(this.uuidEvents.onDelete);
        this.file.removeOnCompletion(this.uuidEvents.onCompletion);
        this.file.removeOnCompletionResolve(this.uuidEvents.onCompletionResolve);
        this.file.removeOnHover(this.uuidEvents.onHover);
        this.file.removeOnDefinition(this.uuidEvents.onDefinition);
        this.file.removeOnFormatting(this.uuidEvents.onFormatting);
        this.file.removeOnCodeAction(this.uuidEvents.onCodeAction);
    }

    public async triggerChange() {
        if (this.file instanceof InternalAventusFile) {
            await this.file.triggerContentChangeNoDelay(this.file.document);
        }
    }
    public triggerSave():void {
        if (this.file instanceof InternalAventusFile) {
            this.file.triggerSave(this.file.document);
        }
    }
    protected abstract onContentChange(): Promise<Diagnostic[]>;
    protected abstract onSave(): Promise<void>;
    protected abstract onDelete(): Promise<void>;
    private async _onDelete(): Promise<void> {
        await this.onDelete();
        this.removeEvents();
    }

    protected abstract onCompletion(document: AventusFile, position: Position): Promise<CompletionList>;
    protected abstract onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem>;
    protected abstract onHover(document: AventusFile, position: Position): Promise<Hover | null>;
    protected abstract onDefinition(document: AventusFile, position: Position): Promise<Definition | null>;
    protected abstract onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]>;
    protected abstract onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]>;


}