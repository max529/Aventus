import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic } from "vscode-languageserver";
import { AventusExtension } from "../../../definition";
import { AventusFile } from "../../../FilesManager";
import { createErrorTsPos } from "../../../tools";
import { parseDocument } from "../../../ts-file-parser/src/tsStructureParser";
import { genericTsCompile } from "../compiler";
import { AventusTsFile } from "../File";

export class AventusSocketFile extends AventusTsFile {
    
    protected get extension(): string {
        return AventusExtension.Socket;
    }

    protected async onContentChange(): Promise<Diagnostic[]>  {
        let document = this.file.document;
        this.diagnostics = this.tsLanguageService.doValidation(this.file);
        const struct = parseDocument(document);
        for (let enumTemp of struct.enumDeclarations) {
            if (!enumTemp.isExported) {
                this.diagnostics.push(createErrorTsPos(document, 'Enum must be exported', enumTemp.start, enumTemp.end));
            }
        }
    
        for (let classTemp of struct.classes) {
            if (!classTemp.isExported) {
                this.diagnostics.push(createErrorTsPos(document, 'Class must start with "export"', classTemp.start, classTemp.end));
            }
            if (!classTemp.isInterface) {
                let foundData = false;
                for (let implement of classTemp.implements) {
                    if (implement.typeName == 'ISocket' || implement.typeName == "Aventus.ISocket") {
                        foundData = true;
                        break;
                    }
                }
                if (!foundData) {
                    this.diagnostics.push(createErrorTsPos(document, 'Class must implement ISocket', classTemp.start, classTemp.end));
                }
            }
        }
        return this.diagnostics;
    }
    protected onSave() {
        if(this.diagnostics.length == 0){
            this.setCompileResult(genericTsCompile(this.file));
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