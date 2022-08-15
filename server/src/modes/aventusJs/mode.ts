import { TextDocument } from 'vscode-languageserver-textdocument';
import * as ts from 'typescript';
import {
    Diagnostic,
    DiagnosticSeverity,
    CompletionItem,
    Range,
    Position,
    CompletionList,
    TextEdit,
    Hover,
    SignatureHelp,
    SignatureInformation,
    ParameterInformation,
    DocumentHighlight,
    DocumentHighlightKind,
    SymbolInformation,
    Definition,
    Location,
    SelectionRange,
    FormattingOptions,
    FoldingRange,
    FoldingRangeKind,
    WorkspaceEdit,
    WorkspaceFolder,
    _,
    _Connection,
    CodeAction
} from 'vscode-languageserver/node';
import { convertKind, convertRange, convertSymbolKind, generateIndent, getWordAtText, isWhitespaceOnly, JS_WORD_REGEX, pathToUri, simplifyPath, uriToPath } from './utils';
import { compilerOptions, completionOptions, formatingOptions } from './config';
import { AventusJSProgramManager } from './program';
import { languageIdJs } from '../../config';




export class AventusJSMode {
    public programManager = new AventusJSProgramManager();
    private listFiles: { [key: string]: TextDocument } = {};
    getId() {
        return languageIdJs;
    }
    getFiles() {
        return this.listFiles;
    }
    async init(files: TextDocument[]) {
        for (let file of files) {
            this.listFiles[file.uri] = file
        }
    }
    async doValidation(document: TextDocument) {
        this.listFiles[document.uri] = document;
        this.programManager.getProgram(document).doValidation(document);
    }
    async doComplete(document: TextDocument, position: Position): Promise<CompletionList> {
        try {
            const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
            let offset = document.offsetAt(position);
            let replaceRange = convertRange(document, getWordAtText(document.getText(), offset, JS_WORD_REGEX));
            let completions: ts.WithMetadata<ts.CompletionInfo> | undefined;

            try {
                completions = jsLanguageService.getCompletionsAtPosition(document.uri, offset, completionOptions);
            } catch (e) {
                console.error(e);
            }

            if (!completions) {
                return { isIncomplete: false, items: [] };
            }

            let items: CompletionItem[] = [];
            for (let i = 0; i < completions.entries.length; i++) {
                let entry = completions.entries[i];
                let remplacement = entry.insertText ? entry.insertText : entry.name
                let customData = {
                    languageIdJs,
                    offset: offset,
                    uri: document.uri
                }
                
                let completionEntry: CompletionItem = {
                    label: entry.name,
                    sortText: entry.sortText,
                    kind: convertKind(entry.kind),
                    textEdit: TextEdit.replace(replaceRange, remplacement),
                    data: { // data used for resolving item details (see 'doResolve')
                        ...entry.data,
                        ...customData
                    },
                }
                items.push(completionEntry)
            }
            return { isIncomplete: false, items: items };
        } catch (e) {
            console.error(e);
        }
        return { isIncomplete: false, items: [] };
    }
    async doResolve(item: CompletionItem): Promise<CompletionItem> {
        if (item.data) {
            let program = this.programManager.getProgram(item.data.uri);
            let document = program.getDocument(item.data.uri)?.document;
            if (document != null) {
                const jsLanguageService = program.getLanguageService();
                let myData = {
                    languageIdJs: item.data.languageIdJs,
                    offset: item.data.offset,
                    uri: item.data.uri
                }
                delete item.data.languageIdJs;
                delete item.data.offset;
                delete item.data.uri;
                if (Object.keys(item.data).length == 0) {
                    item.data = undefined
                }

                let details = jsLanguageService.getCompletionEntryDetails(
                    myData.uri,
                    myData.offset,
                    item.label,
                    {},
                    document.getText(),
                    completionOptions,
                    item.data);

                if (details) {
                    item.detail = ts.displayPartsToString(details.displayParts);
                    item.documentation = ts.displayPartsToString(details.documentation);
                    item.additionalTextEdits = [];
                    if (details.codeActions) {
                        for (let i = 0; i < details.codeActions.length; i++) {
                            for (let change of details.codeActions[i].changes) {
                                for (let txtChange of change.textChanges) {
                                    txtChange.newText = txtChange.newText.replace(/'/g, '"');
                                    let newImport = /"(.*)"/g.exec(txtChange.newText);
                                    if (newImport && newImport.length > 1) {
                                        let finalPath = simplifyPath(newImport[1], document.uri);
                                        item.detail += "\r\nimport from " + finalPath;
                                        txtChange.newText = txtChange.newText.replace(newImport[1], finalPath);
                                    }

                                    item.additionalTextEdits.push({
                                        newText: txtChange.newText,
                                        range: convertRange(document, txtChange.span)
                                    });
                                }
                            }
                        }
                    }
                    delete item.data;
                }
            }
        }
        return item;
    }
    async doCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
        return this.programManager.getProgram(document).doCodeAction(document, range);
    }
    async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let info = jsLanguageService.getQuickInfoAtPosition(document.uri, document.offsetAt(position));
        if (info) {
            let textDoc: string[] = []
            if (info.documentation) {
                for (let doc of info.documentation) {
                    textDoc.push(doc.text);
                }
            }
            const contents = ts.displayPartsToString(info.displayParts);
            return {
                range: convertRange(document, info.textSpan),
                contents: [contents, textDoc.join("\r\n")].join('\n')
            };
        }
        return null;
    }
    async doSignatureHelp(document: TextDocument, position: Position): Promise<SignatureHelp | null> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let signHelp = jsLanguageService.getSignatureHelpItems(document.uri, document.offsetAt(position), undefined);
        if (signHelp) {
            let ret: SignatureHelp = {
                activeSignature: signHelp.selectedItemIndex,
                activeParameter: signHelp.argumentIndex,
                signatures: []
            };
            signHelp.items.forEach(item => {

                let signature: SignatureInformation = {
                    label: '',
                    documentation: undefined,
                    parameters: []
                };

                signature.label += ts.displayPartsToString(item.prefixDisplayParts);
                item.parameters.forEach((p, i, a) => {
                    let label = ts.displayPartsToString(p.displayParts);
                    let parameter: ParameterInformation = {
                        label: label,
                        documentation: ts.displayPartsToString(p.documentation)
                    };
                    signature.label += label;
                    signature.parameters!.push(parameter);
                    if (i < a.length - 1) {
                        signature.label += ts.displayPartsToString(item.separatorDisplayParts);
                    }
                });
                signature.label += ts.displayPartsToString(item.suffixDisplayParts);
                ret.signatures.push(signature);
            });
            return ret;
        }
        return null;
    }
    async doRename(document: TextDocument, position: Position, newName: string): Promise<WorkspaceEdit | null> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        const jsDocumentPosition = document.offsetAt(position);
        const { canRename } = jsLanguageService.getRenameInfo(document.uri, jsDocumentPosition);
        if (!canRename) {
            return null;
        }
        const renameInfos = jsLanguageService.findRenameLocations(document.uri, jsDocumentPosition, false, false);

        const edits: TextEdit[] = [];
        renameInfos?.map(renameInfo => {
            edits.push({
                range: convertRange(document, renameInfo.textSpan),
                newText: newName,
            });
        });

        return {
            changes: { [document.uri]: edits },
        };
    }
    async findDocumentHighlight(document: TextDocument, position: Position): Promise<DocumentHighlight[]> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        const highlights = jsLanguageService.getDocumentHighlights(document.uri, document.offsetAt(position), [document.uri]);
        const out: DocumentHighlight[] = [];
        for (const entry of highlights || []) {
            for (const highlight of entry.highlightSpans) {
                out.push({
                    range: convertRange(document, highlight.textSpan),
                    kind: highlight.kind === 'writtenReference' ? DocumentHighlightKind.Write : DocumentHighlightKind.Text
                });
            }
        }
        return out;
    }
    async findDocumentSymbols(document: TextDocument): Promise<SymbolInformation[]> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let items = jsLanguageService.getNavigationBarItems(document.uri);
        if (items) {
            let result: SymbolInformation[] = [];
            let existing = Object.create(null);
            let collectSymbols = (item: ts.NavigationBarItem, containerLabel?: string) => {
                let sig = item.text + item.kind + item.spans[0].start;
                if (item.kind !== 'script' && !existing[sig]) {
                    let symbol: SymbolInformation = {
                        name: item.text,
                        kind: convertSymbolKind(item.kind),
                        location: {
                            uri: document.uri,
                            range: convertRange(document, item.spans[0])
                        },
                        containerName: containerLabel
                    };
                    existing[sig] = true;
                    result.push(symbol);
                    containerLabel = item.text;
                }

                if (item.childItems && item.childItems.length > 0) {
                    for (let child of item.childItems) {
                        collectSymbols(child, containerLabel);
                    }
                }

            };

            items.forEach(item => collectSymbols(item));
            return result;
        }
        return [];
    }
    async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let definition = jsLanguageService.getDefinitionAtPosition(document.uri, document.offsetAt(position));
        if (definition && definition.length > 0) {
            let d = definition[0];
            if (d.fileName.endsWith(".avt.ts")) {
                d.fileName = d.fileName.replace(".avt.ts", ".avt");
            }
            let realDoc = this.programManager.getProgram(d.fileName, false).getDocument(d.fileName)?.document;
            if (realDoc) {
                return {
                    uri: realDoc.uri,
                    range: convertRange(realDoc, d.textSpan)
                };
            }
        }
        return null;
    }
    async findReferences(document: TextDocument, position: Position): Promise<Location[]> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let references = jsLanguageService.getReferencesAtPosition(document.uri, document.offsetAt(position));
        if (references) {
            return references.filter(d => d.fileName === document.uri).map(d => {
                return {
                    uri: document.uri,
                    range: convertRange(document, d.textSpan)
                };
            });
        }
        return [];
    }
    async getSelectionRange(document: TextDocument, position: Position): Promise<SelectionRange> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        function convertSelectionRange(selectionRange: ts.SelectionRange): SelectionRange {
            const parent = selectionRange.parent ? convertSelectionRange(selectionRange.parent) : undefined;
            return SelectionRange.create(convertRange(document, selectionRange.textSpan), parent);
        }
        const range = jsLanguageService.getSmartSelectionRange(document.uri, document.offsetAt(position));
        return convertSelectionRange(range);
    }
    async format(document: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();

        let start = document.offsetAt(range.start);
        let end = document.offsetAt(range.end);
        let lastLineRange: null | Range = null;
        if (range.end.line > range.start.line && (range.end.character === 0 || isWhitespaceOnly(document.getText().substr(end - range.end.character, range.end.character)))) {
            end -= range.end.character;
            lastLineRange = Range.create(Position.create(range.end.line, 0), range.end);
        }
        let edits = jsLanguageService.getFormattingEditsForRange(document.uri, start, end, formatingOptions);
        if (edits) {
            let result: TextEdit[] = [];
            for (let edit of edits) {
                if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
                    result.push({
                        range: convertRange(document, edit.span),
                        newText: edit.newText
                    });
                }
            }
            if (lastLineRange) {
                result.push({
                    range: lastLineRange,
                    newText: generateIndent(0, formatParams)
                });
            }
            return result;
        }
        return [];
    }
    async getFoldingRanges(document: TextDocument): Promise<FoldingRange[]> {
        const jsLanguageService = this.programManager.getProgram(document).getLanguageService();
        let spans = jsLanguageService.getOutliningSpans(document.uri);
        let ranges: FoldingRange[] = [];
        for (let span of spans) {
            let curr = convertRange(document, span.textSpan);
            let startLine = curr.start.line;
            let endLine = curr.end.line;
            if (startLine < endLine) {
                let foldingRange: FoldingRange = { startLine, endLine };
                let match = document.getText(curr).match(/^\s*\/(?:(\/\s*#(?:end)?region\b)|(\*|\/))/);
                if (match) {
                    foldingRange.kind = match[1] ? FoldingRangeKind.Region : FoldingRangeKind.Comment;
                }
                ranges.push(foldingRange);
            }
        }
        return ranges;
    }
    mustBeRemoved(document: TextDocument) {
        this.programManager.getProgram(document).removeDocument(document);
        delete this.listFiles[document.uri];
    }
    compile(document: TextDocument) {
        this.programManager.getProgram(document).compile(document.uri);
    }
    dispose() {
        this.programManager.dispose();
    }
}