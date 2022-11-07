import { existsSync, unlinkSync, writeFileSync } from "fs";
import { CompilerOptions, createLanguageService, LanguageService, LanguageServiceHost, ScriptKind, transpile } from "typescript";
import { AventusFile } from "../../FilesManager";
import { ClassModel, EnumDeclaration } from "../../ts-file-parser";
import { parseDocument } from "../../ts-file-parser/src/tsStructureParser";
import { AventusTsLanguageService } from "./LanguageService";

export interface TsCompileResult {
    nameCompiled: string[],
    nameDoc: string[],
    src: string,
    doc: string,
    dependances: string[]
}

export function genericTsCompile(file: AventusFile): TsCompileResult {
    let document = file.document;
    const struct = parseDocument(document);
    let scriptTxt = "";
    let docTxt = "";
    let classesNameSript: string[] = [];
    let classesNameDoc: string[] = [];
    let debugTxt = "";
    let dependances: string[] = [];

    struct.classes.forEach(cls => {
        cls.extends.forEach(extension => {
            if (dependances.indexOf(extension.typeName) == -1) {
                dependances.push(extension.typeName);
            }
        })
        let classContent = removeComments(removeDecoratorFromClassContent(cls));
        classContent = replaceFirstExport(classContent);
        let result = AventusTsLanguageService.compileTs(classContent);


        if (result.compiled.length > 0) {
            scriptTxt += result.compiled;
            classesNameSript.push(cls.name);
        }
        if (result.doc.length > 0) {
            docTxt += result.doc;
            classesNameDoc.push(cls.name);
        }
        for (let decorator of cls.decorators) {
            if (decorator.name == "Debugger") {
                if (decorator.arguments.length > 0) {
                    for (let arg of decorator.arguments) {
                        if (arg.writeCompiled) {
                            debugTxt += result.compiled
                        }
                    }
                }
            }
        }
    });
    struct.enumDeclarations.forEach(enm => {
        let enumContent = removeComments(removeDecoratorFromClassContent(enm));
        enumContent = replaceFirstExport(enumContent);
        let result = AventusTsLanguageService.compileTs(enumContent);
        if (result.compiled.length > 0) {
            scriptTxt += result.compiled;
            classesNameSript.push(enm.name);
        }
        if (result.doc.length > 0) {
            classesNameDoc.push(enm.name);
            docTxt += result.doc;
        }
        for (let decorator of enm.decorators) {
            if (decorator.name == "Debugger") {
                if (decorator.arguments.length > 0) {
                    for (let arg of decorator.arguments) {
                        if (arg.writeCompiled) {
                            debugTxt += result.compiled
                        }
                    }
                }
            }
        }
    })
    struct.aliases.forEach(alias => {
        let aliasContent = removeComments(alias.content);
        aliasContent = replaceFirstExport(aliasContent);
        let result = AventusTsLanguageService.compileTs(aliasContent);
        if (result.compiled.length > 0) {
            scriptTxt += result.compiled;
            classesNameSript.push(alias.name);
        }
        if (result.doc.length > 0) {
            classesNameDoc.push(alias.name);
            docTxt += result.doc;
        }
    })

    let debugPath = file.path.replace(".avt", ".js");
    if (debugTxt != "") {
        writeFileSync(debugPath, debugTxt);
    }
    else if (existsSync(debugPath)) {
        unlinkSync(debugPath);
    }
    return {
        nameCompiled: classesNameSript,
        nameDoc: classesNameDoc,
        src: removeWhiteSpaceLines(scriptTxt),
        doc: removeWhiteSpaceLines(docTxt),
        dependances: dependances
    };
}


function removeComments(txt: string): string {
    let regex = /(\".*?\"|\'.*?\')|(\/\*.*?\*\/|\/\/[^(\r\n|\n)]*$)/gm
    txt = txt.replace(regex, (match, grp1, grp2) => {
        if (grp2) {
            return "";
        }
        return grp1;
    })
    return txt;
}
function removeWhiteSpaceLines(txt: string) {
    return txt.replace(/^(?:[\t ]*(?:\r?\n|\r))+/gm, '');
}

function removeDecoratorFromClassContent(cls: ClassModel | EnumDeclaration) {
    let classContent = cls.content.trim();
    cls.decorators.forEach(decorator => {
        classContent = classContent.replace(new RegExp("@" + decorator.name + "\\s*(\\([^)]*\\))?", "g"), "");
    });

    return classContent.trim();
}


function replaceFirstExport(txt: string): string {
    return txt.replace(/^\s*export\s+(class|interface|enum|type|abstract)/m, "$1");
}