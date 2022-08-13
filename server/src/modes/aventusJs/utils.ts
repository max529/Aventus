import { normalize } from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    CompletionItemKind,
    Range,
    SymbolKind,
    FormattingOptions,
} from 'vscode-languageserver/node';


//#region utils
export const JS_WORD_REGEX = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

export function simplifyPath(importPathTxt, currentPath) {
    let currentDir = decodeURIComponent(currentPath).replace("file:///", "").split("/");
    currentDir.pop();
    let currentDirPath = normalize(currentDir.join("/")).split("\\");
    let importPath = normalize(currentDir.join("/") + "/" + importPathTxt).split("\\");
    for (let i = 0; i < currentDirPath.length; i++) {
        if (importPath.length > i) {
            if (currentDirPath[i] == importPath[i]) {
                currentDirPath.splice(i, 1);
                importPath.splice(i, 1);
                i--;
            }
            else{
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
export function convertRange(document: TextDocument, span: { start: number | undefined; length: number | undefined }): Range {
    if (typeof span.start === 'undefined') {
        const pos = document.positionAt(0);
        return Range.create(pos, pos);
    }
    const startPosition = document.positionAt(span.start);
    const endPosition = document.positionAt(span.start + (span.length || 0));
    return Range.create(startPosition, endPosition);
}

export function convertKind(kind: string): CompletionItemKind {
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

export function convertSymbolKind(kind: string): SymbolKind {
    switch (kind) {
        case Kind.module: return SymbolKind.Module;
        case Kind.class: return SymbolKind.Class;
        case Kind.enum: return SymbolKind.Enum;
        case Kind.enumMember: return SymbolKind.EnumMember;
        case Kind.interface: return SymbolKind.Interface;
        case Kind.indexSignature: return SymbolKind.Method;
        case Kind.callSignature: return SymbolKind.Method;
        case Kind.method: return SymbolKind.Method;
        case Kind.memberVariable: return SymbolKind.Property;
        case Kind.memberGetAccessor: return SymbolKind.Property;
        case Kind.memberSetAccessor: return SymbolKind.Property;
        case Kind.variable: return SymbolKind.Variable;
        case Kind.let: return SymbolKind.Variable;
        case Kind.const: return SymbolKind.Variable;
        case Kind.localVariable: return SymbolKind.Variable;
        case Kind.alias: return SymbolKind.Variable;
        case Kind.function: return SymbolKind.Function;
        case Kind.localFunction: return SymbolKind.Function;
        case Kind.constructSignature: return SymbolKind.Constructor;
        case Kind.constructorImplementation: return SymbolKind.Constructor;
        case Kind.typeParameter: return SymbolKind.TypeParameter;
        case Kind.string: return SymbolKind.String;
        default: return SymbolKind.Variable;
    }
}



export function generateIndent(level: number, options: FormattingOptions) {
    if (options.insertSpaces) {
        return repeat(' ', level * options.tabSize);
    } else {
        return repeat('\t', level);
    }
}

export function getWordAtText(text: string, offset: number, wordDefinition: RegExp): { start: number; length: number } {
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

const CR = '\r'.charCodeAt(0);
const NL = '\n'.charCodeAt(0);
export function isNewlineCharacter(charCode: number) {
    return charCode === CR || charCode === NL;
}
export function isWhitespaceOnly(str: string) {
    return /^\s*$/.test(str);
}
export function repeat(value: string, count: number) {
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


export function pathToUri(path: string): string {
    return "file:///" + path.replace(":", "%3A").replace(/\\/g, '/');
}
export function uriToPath(uri: string): string {
    return decodeURIComponent(uri.replace("file:///", ""));
}
//#endregion

export function getFolder(uri: string) {
    let arr = uri.split("/");
    arr.pop();
    return arr.join("/");
}