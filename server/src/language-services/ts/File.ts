import { existsSync, readFileSync } from "fs";
import { Diagnostic } from "vscode-languageserver";
import { AventusExtension, AventusType } from "../../definition";
import { AventusFile } from "../../FilesManager";
import { Build } from "../../project/Build";
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
                console.log("in")
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