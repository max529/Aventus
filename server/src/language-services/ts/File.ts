import { existsSync, readFileSync } from "fs";
import { Diagnostic } from "vscode-languageserver";
import { AventusExtension, AventusType } from "../../definition";
import { AventusFile } from "../../FilesManager";
import { Build } from "../../project/Build";
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

    public constructor(file: AventusFile, build: Build) {
        super(file, build);
        if (this.mustBeAddedToLanguageService()) {
            this.tsLanguageService.addFile(this);
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
            doc: '',
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
            compileResult.doc = readFileSync(definitionPath, 'utf8');
        }

        this._compileResult = compileResult;
        if (triggerRebuild) {
            this.build.build()
        }
    }
    protected mustBeAddedToLanguageService() {
        return true;
    }
}