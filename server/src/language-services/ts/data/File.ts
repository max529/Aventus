import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from "../../../FilesManager";
import { createErrorTsPos } from "../../../tools";
import { genericTsCompile } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusDataFile extends AventusTsFile {

    protected get extension(): string {
        return AventusExtension.Data;
    }

    protected async onContentChange(): Promise<Diagnostic[]> {
        this.refreshFileParsed();
        let document = this.file.document;
        this.diagnostics = this.tsLanguageService.doValidation(this.file);
        const struct = this.fileParsed;
        for (let enumTemp of struct.enumDeclarations) {
            if (!enumTemp.isExported) {
                this.diagnostics.push(createErrorTsPos(document, 'Enum must be exported', enumTemp.start, enumTemp.end));
            }
        }
        for (let classTemp of struct.classes) {
            if (!classTemp.isExported) {
                this.diagnostics.push(createErrorTsPos(document, 'Class must start with "export"', classTemp.start, classTemp.end));
            }

            //#region found Data or IData
            let foundData = false;
            if (classTemp.isInterface) {
                if (classTemp.name != "IData") {
                    for (let implement of classTemp.extends) {
                        if (implement.typeName == 'IData' || implement.typeName == 'Aventus.IData') {
                            foundData = true;
                            break;
                        }
                    }
                }
                else {
                    foundData = true;
                }
            }
            else {
                for (let implement of classTemp.implements) {
                    if (implement.typeName == 'IData' || implement.typeName == 'Aventus.IData') {
                        foundData = true;
                        break;
                    }
                }
            }

            if (!foundData) {
                if (classTemp.isInterface) {
                    this.diagnostics.push(createErrorTsPos(document, 'Interface must extends IData', classTemp.start, classTemp.end));
                }
                else {
                    this.diagnostics.push(createErrorTsPos(document, 'Class must implement IData', classTemp.start, classTemp.end));
                }
            }
            //#endregion

            for (let field of classTemp.fields) {
                if (!field.valueConstraint) {
                    this.diagnostics.push(createErrorTsPos(document, `Property '${field.name}' has no initializer and is not definitely assigned.`, field.start, field.end));
                }
            }
        }
        return this.diagnostics;
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

}