import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { EOL } from 'os';
import { Position, CompletionList, CompletionItem, Hover, Definition, Range, FormattingOptions, TextEdit, CodeAction, Diagnostic, Location, CodeLens } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AventusExtension, AventusLanguageId } from "../../../definition";
import { AventusFile, InternalAventusFile } from '../../../files/AventusFile';
import { Build } from "../../../project/Build";
import { AventusBaseFile } from "../../BaseFile";
import { AventusHTMLFile } from "../../html/File";
import { AventusSCSSFile } from "../../scss/File";
import { AventusTsFile } from "../File";
import { AventusWebcomponentCompiler } from "./compiler/compiler";
import { CompileComponentResult } from "./compiler/def";

export class AventusWebComponentLogicalFile extends AventusTsFile {
    private compilationResult: CompileComponentResult | undefined;
    protected get extension(): string {
        return AventusExtension.ComponentLogic;
    }

    constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.refreshFileParsed();
    }

    protected async onValidate(): Promise<Diagnostic[]> {
        this.compilationResult = new AventusWebcomponentCompiler(this, this.build).compile();
        this.build.scssLanguageService.addInternalDefinition(this.file.uri, this.compilationResult.result.scssDoc);
        this.build.htmlLanguageService.addInternalDefinition(this.file.uri, this.compilationResult.result.htmlDoc);
        return this.compilationResult.diagnostics;
    }
    protected async onContentChange(): Promise<void> {
        this.refreshFileParsed();
    }
    protected async onSave() {
        if (!this.compilationResult) {
            this.onContentChange();
        }
        if (this.compilationResult && this.compilationResult.diagnostics.length == 0) {
            this.setCompileResult({
                dependances: this.compilationResult.result.dependances,
                docVisible: this.compilationResult.result.docVisible,
                docInvisible: this.compilationResult.result.docInvisible,
                nameCompiled: this.compilationResult.result.nameCompiled,
                nameDoc: this.compilationResult.result.nameDoc,
                src: this.compilationResult.result.src
            })
        }
        else {
            let ctx = this.file.content;
            this.setCompileResult(this.getDefaultCompileResult());
        }
        if (this.compilationResult?.writeCompiled) {
            writeFileSync(this.file.folderPath + '/compiled.js', this.compilationResult.result.debug);
        }
        else if (existsSync(this.file.folderPath + '/compiled.js')) {
            unlinkSync(this.file.folderPath + '/compiled.js')
        }
    }
    protected async onDelete(): Promise<void> {
        await super.onDelete();
        this.build.scssLanguageService.removeInternalDefinition(this.file.uri);
        this.build.htmlLanguageService.removeInternalDefinition(this.file.uri);

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
        let txt = document.content;
        return this.tsLanguageService.format(document, range, options);
    }
    protected onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        return this.tsLanguageService.doCodeAction(document, range);
    }
    protected onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return this.tsLanguageService.onReferences(document, position);
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return this.tsLanguageService.onCodeLens(document);
    }
}

interface AventusWebComponentSingleFileRegion<T extends AventusBaseFile> {
    start: number,
    end: number,
    file?: T,
}
export class AventusWebComponentSingleFile extends AventusTsFile {
    private regionLogic: AventusWebComponentSingleFileRegion<AventusWebComponentLogicalFile> = {
        start: 0,
        end: 0,
    }
    private regionStyle: AventusWebComponentSingleFileRegion<AventusSCSSFile> = {
        start: 0,
        end: 0
    }
    private regionView: AventusWebComponentSingleFileRegion<AventusHTMLFile> = {
        start: 0,
        end: 0
    }

