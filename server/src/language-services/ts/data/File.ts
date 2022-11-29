import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic, Location, CodeLens } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from '../../../files/AventusFile';
import { Build } from '../../../project/Build';
import { createErrorTsPos } from "../../../tools";
import { genericTsCompile } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusDataFile extends AventusTsFile {
    protected get extension(): string {
        return AventusExtension.Data;
    }
    constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.refreshFileParsed();
    }
    protected async onValidate(): Promise<Diagnostic[]> {
        let document = this.file.document;
        this.diagnostics = this.tsLanguageService.doValidation(this.file);
        const struct = this.fileParsed;
        if (this.build.isCoreBuild) {
            this.validateRules({
                class_implement: ['IData']
            })
        }
        else {
            this.validateRules({
                class_implement: ['Aventus.IData']
            })
        }
        for (let classTemp of struct.classes) {
            for (let field of classTemp.fields) {
                if (!field.valueConstraint) {
                    this.diagnostics.push(createErrorTsPos(document, `Property '${field.name}' has no initializer and is not definitely assigned.`, field.start, field.end));
                }
            }
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
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        let changes = await this.tsLanguageService.format(document, range, options);
        return changes;
    }
    protected onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return this.tsLanguageService.doCodeAction(document, range);
    }
    protected onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return this.tsLanguageService.onReferences(document, position);
    }
    protected onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return this.tsLanguageService.onCodeLens(document);
    }
}