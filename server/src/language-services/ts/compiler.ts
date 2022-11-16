import { existsSync, unlinkSync, writeFileSync } from "fs";
import { pathToUri } from '../../tools';
import { AliasNode, ClassModel, EnumDeclaration } from "../../ts-file-parser";
import { correctTypeInsideDefinition } from '../../ts-file-parser/src/tsDefinitionParser';
import { AventusTsFile } from './File';
import { AventusTsLanguageService } from "./LanguageService";

export interface TsCompileResult {
    nameCompiled: string[],
    nameDoc: string[],
    src: string,
    doc: string,
    dependances: string[]
}

export function genericTsCompile(file: AventusTsFile): TsCompileResult {
    const struct = file.fileParsed;
    let scriptTxt = "";
    let docTxt = "";
    let classesNameSript: string[] = [];
    let classesNameDoc: string[] = [];
    let debugTxt = "";
    let dependances: string[] = [];

    let sectionCompile = (section: ClassModel[] | EnumDeclaration[] | AliasNode[]) => {
        section.forEach(cls => {
            let result = AventusTsLanguageService.compileTs(cls, file);
            scriptTxt += result.compiled;
            docTxt += result.doc;
            debugTxt += result.debugTxt;
            if (result.classScript.length > 0) {
                classesNameSript.push(result.classScript);
            }
            if (result.classDoc.length > 0) {
                classesNameDoc.push(result.classDoc);
            }
            for (let dependance of result.dependances) {
                if (dependances.indexOf(dependance) == -1) {
                    dependances.push(dependance);
                }
            }
        });
    }

    sectionCompile(struct.classes);
    sectionCompile(struct.enumDeclarations);
    sectionCompile(struct.aliases);


    let debugPath = file.file.path.replace(".avt", ".js");
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