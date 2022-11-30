import { existsSync, readFileSync } from "fs";
import { Diagnostic } from "vscode-languageserver";
import { AventusExtension, AventusType } from "../../definition";
import { AventusFile } from '../../files/AventusFile';
import { Build } from "../../project/Build";
import { createErrorTsPos } from '../../tools';
import { Module } from '../../ts-file-parser';
import { parseDocument } from '../../ts-file-parser/src/tsStructureParser';
import { AventusBaseFile } from "../BaseFile";
import { TsCompileResult } from "./compiler";




export abstract class AventusTsFile extends AventusBaseFile {


    public get tsLanguageService() {
        return this.build.tsLanguageService;
    }
    private _compileResult: TsCompileResult = this.getDefaultCompileResult();
    public get compileResult() {
        return this._compileResult;
    }
    protected diagnostics: Diagnostic[] = [];

    protected abstract get extension(): string;
    public fileParsed: Module;

    public get contentForLanguageService() { return this._contentForLanguageService }
    private _contentForLanguageService: string = '';

    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        this.fileParsed = { namespaces: [], variables: [], functions: [], classes: [], aliases: [], enumDeclarations: [], imports: {}, _imports: [], name: file.path };
        if (this.mustBeAddedToLanguageService()) {
            this.tsLanguageService.addFile(this);
        }
    }

    protected refreshFileParsed(replaceNamespace: boolean = true): void {
        this.fileParsed = parseDocument(this.file.document);
        this._contentForLanguageService = this.file.document.getText();
        if (replaceNamespace) {

            for (let _namespace of this.fileParsed.namespaces) {
                let diff = _namespace.body.start - _namespace.start;
                let empty = "";
                for (let i = 0; i < diff; i++) { empty += " " }
                let firstPart = this._contentForLanguageService.substring(0, _namespace.start);
                let lastPart = this._contentForLanguageService.substring(_namespace.body.start, this._contentForLanguageService.length);
                this._contentForLanguageService = firstPart + empty + lastPart;

                diff = _namespace.end - _namespace.body.end;
                empty = "";
                for (let i = 0; i < diff; i++) { empty += " " }
                firstPart = this._contentForLanguageService.substring(0, _namespace.body.end);
                lastPart = this._contentForLanguageService.substring(_namespace.end, this._contentForLanguageService.length);
                this._contentForLanguageService = firstPart + empty + lastPart;
            }
        }
    }


    /**
     * check type for element inside file and add error into this.diagnostics
     * @param rules 
     * @returns 
     */
    protected validateRules(rules: { class_extend?: string[], class_implement?: string[], interface?: string[], enum?: string[], alias?: string[] }): void {
        const struct = this.fileParsed;
        if (rules.class_extend || rules.class_implement || rules.interface) {

            if (!rules.class_extend) { rules.class_extend = [] }
            if (!rules.class_implement) { rules.class_implement = [] }
            if (!rules.interface) { rules.interface = [] }

            for (let classTemp of struct.classes) {

                if (classTemp.isInterface) {
                    let foundInterface = rules.interface.length == 0;
                    for (let extend of classTemp.extends) {
                        if (rules.interface.indexOf(extend.typeName) != -1) {
                            foundInterface = true;
                            break;
                        }
                    }
                    if (!foundInterface) {
                        this.diagnostics.push(createErrorTsPos(this.file.document, 'Interface ' + classTemp.name + ' must extend ' + rules.interface.join(" or "), classTemp.start, classTemp.end));
                    }
                }
                else {
                    let foundClassExtend = rules.class_extend.length == 0;
                    let foundClassImplement = rules.class_implement.length == 0;
                    for (let implement of classTemp.implements) {
                        if (rules.class_implement.indexOf(implement.typeName) != -1) {
                            foundClassImplement = true;
                            break;
                        }
                    }
                    for (let extend of classTemp.extends) {
                        if (rules.class_extend.indexOf(extend.typeName) != -1) {
                            foundClassExtend = true;
                            break;
                        }
                    }
                    if (!foundClassImplement) {
                        this.diagnostics.push(createErrorTsPos(this.file.document, 'Class ' + classTemp.name + ' must implement ' + rules.class_implement.join(" or "), classTemp.start, classTemp.end));
                    }
                    if (!foundClassExtend) {
                        this.diagnostics.push(createErrorTsPos(this.file.document, 'Class ' + classTemp.name + ' must extend ' + rules.class_extend.join(" or "), classTemp.start, classTemp.end));
                    }
                }
            }
        }
        if (rules.enum) {
            for (let enumTemp of struct.enumDeclarations) {
                let foundData = false;
                for (let extend of enumTemp.extends) {
                    if (rules.enum.indexOf(extend.typeName) != -1) {
                        foundData = true;
                        break;
                    }
                }
                if (!foundData) {
                    this.diagnostics.push(createErrorTsPos(this.file.document, 'Enum must extends ' + rules.enum.join(" or "), enumTemp.start, enumTemp.end));
                }
            }
        }
        if (rules.alias) {
            for (let aliasTemp of struct.aliases) {
                let foundData = false;
                for (let extend of aliasTemp.extends) {
                    if (rules.alias.indexOf(extend.typeName) != -1) {
                        foundData = true;
                        break;
                    }
                }
                if (!foundData) {
                    this.diagnostics.push(createErrorTsPos(this.file.document, 'Alias must extends ' + rules.alias.join(" or "), aliasTemp.start, aliasTemp.end));
                }
            }
        }
    }

    protected override async onDelete() {
        if (this.mustBeAddedToLanguageService()) {
            this.tsLanguageService.removeFile(this);
        }
    }

    protected getDefaultCompileResult(): TsCompileResult {
        return {
            nameCompiled: [],
            nameDoc: [],
            src: '',
            docVisible: '',
            docInvisible: '',
            dependances: []
        }
    }
    protected setCompileResult(compileResult: TsCompileResult) {
        let triggerRebuild = false;
        if (compileResult.src != this.compileResult.src) {
            triggerRebuild = true;
        }
        // if we write manually the filedoc, use it
        let currentPath = this.file.path;
        let definitionPath = currentPath.replace(this.extension, AventusExtension.Definition);
        if (definitionPath.endsWith(AventusExtension.Definition) && existsSync(definitionPath)) {
            // #TODO improve loading for manual def
            compileResult.docVisible = readFileSync(definitionPath, 'utf8').replace(/declare global \{((\s|\S)*)\}/gm, '$1');
            compileResult.docInvisible = '';
        }

        this._compileResult = compileResult;
        if (triggerRebuild) {
            this.build.build()
        }
    }
    protected mustBeAddedToLanguageService() {
        return true;
    }

    protected onGetBuild(): Build[] {
        return [this.build]
    }

}