import { sep } from "path";
import { flattenDiagnosticMessageText } from 'typescript';
import { Diagnostic, DiagnosticSeverity, ExecuteCommandParams, Range } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AventusLanguageId } from "./definition";
import { SectionType } from './language-services/ts/LanguageService';

export function pathToUri(path: string): string {
    if (path.startsWith("file://")) {
        return path;
    }
    if (sep === "/") {
        return "file://" + encodeURI(path.replace(/\\/g, '/')).replace(":", "%3A");
    }
    return "file:///" + encodeURI(path.replace(/\\/g, '/')).replace(":", "%3A");
}
export function uriToPath(uri: string): string {
    if (sep === "/") {
        // linux system
        return decodeURIComponent(uri.replace("file://", ""));
    }
    return decodeURIComponent(uri.replace("file:///", ""));
}


//#region errors
export function createErrorTs(currentDoc: TextDocument, msg: string): Diagnostic {
    return createErrorTsPos(currentDoc, msg, 0, currentDoc.getText().length)
}
export function createErrorTsSection(currentDoc: TextDocument, msg: string, section: SectionType): Diagnostic {
    let regex = new RegExp("//#region " + section + "(\\s|\\S)*?//#endregion")
    let match = regex.exec(currentDoc.getText());
    if (match) {
        let indexStart = match.index + 10 + section.length;
        let indexEnd = match.index + match[0].length;
        return {
            range: Range.create(currentDoc.positionAt(indexStart), currentDoc.positionAt(indexEnd)),
            severity: DiagnosticSeverity.Error,
            source: AventusLanguageId.TypeScript,
            message: flattenDiagnosticMessageText(msg, '\n')
        }
    }
    return createErrorTs(currentDoc, msg);
}

export function createErrorTsPos(currentDoc: TextDocument, msg: string, start: number, end: number): Diagnostic {
    return {
        range: Range.create(currentDoc.positionAt(start), currentDoc.positionAt(end)),
        severity: DiagnosticSeverity.Error,
        source: AventusLanguageId.TypeScript,
        message: flattenDiagnosticMessageText(msg, '\n')
    }
}

export function createErrorScss(currentDoc: TextDocument, msg: string): Diagnostic {
    return createErrorScssPos(currentDoc, msg, 0, currentDoc.getText().length)
}

export function createErrorScssPos(currentDoc: TextDocument, msg: string, start: number, end: number): Diagnostic {
    return {
        range: Range.create(currentDoc.positionAt(start), currentDoc.positionAt(end)),
        severity: DiagnosticSeverity.Error,
        source: AventusLanguageId.SCSS,
        message: flattenDiagnosticMessageText(msg, '\n')
    }
}
//#endregion


export function getFolder(uri: string) {
    let arr = uri.split("/");
    arr.pop();
    return arr.join("/");
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

export function getPathFromCommandArguments(params: ExecuteCommandParams): string {
    let path = "";
    if (params.arguments) {
        path = "file://" + params.arguments[0].path.replace(":", "%3A");
    }
    return path;
}