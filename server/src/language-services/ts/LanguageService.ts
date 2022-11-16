import { EOL } from 'os';
import { normalize, sep } from 'path';
import { CodeFixAction, CompilerOptions, CompletionInfo, createLanguageService, Diagnostic as DiagnosticTs, displayPartsToString, Extension, flattenDiagnosticMessageText, FormatCodeSettings, GetCompletionsAtPositionOptions, IndentStyle, JsxEmit, LanguageService, LanguageServiceHost, ModuleResolutionKind, ResolvedModule, ResolvedModuleFull, resolveModuleName, ScriptKind, ScriptTarget, SemicolonPreference, transpile, WithMetadata } from 'typescript';
import { CodeAction, CompletionItem, CompletionItemKind, CompletionList, Definition, Diagnostic, DiagnosticSeverity, FormattingOptions, Hover, Position, Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import { AventusExtension, AventusLanguageId } from '../../definition';
import { AventusFile } from '../../FilesManager';
import { Build } from '../../project/Build';
import { convertRange } from '../../tools';
import { AventusTsFile } from './File';
import { loadLibrary } from './libLoader';


export class AventusTsLanguageService {
    private languageService: LanguageService;
    private languageServiceNamespace: LanguageService;
    private build: Build;
    private filesNeeded: string[] = ['custom://@types/luxon/index.d.ts'];
    private filesLoaded: { [uri: string]: AventusTsFile } = {}

    public constructor(build: Build) {
        this.build = build;
        this.languageService = createLanguageService(this.createHost());
        this.languageServiceNamespace = createLanguageService(this.createHostNamespace());
    }

    private createHostNamespace(): LanguageServiceHost {
        const host: LanguageServiceHost = {
            getCompilationSettings: () => compilerOptions,
            getScriptFileNames: () => {
                return this.filesNeeded
            },
            getScriptKind: (fileName) => {
                return ScriptKind.TS;
            },
            getScriptVersion: (fileName: string) => {
                if (this.filesLoaded[fileName]) {
                    return String(this.filesLoaded[fileName].file.version);
                }
                return '1';
            },
            getScriptSnapshot: (fileName: string) => {
                let text = '';
                if (this.filesLoaded[fileName]) {
                    text = this.filesLoaded[fileName].file.content;
                } else {
                    text = loadLibrary(fileName);
                }
                return {
                    getText: (start, end) => text?.substring(start, end) || '',
                    getLength: () => text?.length || 0,
                    getChangeRange: () => undefined
                };
            },
            getCurrentDirectory: () => '',
            getDefaultLibFileName: (_options: CompilerOptions) => 'es2022.full',
            readFile: (fileName: string, _encoding?: string | undefined): string | undefined => {
                if (this.filesLoaded[fileName]) {
                    return this.filesLoaded[fileName].file.content;
                } else {
                    return loadLibrary(fileName);
                }
            },
            fileExists: (fileName: string): boolean => {
                if (fileName.endsWith(AventusExtension.Base + ".ts")) {
                    fileName = fileName.replace(AventusExtension.Base + ".ts", AventusExtension.Base);
                }
                if (this.filesLoaded[fileName]) {
                    return true;
                } else {
                    return !!loadLibrary(fileName);
                }
            },
            directoryExists: (path: string): boolean => {
                // typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
                // there's no node_modules in our setup
                if (path.startsWith('node_modules')) {
                    return false;
                }
                return true;
            },
            resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, options, containingSourceFile?) {
                const resolvedModules: ResolvedModule[] = [];
                for (const moduleName of moduleNames) {
                    let result = resolveModuleName(moduleName, containingFile, compilerOptions, this)
                    if (result.resolvedModule) {
                        if (result.resolvedModule.resolvedFileName.endsWith(".avt.ts")) {
                            result.resolvedModule.resolvedFileName = result.resolvedModule.resolvedFileName.replace(".avt.ts", ".avt");
                        }
                        resolvedModules.push(result.resolvedModule);
                    }
                    else {
                        let temp: ResolvedModuleFull = {
                            extension: Extension.Ts,
                            resolvedFileName: moduleName,
                        }
                        resolvedModules.push(temp);
                    }
                }
                return resolvedModules;
            },
        };
        return host;
    }
    private createHost(): LanguageServiceHost {
        const host: LanguageServiceHost = {
            getCompilationSettings: () => compilerOptions,
            getScriptFileNames: () => {
                return this.filesNeeded
            },
            getScriptKind: (fileName) => {
                return ScriptKind.TS;
            },
            getScriptVersion: (fileName: string) => {
                if (this.filesLoaded[fileName]) {
                    return String(this.filesLoaded[fileName].file.version);
                }
                return '1';
            },
            getScriptSnapshot: (fileName: string) => {
                let text = '';
                if (this.filesLoaded[fileName]) {
                    text = this.filesLoaded[fileName].contentForLanguageService;
                } else {
                    text = loadLibrary(fileName);
                }
                return {
                    getText: (start, end) => text?.substring(start, end) || '',
                    getLength: () => text?.length || 0,
                    getChangeRange: () => undefined
                };
            },
            getCurrentDirectory: () => '',
            getDefaultLibFileName: (_options: CompilerOptions) => 'es2022.full',
            readFile: (fileName: string, _encoding?: string | undefined): string | undefined => {
                if (this.filesLoaded[fileName]) {
                    return this.filesLoaded[fileName].contentForLanguageService;
                } else {
                    return loadLibrary(fileName);
                }
            },
            fileExists: (fileName: string): boolean => {
                if (fileName.endsWith(AventusExtension.Base + ".ts")) {
                    fileName = fileName.replace(AventusExtension.Base + ".ts", AventusExtension.Base);
                }
                if (this.filesLoaded[fileName]) {
                    return true;
                } else {
                    return !!loadLibrary(fileName);
                }
            },
            directoryExists: (path: string): boolean => {
                // typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
                // there's no node_modules in our setup
                if (path.startsWith('node_modules')) {
                    return false;
                }
                return true;
            },
            resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, options, containingSourceFile?) {
                const resolvedModules: ResolvedModule[] = [];
                for (const moduleName of moduleNames) {
                    let result = resolveModuleName(moduleName, containingFile, compilerOptions, this)
                    if (result.resolvedModule) {
                        if (result.resolvedModule.resolvedFileName.endsWith(".avt.ts")) {
                            result.resolvedModule.resolvedFileName = result.resolvedModule.resolvedFileName.replace(".avt.ts", ".avt");
                        }
                        resolvedModules.push(result.resolvedModule);
                    }
                    else {
                        let temp: ResolvedModuleFull = {
                            extension: Extension.Ts,
                            resolvedFileName: moduleName,
                        }
                        resolvedModules.push(temp);
                    }
                }
                return resolvedModules;
            },
        };
        return host;
    }

    public addFile(tsFile: AventusTsFile) {
        if (this.filesNeeded.indexOf(tsFile.file.uri) == -1) {
            this.filesNeeded.push(tsFile.file.uri);
            this.filesLoaded[tsFile.file.uri] = tsFile;
        }
    }
    public removeFile(tsFile: AventusTsFile) {
        let index = this.filesNeeded.indexOf(tsFile.file.uri);
        if (index != -1) {
            this.filesNeeded.splice(index, 1);
            delete this.filesLoaded[tsFile.file.uri];
        }
    }


    public doValidation(file: AventusFile): Diagnostic[] {
        let result: Diagnostic[] = [];
        const syntaxDiagnostics: DiagnosticTs[] = this.languageService.getSyntacticDiagnostics(file.uri);
        const semanticDiagnostics: DiagnosticTs[] = this.languageService.getSemanticDiagnostics(file.uri);
        result = syntaxDiagnostics.concat(semanticDiagnostics).map((diag: DiagnosticTs): Diagnostic => {
            return {
                range: convertRange(file.document, diag),
                severity: DiagnosticSeverity.Error,
                source: AventusLanguageId.TypeScript,
                message: flattenDiagnosticMessageText(diag.messageText, '\n'),
            };
        });
        return result;
    }

    public async doComplete(file: AventusFile, position: Position): Promise<CompletionList> {
        try {
            let document = file.document;

            let offset = document.offsetAt(position);
            let replaceRange = convertRange(document, getWordAtText(document.getText(), offset, JS_WORD_REGEX));
            let completions: WithMetadata<CompletionInfo> | undefined;
            try {
                completions = this.languageService.getCompletionsAtPosition(document.uri, offset, completionOptions);
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
                    languageId: AventusLanguageId.TypeScript,
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

    public async doResolve(item: CompletionItem): Promise<CompletionItem> {
        if (item.data) {
            let tsFile = this.build.tsFiles[item.data.uri];
            if (tsFile != null) {
                let myData = {
                    languageId: item.data.languageIdJs,
                    offset: item.data.offset,
                    uri: item.data.uri
                }
                delete item.data.languageId;
                delete item.data.offset;
                delete item.data.uri;
                if (Object.keys(item.data).length == 0) {
                    item.data = undefined
                }

                let details = this.languageService.getCompletionEntryDetails(
                    myData.uri,
                    myData.offset,
                    item.label,
                    {},
                    tsFile.file.content,
                    completionOptions,
                    item.data);

                if (details) {
                    item.detail = displayPartsToString(details.displayParts);
                    item.documentation = displayPartsToString(details.documentation);
                    item.additionalTextEdits = [];
                    if (details.codeActions) {
                        for (let i = 0; i < details.codeActions.length; i++) {
                            for (let change of details.codeActions[i].changes) {
                                for (let txtChange of change.textChanges) {
                                    txtChange.newText = txtChange.newText.replace(/'/g, '"');
                                    let newImport = /"(.*)"/g.exec(txtChange.newText);
                                    if (newImport && newImport.length > 1) {
                                        let finalPath = simplifyPath(newImport[1], tsFile.file.uri);
                                        item.detail += "\r\nimport from " + finalPath;
                                        txtChange.newText = txtChange.newText.replace(newImport[1], finalPath);
                                    }

                                    item.additionalTextEdits.push({
                                        newText: txtChange.newText,
                                        range: convertRange(tsFile.file.document, txtChange.span)
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

    public async doHover(file: AventusFile, position: Position): Promise<Hover | null> {
        let info = this.languageService.getQuickInfoAtPosition(file.uri, file.document.offsetAt(position));
        if (info) {
            let textDoc: string[] = []
            if (info.documentation) {
                for (let doc of info.documentation) {
                    textDoc.push(doc.text);
                }
            }
            const contents = displayPartsToString(info.displayParts);
            return {
                range: convertRange(file.document, info.textSpan),
                contents: [contents, textDoc.join(EOL)].join(EOL)
            };
        }
        return null;
    }

    public async findDefinition(file: AventusFile, position: Position): Promise<Definition | null> {
        let definition = this.languageService.getDefinitionAtPosition(file.uri, file.document.offsetAt(position));
        if (definition && definition.length > 0) {
            let d = definition[0];
            if (d.fileName.endsWith(".avt.ts")) {
                d.fileName = d.fileName.replace(".avt.ts", ".avt");
            }
            let realDoc = this.filesLoaded[d.fileName];
            if (realDoc) {
                return {
                    uri: realDoc.file.uri,
                    range: convertRange(realDoc.file.document, d.textSpan)
                };
            }
        }
        return null;
    }
    public async format(file: AventusFile, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> {
        let document = file.document;
        let start = document.offsetAt(range.start);
        let end = document.offsetAt(range.end);
        let lastLineRange: null | Range = null;
        if (range.end.line > range.start.line && (range.end.character === 0 || isWhitespaceOnly(document.getText().substr(end - range.end.character, range.end.character)))) {
            end -= range.end.character;
            lastLineRange = Range.create(Position.create(range.end.line, 0), range.end);
        }
        let options = { ...formatingOptions };

        let edits = this.languageServiceNamespace.getFormattingEditsForRange(document.uri, start, end, options);
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
    public async doCodeAction(file: AventusFile, range: Range): Promise<CodeAction[]> {
        let document = file.document;
        let result: CodeAction[] = [];
        const syntaxDiagnostics: DiagnosticTs[] = this.languageService.getSyntacticDiagnostics(document.uri);
        const semanticDiagnostics: DiagnosticTs[] = this.languageService.getSemanticDiagnostics(document.uri);
        let codes: number[] = [];
        for (let diag of syntaxDiagnostics) {
            codes.push(diag.code)
        }
        for (let diag of semanticDiagnostics) {
            codes.push(diag.code)
        }
        let actions: readonly CodeFixAction[] = [];
        try {
            actions = this.languageService.getCodeFixesAtPosition(document.uri, document.offsetAt(range.start), document.offsetAt(range.end), codes, formatingOptions, completionOptions);
        } catch (e) {

        }
        for (let action of actions) {
            let changes: TextEdit[] = [];
            let workspaceEdit: WorkspaceEdit = {
                changes: {
                    [document.uri]: changes
                }
            }
            for (let change of action.changes) {
                for (let textChange of change.textChanges) {
                    if (action.description.startsWith("Add import from")) {
                        textChange.newText = textChange.newText.replace(/'/g, '"');
                        let newImport = /"(.*)"/g.exec(textChange.newText);
                        if (newImport && newImport.length > 1) {
                            let finalPath = simplifyPath(newImport[1], document.uri);
                            action.description = "Add import from " + finalPath;
                            textChange.newText = textChange.newText.replace(newImport[1], finalPath);
                        }
                    }
                    else if (action.fixName === "fixClassDoesntImplementInheritedAbstractMember") {
                        let index = getSectionStart(file, "methods")
                        if (index != -1) {
                            textChange.span.start = index;
                        }
                    }
                    changes.push({
                        newText: textChange.newText,
                        range: convertRange(document, textChange.span),
                    })
                }
            }

            result.push({
                title: action.description,
                // command:action.commands,
                edit: workspaceEdit,
            })
        }
        return result;
    }




    public static compileTs(txt: string, namespace: string): { compiled: string, doc: string } {
        let result = {
            compiled: "",
            doc: ""
        }

        result.compiled = transpile(txt, compilerOptions);
        let doc = this.compileDocTs(txt);
        if (namespace.length > 0) {
            result.doc += "namespace " + namespace + " {\r\n" + doc + "}\r\n";
        }
        else {
            result.doc += doc;
        }
        return result;
    }

    public static compileDocTs(txt: string) {
        const host: LanguageServiceHost = {
            getCompilationSettings: () => {
                return {
                    allowJs: true,
                    declaration: true
                }
            },
            getScriptFileNames: () => ["temp.js"],
            getScriptKind: (fileName) => {
                return ScriptKind.TS;
            },
            getScriptVersion: (fileName: string) => {
                return '1';
            },
            getScriptSnapshot: (fileName: string) => {
                let text = txt;
                return {
                    getText: (start, end) => text?.substring(start, end) || '',
                    getLength: () => text?.length || 0,
                    getChangeRange: () => undefined
                };
            },
            getCurrentDirectory: () => '',
            getDefaultLibFileName: (_options: CompilerOptions) => '',
            readFile: (path: string, _encoding?: string | undefined): string | undefined => {
                return txt;
            },
            fileExists: (path: string): boolean => {
                return true;
            },
            directoryExists: (path: string): boolean => {
                // typescript tries to first find libraries in node_modules/@types and node_modules/@typescript
                // there's no node_modules in our setup
                if (path.startsWith('node_modules')) {
                    return false;
                }
                return true;

            },

        };
        let ls: LanguageService = createLanguageService(host);
        return ls.getEmitOutput("temp.js", true, true).outputFiles[0].text;
    }
    public static getCompilerOptions(): CompilerOptions {
        return compilerOptions;
    }
}

//#region definition const + tools function

const JS_WORD_REGEX = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

const compilerOptions: CompilerOptions = {
    allowNonTsExtensions: true,
    jsx: JsxEmit.None,
    importHelpers: false,
    allowJs: true,
    checkJs: false,
    lib: ['lib.es2022.full.d.ts'],
    target: ScriptTarget.ES2022,
    moduleResolution: ModuleResolutionKind.Classic,
    experimentalDecorators: true,
    noImplicitOverride: true,
    strictPropertyInitialization: true,
    noImplicitReturns: true,
};
const completionOptions: GetCompletionsAtPositionOptions = {
    includeExternalModuleExports: true,
    includeInsertTextCompletions: true,
    includeCompletionsWithClassMemberSnippets: true,
    includeAutomaticOptionalChainCompletions: true,
    includeCompletionsForImportStatements: true,
    includeCompletionsForModuleExports: true,
    includeCompletionsWithInsertText: true,
    // includeCompletionsWithObjectLiteralMethodSnippets:true, => create double 
    // includeCompletionsWithSnippetText:true, => $0 appear in fct
    includeInlayEnumMemberValueHints: true,
    includeInlayFunctionLikeReturnTypeHints: true,
    includeInlayFunctionParameterTypeHints: true,
    includeInlayParameterNameHints: "all",
    includeInlayParameterNameHintsWhenArgumentMatchesName: true,
    includeInlayPropertyDeclarationTypeHints: true,
    //includeInlayVariableTypeHints:true,
    useLabelDetailsInCompletionEntries: true,
    importModuleSpecifierEnding: "index",
    importModuleSpecifierPreference: "relative",
}
const formatingOptions: FormatCodeSettings = {
    convertTabsToSpaces: true,
    tabSize: 4,
    indentSize: 4,
    indentStyle: IndentStyle.Smart,
    newLineCharacter: '\n',
    baseIndentSize: 0,
    insertSpaceAfterCommaDelimiter: true,
    insertSpaceAfterConstructor: false,
    insertSpaceAfterSemicolonInForStatements: true,
    insertSpaceBeforeAndAfterBinaryOperators: true,
    insertSpaceAfterKeywordsInControlFlowStatements: false,
    insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
    insertSpaceBeforeFunctionParenthesis: false,
    // insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: true,
    // insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: true,
    // insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    // insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: true,
    // insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: true,
    // insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: true,
    insertSpaceAfterTypeAssertion: true,
    placeOpenBraceOnNewLineForControlBlocks: false,
    placeOpenBraceOnNewLineForFunctions: false,
    semicolons: SemicolonPreference.Insert,
    insertSpaceBeforeTypeAnnotation: false,
}
const enum Kind {
    alias = 'alias',
    callSignature = 'call',
    class = 'class',
    const = 'const',
    constructorImplementation = 'constructor',
    constructSignature = 'construct',
    directory = 'directory',
    enum = 'enum',
    enumMember = 'enum member',
    externalModuleName = 'external module name',
    function = 'function',
    indexSignature = 'index',
    interface = 'interface',
    keyword = 'keyword',
    let = 'let',
    localFunction = 'local function',
    localVariable = 'local var',
    method = 'method',
    memberGetAccessor = 'getter',
    memberSetAccessor = 'setter',
    memberVariable = 'property',
    module = 'module',
    primitiveType = 'primitive type',
    script = 'script',
    type = 'type',
    variable = 'var',
    warning = 'warning',
    string = 'string',
    parameter = 'parameter',
    typeParameter = 'type parameter'
}
function convertKind(kind: string): CompletionItemKind {
    switch (kind) {
        case Kind.primitiveType:
        case Kind.keyword:
            return CompletionItemKind.Keyword;

        case Kind.const:
        case Kind.let:
        case Kind.variable:
        case Kind.localVariable:
        case Kind.alias:
        case Kind.parameter:
            return CompletionItemKind.Variable;

        case Kind.memberVariable:
        case Kind.memberGetAccessor:
        case Kind.memberSetAccessor:
            return CompletionItemKind.Field;

        case Kind.function:
        case Kind.localFunction:
            return CompletionItemKind.Function;

        case Kind.method:
        case Kind.constructSignature:
        case Kind.callSignature:
        case Kind.indexSignature:
            return CompletionItemKind.Method;

        case Kind.enum:
            return CompletionItemKind.Enum;

        case Kind.enumMember:
            return CompletionItemKind.EnumMember;

        case Kind.module:
        case Kind.externalModuleName:
            return CompletionItemKind.Module;

        case Kind.class:
        case Kind.type:
            return CompletionItemKind.Class;

        case Kind.interface:
            return CompletionItemKind.Interface;

        case Kind.warning:
            return CompletionItemKind.Text;

        case Kind.script:
            return CompletionItemKind.File;

        case Kind.directory:
            return CompletionItemKind.Folder;

        case Kind.string:
            return CompletionItemKind.Constant;

        default:
            return CompletionItemKind.Property;
    }
}
function isNewlineCharacter(charCode: number) {
    return charCode === '\r'.charCodeAt(0) || charCode === '\n'.charCodeAt(0);
}
function getWordAtText(text: string, offset: number, wordDefinition: RegExp): { start: number; length: number } {
    let lineStart = offset;
    while (lineStart > 0 && !isNewlineCharacter(text.charCodeAt(lineStart - 1))) {
        lineStart--;
    }
    const offsetInLine = offset - lineStart;
    const lineText = text.substr(lineStart);

    // make a copy of the regex as to not keep the state
    const flags = wordDefinition.ignoreCase ? 'gi' : 'g';
    wordDefinition = new RegExp(wordDefinition.source, flags);

    let match = wordDefinition.exec(lineText);
    while (match && match.index + match[0].length < offsetInLine) {
        match = wordDefinition.exec(lineText);
    }
    if (match && match.index <= offsetInLine) {
        return { start: match.index + lineStart, length: match[0].length };
    }

    return { start: offset, length: 0 };
}
function simplifyPath(importPathTxt, currentPath) {
    importPathTxt = decodeURIComponent(importPathTxt);
    if (importPathTxt.startsWith("custom://")) {
        return importPathTxt;
    }
    let currentDir: string[] = [];
    if (sep === "/") {
        currentDir = decodeURIComponent(currentPath).replace("file://", "").split("/");
    }
    else {
        currentDir = decodeURIComponent(currentPath).replace("file:///", "").split("/");
    }
    currentDir.pop();
    let currentDirPath = normalize(currentDir.join("/")).split("\\");
    let finalImportPath = normalize(currentDir.join("/") + "/" + importPathTxt);
    // TODO: use by WC but maybe we can remove it later
    // let finalImportPathComponent = finalImportPath.replace(AventusExtension.ComponentLogic, AventusExtension.Component);
    // if (wcMode.getDocumentByUri(pathToUri(finalImportPathComponent))) {
    //     finalImportPath = finalImportPathComponent;
    // }
    let importPath = finalImportPath.split("\\");
    for (let i = 0; i < currentDirPath.length; i++) {
        if (importPath.length > i) {
            if (currentDirPath[i] == importPath[i]) {
                currentDirPath.splice(i, 1);
                importPath.splice(i, 1);
                i--;
            }
            else {
                break;
            }
        }
    }
    let finalPathToImport = "";
    for (let i = 0; i < currentDirPath.length; i++) {
        finalPathToImport += '../';
    }
    if (finalPathToImport == "") {
        finalPathToImport += "./";
    }
    finalPathToImport += importPath.join("/");
    return finalPathToImport;
}
function isWhitespaceOnly(str: string) {
    return /^\s*$/.test(str);
}
function generateIndent(level: number, options: FormattingOptions) {
    if (options.insertSpaces) {
        return repeat(' ', level * options.tabSize);
    } else {
        return repeat('\t', level);
    }
}
function repeat(value: string, count: number) {
    let s = '';
    while (count > 0) {
        if ((count & 1) === 1) {
            s += value;
        }
        value += value;
        count = count >>> 1;
    }
    return s;
}
type SectionType = "static" | "props" | "variables" | "states" | "constructor" | "methods";
function getSectionStart(file: AventusFile, sectionName: SectionType): number {
    let regex = new RegExp("//#region " + sectionName + "(\\s|\\S)*?//#endregion")
    let match = regex.exec(file.document.getText());
    if (match) {
        return match.index + 10 + sectionName.length;
    }
    return -1
}
//#endregion