    public get logic(): AventusWebComponentLogicalFile {
        if (this.regionLogic.file) {
            return this.regionLogic.file
        }
        let fileTemp = this.getDocuments().ts;
        this.regionLogic.file = fileTemp;
        return fileTemp;
    }
    public get style(): AventusSCSSFile {
        if (this.regionStyle.file) {
            return this.regionStyle.file
        }
        let fileTemp = this.getDocuments().scss;
        this.regionStyle.file = fileTemp;
        return fileTemp;
    }
    public get view(): AventusHTMLFile {
        if (this.regionView.file) {
            return this.regionView.file
        }
        let fileTemp = this.getDocuments().html;
        this.regionView.file = fileTemp;
        return fileTemp;
    }

    protected get extension(): string {
        return AventusExtension.Component;
    }

    protected mustBeAddedToLanguageService(): boolean {
        return false;
    }

    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        let result = this.getDocuments();
        this.regionLogic.file = result.ts;
        this.build.tsFiles[result.ts.file.uri] = result.ts;
        this.regionStyle.file = result.scss;
        this.regionView.file = result.html;
    }
    protected async onValidate(): Promise<Diagnostic[]> {
        let result = this.splitDocument();
        let diagnostics: Diagnostic[] = [];
        let convertedRanges: Range[] = [];

        const _convertSection = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>, languageId: string, newText: string) => {
            let newDocument = TextDocument.create(this.file.uri, languageId, this.file.version, newText);
            if (region.file) {
                region.file.file.document = newDocument;
                let errors = await (region.file.file as InternalAventusFile).validate();
                for (let error of errors) {
                    error.source = AventusLanguageId.WebComponent;
                    if (convertedRanges.indexOf(error.range) == -1) {
                        convertedRanges.push(error.range);
                        error.range.start = this.file.document.positionAt(newDocument.offsetAt(error.range.start) + region.start);
                        error.range.end = this.file.document.positionAt(newDocument.offsetAt(error.range.end) + region.start);
                    }
                    diagnostics.push(error);
                }
            }
        }
        await _convertSection(this.regionStyle, AventusLanguageId.SCSS, result.cssText);
        await _convertSection(this.regionView, AventusLanguageId.HTML, result.htmlText);
        await _convertSection(this.regionLogic, AventusLanguageId.TypeScript, result.scriptText);



        return diagnostics;
    }
    protected async onContentChange(): Promise<void> {

    }
    protected async onSave() {
        this.build.disableBuild();
        (this.style.file as InternalAventusFile).triggerSave(this.style.file.document);
        (this.view.file as InternalAventusFile).triggerSave(this.view.file.document);
        this.build.enableBuild();
        (this.logic.file as InternalAventusFile).triggerSave(this.logic.file.document);
    }
    protected async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        let currentOffset = document.document.offsetAt(position);
        let convertedRanges: Range[] = [];

        const generateComplete = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>): Promise<CompletionList | undefined> => {
            if (currentOffset >= region.start && currentOffset <= region.end && region.file) {
                let result = await (region.file?.file as InternalAventusFile).getCompletion(region.file.file.document.positionAt(currentOffset - region.start));

                for (let item of result.items) {
                    if (item.data && item.data.uri) {
                        item.data.previousLanguageId = item.data.languageId;
                        item.data.languageId = AventusLanguageId.WebComponent;
                    }
                    if (item.textEdit) {
                        let textEdit = item.textEdit as TextEdit;
                        if (textEdit.range) {
                            if (convertedRanges.indexOf(textEdit.range) == -1) {
                                convertedRanges.push(textEdit.range)
                                textEdit.range.start = this.transformPosition(region.file, textEdit.range.start, this, region.start * -1);
                                textEdit.range.end = this.transformPosition(region.file, textEdit.range.end, this, region.start * -1);
                            }
                        }
                    }
                }
                return result
            }
            return undefined;
        }

        let cssResult = await generateComplete(this.regionStyle);
        if (cssResult) { return cssResult; }
        let htmlResult = await generateComplete(this.regionView);
        if (htmlResult) { return htmlResult; }
        let jsResult = await generateComplete(this.regionLogic);
        if (jsResult) { return jsResult; }

        return { isIncomplete: false, items: [] };
    }

    protected async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        let convertedRanges: Range[] = [];

        if (item.data) {
            if (item.data.previousLanguageId) {
                let previousLanguageId = item.data.previousLanguageId;
                delete item.data.previousLanguageId;

                const generateCompletionResolve = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>, languageId: string): Promise<CompletionItem | undefined> => {
                    if (previousLanguageId == languageId) {
                        let subfile = region.file;
                        if (subfile) {
                            let resultTemp = await (subfile.file as InternalAventusFile).getCompletionResolve(item);
                            if (resultTemp.additionalTextEdits) {
                                for (let edit of resultTemp.additionalTextEdits) {
                                    if (subfile.file.document.offsetAt(edit.range.start) == 0) {
                                        edit.newText = EOL + edit.newText;
                                    }
                                    if (convertedRanges.indexOf(edit.range) == -1 && !edit.range["wc_transformed"]) {
                                        convertedRanges.push(edit.range);
                                        edit.range["wc_transformed"] = true;
                                        edit.range.start = this.transformPosition(subfile, edit.range.start, this, region.start * -1);
                                        edit.range.end = this.transformPosition(subfile, edit.range.end, this, region.start * -1);
                                    }

                                }
                            }
                            return resultTemp;
                        }
                    }
                    return undefined;
                }

                let cssResult = await generateCompletionResolve(this.regionStyle, AventusLanguageId.SCSS);
                if (cssResult) { return cssResult; }
                let htmlResult = await generateCompletionResolve(this.regionView, AventusLanguageId.HTML);
                if (htmlResult) { return htmlResult; }
                let jsResult = await generateCompletionResolve(this.regionLogic, AventusLanguageId.TypeScript);
                if (jsResult) { return jsResult; }
            }
        }
        return item;
    }
    protected async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        let currentOffset = document.document.offsetAt(position);
        let convertedRanges: Range[] = [];

        const generateHover = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>): Promise<Hover | null> => {
            if (currentOffset >= region.start && currentOffset <= region.end && region.file) {
                let result = await (region.file.file as InternalAventusFile).getHover(region.file.file.document.positionAt(currentOffset - region.start));
                if (result?.range) {
                    if (convertedRanges.indexOf(result.range) == -1) {
                        convertedRanges.push(result.range);
                        result.range.start = this.transformPosition(region.file, result.range.start, this, region.start * -1);
                        result.range.end = this.transformPosition(region.file, result.range.end, this, region.start * -1);
                    }
                }
                return result;
            }
            return null;
        }

        let cssResult = await generateHover(this.regionStyle);
        if (cssResult) { return cssResult; }
        let htmlResult = await generateHover(this.regionView);
        if (htmlResult) { return htmlResult; }
        let jsResult = await generateHover(this.regionLogic);
        if (jsResult) { return jsResult; }

        return null;
    }
    protected async onDefinition(document: AventusFile, position: Position): Promise<Definition | null> {
        let currentOffset = document.document.offsetAt(position);
        let result: Definition | null = null;
        if (currentOffset >= this.regionStyle.start && currentOffset <= this.regionStyle.end) {
            result = await (this.style.file as InternalAventusFile).getDefinition(this.style.file.document.positionAt(currentOffset - this.regionStyle.start));
        }
        else if (currentOffset >= this.regionView.start && currentOffset <= this.regionView.end) {
            result = await (this.view.file as InternalAventusFile).getDefinition(this.view.file.document.positionAt(currentOffset - this.regionView.start));
        }
        else if (currentOffset >= this.regionLogic.start && currentOffset <= this.regionLogic.end) {
            result = await (this.logic.file as InternalAventusFile).getDefinition(this.logic.file.document.positionAt(currentOffset - this.regionLogic.start));
        }

        return result;
    }
    protected async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        let result: TextEdit[] = [];
        let convertedRanges: Range[] = [];

        const generateFormatting = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>): Promise<void> => {
            if (region.file) {
                let resultsTemp = await (region.file.file as InternalAventusFile).getFormatting(options)
                for (let temp of resultsTemp) {
                    temp.newText = temp.newText.split('\n').join("\n\t");
                    if (temp.range.start.character == 0 && temp.range.start.line == 0) {
                        temp.newText = EOL + "\t" + temp.newText;
                    }
                    if (temp.range.start.character == 0) {
                        temp.newText = "\t" + temp.newText;
                    }
                    if (region.file.file.document.offsetAt(temp.range.end) == region.file.file.document.getText().length) {
                        temp.newText = temp.newText + EOL;
                    }
                    if (convertedRanges.indexOf(temp.range) == -1) {
                        convertedRanges.push(temp.range);
                        temp.range.start = this.transformPosition(region.file, temp.range.start, this, region.start * -1);
                        temp.range.end = this.transformPosition(region.file, temp.range.end, this, region.start * -1);
                    }
                    result.push(temp);
                }
            }
        }
        await generateFormatting(this.regionStyle);
        await generateFormatting(this.regionView);
        await generateFormatting(this.regionLogic);

        return result;
    }
    protected async onCodeAction(document: AventusFile, range: Range): Promise<CodeAction[]> {
        let rangeSelected = {
            start: document.document.offsetAt(range.start),
            end: document.document.offsetAt(range.end)
        }
        let convertedRanges: Range[] = [];

        const generateCodeAction = async (region: AventusWebComponentSingleFileRegion<AventusBaseFile>): Promise<CodeAction[] | undefined> => {
            if (this.isOverlapping(rangeSelected, region) && region.file) {
                let results = await (region.file.file as InternalAventusFile).getCodeAction({
                    start: this.transformPosition(this, range.start, region.file, region.start),
                    end: this.transformPosition(this, range.end, region.file, region.start)
                })

                for (let result of results) {
                    if (result.edit) {
                        if (result.edit.changes) {
                            let changesFinal: TextEdit[] = [];
                            for (let changeFile in result.edit.changes) {
                                let changes = result.edit.changes[changeFile];
                                for (let change of changes) {
                                    if (convertedRanges.indexOf(change.range) == -1) {
                                        convertedRanges.push(change.range);
                                        change.range.start = this.transformPosition(region.file, change.range.start, this, region.start * -1);
                                        change.range.end = this.transformPosition(region.file, change.range.end, this, region.start * -1);
                                    }
                                    changesFinal.push(change);
                                }
                            }
                            if (changesFinal.length > 0) {
                                delete result.edit.changes[region.file.file.uri];
                                result.edit.changes[document.uri] = changesFinal;
                            }
                        }
                    }
                }
                return results;
            }
            return undefined;
        }

        let resultTemp: CodeAction[] | undefined;
        resultTemp = await generateCodeAction(this.regionStyle);
        if (resultTemp) { return resultTemp };

        resultTemp = await generateCodeAction(this.regionView);
        if (resultTemp) { return resultTemp };

        resultTemp = await generateCodeAction(this.regionLogic);
        if (resultTemp) { return resultTemp };


        return [];
    }

    protected async onDelete(): Promise<void> {
        await super.onDelete();
        delete this.build.tsFiles[this.file.uri];
    }

    protected async onReferences(document: AventusFile, position: Position): Promise<Location[]> {
        return [];
    }
    protected async onCodeLens(document: AventusFile): Promise<CodeLens[]> {
        return [];
    }


    private getDocuments() {
        let resultTxt = this.splitDocument();

        let htmlFileTemp = new InternalAventusFile(TextDocument.create(this.file.uri, AventusLanguageId.HTML, this.file.version, resultTxt.htmlText));
        let scssFileTemp = new InternalAventusFile(TextDocument.create(this.file.uri, AventusLanguageId.SCSS, this.file.version, resultTxt.cssText));
        let tsFileTemp = new InternalAventusFile(TextDocument.create(this.file.uri, AventusLanguageId.HTML, this.file.version, resultTxt.scriptText));

        return {
            html: new AventusHTMLFile(htmlFileTemp, this.build),
            scss: new AventusSCSSFile(scssFileTemp, this.build),
            ts: new AventusWebComponentLogicalFile(tsFileTemp, this.build)
        };
    }

    private splitDocument() {
        let regexScript = /<script>((\s|\S)*)<\/script>/g;
        let regexTemplate = /<template>((\s|\S)*)<\/template>/g;
        let regexStyle = /<style>((\s|\S)*)<\/style>/g;

        let resultTxt = {
            cssText: '',
            htmlText: '',
            scriptText: ''
        }

        let scriptMatch = regexScript.exec(this.file.content);
        if (scriptMatch) {
            let startIndex = scriptMatch.index + 8;
            this.regionLogic.start = startIndex;
            let endIndex = scriptMatch.index + scriptMatch[0].length - 9;
            this.regionLogic.end = endIndex;
            resultTxt.scriptText = this.file.content.substring(startIndex, endIndex)
        }

        let styleMatch = regexStyle.exec(this.file.content);
        if (styleMatch) {
            let startIndex = styleMatch.index + 7;
            this.regionStyle.start = startIndex;
            let endIndex = styleMatch.index + styleMatch[0].length - 8;
            this.regionStyle.end = endIndex;
            resultTxt.cssText = this.file.content.substring(startIndex, endIndex)
        }

        let htmlMatch = regexTemplate.exec(this.file.content);
        if (htmlMatch) {
            let startIndex = htmlMatch.index + 10;
            this.regionView.start = startIndex;
            let endIndex = htmlMatch.index + htmlMatch[0].length - 11;
            this.regionView.end = endIndex;
            resultTxt.htmlText = this.file.content.substring(startIndex, endIndex)
        }

        return resultTxt;
    }
    private transformPosition(fileFrom: AventusBaseFile, positionFrom: Position, fileTo: AventusBaseFile, offset: number): Position {
        let currentOffset = fileFrom.file.document.offsetAt(positionFrom);
        return fileTo.file.document.positionAt(currentOffset - offset);
    }
    private isOverlapping(rangeSelected: { start: number, end: number }, rangeSection: { start: number, end: number }): boolean {
        return (rangeSection.start < rangeSelected.start && rangeSection.end > rangeSelected.start) ||
            (rangeSection.start < rangeSelected.end && rangeSection.end > rangeSelected.end) ||
            (rangeSection.start > rangeSelected.start && rangeSection.end < rangeSelected.end)
    }



    public static getRegion(file: AventusFile) {
        let regexScript = /<script>((\s|\S)*)<\/script>/g;
        let regexTemplate = /<template>((\s|\S)*)<\/template>/g;
        let regexStyle = /<style>((\s|\S)*)<\/style>/g;

        let resultTxt = {
            cssText: '',
            htmlText: '',
            scriptText: ''
        }

        let scriptMatch = regexScript.exec(file.content);
        if (scriptMatch) {
            let startIndex = scriptMatch.index + 8;
            let endIndex = scriptMatch.index + scriptMatch[0].length - 9;
            resultTxt.scriptText = file.content.substring(startIndex, endIndex)
        }

        let styleMatch = regexStyle.exec(file.content);
        if (styleMatch) {
            let startIndex = styleMatch.index + 7;
            let endIndex = styleMatch.index + styleMatch[0].length - 8;
            resultTxt.cssText = file.content.substring(startIndex, endIndex)
        }

        let htmlMatch = regexTemplate.exec(file.content);
        if (htmlMatch) {
            let startIndex = htmlMatch.index + 10;
            let endIndex = htmlMatch.index + htmlMatch[0].length - 11;
            resultTxt.htmlText = file.content.substring(startIndex, endIndex)
        }

        return resultTxt;
    }


}