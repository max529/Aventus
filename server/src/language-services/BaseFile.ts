import { CodeAction, CodeLens, CompletionItem, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Location, Position, Range, TextEdit } from "vscode-languageserver";
import { AventusFile, InternalAventusFile } from '../files/AventusFile';
import { Build } from "../project/Build";


export abstract class AventusBaseFile {
    protected _file: AventusFile;
    protected _build: Build;

    public get file() {
        return this._file;
    }
    public get build() {
        return this._build;

    }

    public constructor(file: AventusFile, build: Build) {
        this._file = file;
        this._build = build;
        this.addEvents();

    }


    private uuidEvents = {
        onContentChange: '',
        onValidate: '',
        onSave: '',
        onDelete: '',
        onCompletion: '',
        onCompletionResolve: '',
        onHover: '',
        onDefinition: '',
        onFormatting: '',
        onCodeAction: '',
        onReferences: '',
        onCodeLens: '',
        onGetBuild: '',
    }
    private addEvents(): void {
        this.uuidEvents.onContentChange = this.file.onContentChange(this.onContentChange.bind(this));
        this.uuidEvents.onValidate = this.file.onValidate(this.onValidate.bind(this));
        this.uuidEvents.onSave = this.file.onSave(this.onSave.bind(this));
        this.uuidEvents.onDelete = this.file.onDelete(this._onDelete.bind(this));
        this.uuidEvents.onCompletion = this.file.onCompletion(this.onCompletion.bind(this));
        this.uuidEvents.onCompletionResolve = this.file.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.uuidEvents.onHover = this.file.onHover(this.onHover.bind(this));
        this.uuidEvents.onDefinition = this.file.onDefinition(this.onDefinition.bind(this));
        this.uuidEvents.onFormatting = this.file.onFormatting(this.onFormatting.bind(this));
        this.uuidEvents.onCodeAction = this.file.onCodeAction(this.onCodeAction.bind(this));
        this.uuidEvents.onReferences = this.file.onReferences(this.onReferences.bind(this));
        this.uuidEvents.onCodeLens = this.file.onCodeLens(this.onCodeLens.bind(this));
        this.uuidEvents.onGetBuild = this.file.onGetBuild(this.onGetBuild.bind(this));
    }
    public removeEvents(): void {
        this.file.removeOnContentChange(this.uuidEvents.onContentChange);
        this.file.removeOnValidate(this.uuidEvents.onValidate);
        this.file.removeOnSave(this.uuidEvents.onSave);
        this.file.removeOnDelete(this.uuidEvents.onDelete);
        this.file.removeOnCompletion(this.uuidEvents.onCompletion);
        this.file.removeOnCompletionResolve(this.uuidEvents.onCompletionResolve);
        this.file.removeOnHover(this.uuidEvents.onHover);
        this.file.removeOnDefinition(this.uuidEvents.onDefinition);
        this.file.removeOnFormatting(this.uuidEvents.onFormatting);
        this.file.removeOnCodeAction(this.uuidEvents.onCodeAction);
        this.file.removeOnReferences(this.uuidEvents.onReferences);
        this.file.removeOnCodeLens(this.uuidEvents.onCodeLens);
        this.file.removeOnGetBuild(this.uuidEvents.onGetBuild);

    }

    public async validate() {
        if (this.file instanceof InternalAventusFile) {
            await this.file.validate();
        }
    }
    public triggerSave(): void {
        if (this.file instanceof InternalAventusFile) {
            this.file.triggerSave(this.file.document);
        }
    }
    protected abstract onContentChange(): Promise<void>;
    protected abstract onValidate(): Promise<Diagnostic[]>;
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
    protected abstract onReferences(document: AventusFile, position: Position): Promise<Location[]>;
    protected abstract onCodeLens(document: AventusFile): Promise<CodeLens[]>;
    protected abstract onGetBuild(): Build[];


}