import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { EOL } from "os";
import { normalize } from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClientConnection } from '../Connection';
import { AventusExtension, AventusLanguageId } from "../definition";
import { AventusFile, FilesManager, FilesWatcher, InternalAventusFile } from "../FilesManager";
import { AventusHTMLFile } from "../language-services/html/File";
import { AventusHTMLLanguageService } from "../language-services/html/LanguageService";
import { AventusConfigBuild } from "../language-services/json/definition";
import { AventusSCSSFile } from "../language-services/scss/File";
import { AventusSCSSLanguageService } from "../language-services/scss/LanguageService";
import { AventusWebComponentSingleFile } from "../language-services/ts/component/File";
import { AventusDefinitionTsFile } from "../language-services/ts/definition/File";
import { AventusTsFile } from "../language-services/ts/File";
import { AventusTsFileSelector } from '../language-services/ts/FileSelector';
import { AventusTsLanguageService } from "../language-services/ts/LanguageService";
import { AVENTUS_BASE_PATH, AVENTUS_DEF_BASE_PATH } from "../language-services/ts/libLoader";
import { getFolder, pathToUri, uriToPath } from "../tools";
import { ClassModel } from "../ts-file-parser";
import { Project } from "./Project";

export class Build {
    private project: Project;
    private buildConfig: AventusConfigBuild;

    private onNewFileUUID: string;
    private onFileDeleteUUIDs: { [uri: string]: string } = {}

    public scssFiles: { [uri: string]: AventusSCSSFile } = {}
    public tsFiles: { [uri: string]: AventusTsFile } = {}
    public noNamespaceUri: { [uri: string]: boolean } = {};
    public tsDefFiles: { [uri: string]: AventusDefinitionTsFile } = {}
    public htmlFiles: { [uri: string]: AventusHTMLFile } = {}
    public wcFiles: { [uri: string]: AventusWebComponentSingleFile } = {};

    private definitionWebComponentByName: { [name: string]: ClassModel } = {}

    public tsLanguageService: AventusTsLanguageService;
    public scssLanguageService: AventusSCSSLanguageService;
    public htmlLanguageService: AventusHTMLLanguageService;
    private allowBuild: boolean = true;

    public get name() {
        return this.buildConfig.name;
    }

    public constructor(project: Project, buildConfig: AventusConfigBuild) {
        console.log("creating build " + buildConfig.name);
        this.project = project;
        this.buildConfig = buildConfig;
        this.onNewFileUUID = FilesManager.getInstance().onNewFile(this.onNewFile.bind(this));
        this.tsLanguageService = new AventusTsLanguageService(this);
        this.scssLanguageService = new AventusSCSSLanguageService(this);
        this.htmlLanguageService = new AventusHTMLLanguageService(this);

        let outputFiles = this.project.getOutputFiles();
        for (let outputFile of outputFiles) {
            let includeOutput: {
                definition: string,
                src?: string,
                libraryName?: string
            } = {
                definition: normalize(outputFile.replace(".js", AventusExtension.Definition))
            }
            buildConfig.include.splice(0, 0, includeOutput);
        }

        if (!project.isCoreBuild) {
            let includeBase: {
                definition: string,
                src?: string,
                libraryName?: string
            } = {
                definition: AVENTUS_DEF_BASE_PATH
            }
            if (buildConfig.includeBase) {
                includeBase.src = AVENTUS_BASE_PATH;
            }
            // insert aventus as first
            buildConfig.include.splice(0, 0, includeBase);
        }
    }
    public async init() {
        await this.loadFiles();
    }

    public getOutputPath() {
        return this.buildConfig.outputFile;
    }
    public getComponentPrefix() {
        return this.buildConfig.componentPrefix;
    }

    public enableBuild() {
        this.allowBuild = true;
    }
    public disableBuild() {
        this.allowBuild = false;
    }
    //#region build
    private timerBuild: NodeJS.Timeout | undefined = undefined;
    public async rebuildAll() {
        this.allowBuild = false;
        // validate
        for (let uri in this.scssFiles) {
            await this.scssFiles[uri].triggerChange();
        }
        for (let uri in this.htmlFiles) {
            await this.htmlFiles[uri].triggerChange();
        }
        for (let uri in this.tsFiles) {
            await this.tsFiles[uri].triggerChange();
        }
        for (let uri in this.wcFiles) {
            await this.wcFiles[uri].triggerChange();
        }

        for (let uri in this.scssFiles) {
            this.scssFiles[uri].triggerSave();
        }
        for (let uri in this.htmlFiles) {
            this.htmlFiles[uri].triggerSave();
        }
        for (let uri in this.tsFiles) {
            this.tsFiles[uri].triggerSave();
        }
        for (let uri in this.wcFiles) {
            this.wcFiles[uri].triggerSave();
        }
        this.allowBuild = true;
        this.build();
    }
    public build() {
        if (ClientConnection.getInstance().isCLI()) {
            this._build();
        }
        else {
            if (this.timerBuild) {
                clearTimeout(this.timerBuild);
            }
            this.timerBuild = setTimeout(() => {
                this._build();
            }, 300)
        }
    }
    private _build() {
        if (!this.allowBuild) {
            return
        }
        if (ClientConnection.getInstance().isDebug()) {
            console.log("building " + this.buildConfig.name);
        }
        let compiledCode: string[] = [];
        let compiledCodeDoc: string[] = [];
        let compiledCodeNoNamespace: string[] = [];
        let compiledCodeDocNoNamespace: string[] = [];
        let classesName: string[] = [];
        let documents = this.buildOrderFiles();
        let uris: string[] = [];
        for (let doc of documents) {
            uris.push(doc.file.uri);
            for (let className of doc.compileResult.nameCompiled) {
                classesName.push(className);
            }
            if (this.noNamespaceUri[doc.file.uri]) {
                if (doc.compileResult.src != "") {
                    compiledCodeNoNamespace.push(doc.compileResult.src)
                }
                if (doc.compileResult.doc != "") {
                    compiledCodeDocNoNamespace.push(doc.compileResult.doc);
                }
            }
            else {
                if (doc.compileResult.src != "") {
                    compiledCode.push(doc.compileResult.src)
                }
                if (doc.compileResult.doc != "") {
                    compiledCodeDoc.push(doc.compileResult.doc);
                }
            }
        }
        this.buildCode(compiledCode, compiledCodeNoNamespace, classesName)
        if (this.buildConfig.generateDefinition) {
            this.buildDocumentation(compiledCodeDoc, compiledCodeDocNoNamespace)
        }
        else if (existsSync(this.buildConfig.outputFile.replace(".js", ".def.avt"))) {
            unlinkSync(this.buildConfig.outputFile.replace(".js", ".def.avt"));
        }
        ClientConnection.getInstance().sendNotification("aventus/compiled", this.name);
    }
    private buildCode(compiledCode: string[], compiledCodeNoNamespace: string[], classesName: string[]) {
        let finalTxt = '';
        finalTxt += this.buildLoadInclude().join(EOL) + EOL;
        let namespace = this.buildConfig.namespace;
        finalTxt += "var " + namespace + ";(function (" + namespace + ") {\r\n var namespace = '" + namespace + "';\r\n"

        finalTxt += compiledCode.join(EOL) + EOL;
        finalTxt = finalTxt.trim() + EOL;
        let subNamespace: string[] = [];
        if (this.buildConfig.namespace) {
            let namespace = this.buildConfig.namespace;
            for (let className of classesName) {
                if (className != "") {
                    let classNameSplitted = className.split(".");
                    let currentNamespace = "";
                    for (let i = 0; i < classNameSplitted.length - 1; i++) {
                        if (currentNamespace.length == 0) {
                            currentNamespace = classNameSplitted[i]
                        }
                        else {
                            currentNamespace += "." + classNameSplitted[i];
                        }
                        if (subNamespace.indexOf(currentNamespace) == -1) {
                            subNamespace.push(currentNamespace);
                            finalTxt += namespace + "." + subNamespace + "= {};" + EOL;
                        }
                    }
                    let finalName = classNameSplitted[classNameSplitted.length - 1];
                    finalTxt += namespace + "." + className + "=" + finalName + ";" + EOL;
                }
            }
            finalTxt += "})(" + namespace + " || (" + namespace + " = {}));" + EOL;
        }

        finalTxt += compiledCodeNoNamespace.join(EOL) + EOL;
        finalTxt = finalTxt.trim() + EOL;

        let folderPath = getFolder(this.buildConfig.outputFile.replace(/\\/g, "/"));
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }
        writeFileSync(this.buildConfig.outputFile, finalTxt);
    }
    private buildDocumentation(compiledCodeDoc: string[], compiledCodeDocNoNamespace: string[]) {
        let finaltxt = "";
        finaltxt += compiledCodeDoc.join(EOL) + EOL;
        finaltxt = "declare namespace " + this.buildConfig.namespace + "{" + EOL + finaltxt.replace(/declare /g, '') + "}" + EOL;
        finaltxt += compiledCodeDocNoNamespace.join(EOL) + EOL;

        finaltxt = "// version " + this.buildConfig.version + EOL + "// region js //" + EOL + finaltxt;
        finaltxt += "// end region js //" + EOL;
        finaltxt += "// region css //" + EOL;
        finaltxt += JSON.stringify(this.scssLanguageService.getInternalDocumentation()) + EOL;
        finaltxt += "// end region css //" + EOL;
        finaltxt += "// region html //" + EOL;
        finaltxt += JSON.stringify(this.htmlLanguageService.getInternalDocumentation()) + EOL;
        finaltxt += "// end region html //" + EOL;

        writeFileSync(this.buildConfig.outputFile.replace(".js", ".def.avt"), finaltxt);
    }
    private buildLoadInclude() {
        let result: string[] = [];
        for (let include of this.buildConfig.include) {
            if (include.src) {
                let pathToImport = include.src;
                if (include.src.startsWith(".")) {
                    pathToImport = this.project.getConfigFile().path + '/' + include.src;
                }
                let normalizePath = normalize(pathToImport);
                if (existsSync(normalizePath) && statSync(normalizePath).isFile()) {
                    result.push(readFileSync(normalizePath, 'utf8'));
                }
            }
        }
        return result;
    }

    private buildOrderFiles(): AventusTsFile[] {
        let documents: AventusTsFile[] = [];
        let documentsUri: string[] = [];
        // register file to get classname by file
        let docUriByTypes: { [key: string]: string } = {};
        for (let fileUri in this.tsFiles) {
            let names = this.tsFiles[fileUri].compileResult.nameCompiled;
            for (let name of names) {
                docUriByTypes[name] = this.tsFiles[fileUri].file.uri;
            }
        }
        // order all fileinside documents
        const _loadFileImport = (uri: string): number => {
            if (!this.tsFiles[uri]) {
                return -1;
            }
            let currentDoc = this.tsFiles[uri];
            let previousIndex = documentsUri.indexOf(uri);
            if (previousIndex != -1) {
                return previousIndex + 1;
            }


            let insertIndex = 0;
            for (let dependanceName of currentDoc.compileResult.dependances) {
                if (docUriByTypes[dependanceName]) {
                    if (docUriByTypes[dependanceName] != uri) {
                        let indexDep = _loadFileImport(docUriByTypes[dependanceName]);
                        if (indexDep >= 0 && indexDep > insertIndex) {
                            insertIndex = indexDep;
                        }
                    }
                }
            }
            if (documentsUri.indexOf(uri) != -1) {
                console.log("double dependances found for " + uri);
                return -1;
            }
            documents.splice(insertIndex, 0, currentDoc);
            documentsUri.splice(insertIndex, 0, uri);
            return documents.length;

        }
        for (let fileUri in this.tsFiles) {
            _loadFileImport(fileUri);
        }
        return documents;
    }
    //#endregion



    /**
     * Trigger when a new file is detected
     * @param file 
     */
    private async onNewFile(file: AventusFile) {
        if (this.buildConfig.inputPathRegex) {
            if (file.path.match(this.buildConfig.inputPathRegex)) {
                this.registerFile(file);
            }
        }
        if (this.buildConfig.noNamespacePathRegex) {
            if (file.path.match(this.buildConfig.noNamespacePathRegex)) {
                this.registerFile(file);
                this.noNamespaceUri[file.uri] = true;
            }
        }
    }

    /**
     * Load all aventus file needed for this build
     */
    private async loadFiles() {
        this.allowBuild = false;
        if (this.buildConfig.inputPathRegex) {
            let files: AventusFile[] = FilesManager.getInstance().getFilesMatching(this.buildConfig.inputPathRegex);
            for (let file of files) {
                this.registerFile(file);
            }
        }
        if (this.buildConfig.noNamespacePathRegex) {
            let files: AventusFile[] = FilesManager.getInstance().getFilesMatching(this.buildConfig.noNamespacePathRegex);
            for (let file of files) {
                this.registerFile(file);
                this.noNamespaceUri[file.uri] = true;
            }
        }
        for (let include of this.buildConfig.include) {
            let pathToImport = include.definition;
            if (include.definition.startsWith(".")) {
                pathToImport = this.project.getConfigFile().folderPath + '/' + include.definition;
            }
            this.registerDef(pathToImport);
        }
        if (ClientConnection.getInstance().isDebug()) {
            console.log("loaded all files needed");
        }
        this.allowBuild = true;
        await this.rebuildAll();
    }
    /**
     * Register one file inside this build
     * @param file 
     */
    private registerFile(file: AventusFile) {
        if (file.uri.endsWith(AventusExtension.ComponentStyle)) {
            if (!this.scssFiles[file.uri]) {
                this.scssFiles[file.uri] = new AventusSCSSFile(file, this);
                this.registerOnFileDelete(file);
            }
        }
        else if (file.uri.endsWith(AventusExtension.ComponentView)) {
            if (!this.htmlFiles[file.uri]) {
                this.htmlFiles[file.uri] = new AventusHTMLFile(file, this);
                this.registerOnFileDelete(file);
            }
        }
        else if (file.uri.endsWith(AventusExtension.Component)) {
            if (!this.wcFiles[file.uri]) {
                this.wcFiles[file.uri] = new AventusWebComponentSingleFile(file, this);
                this.registerOnFileDelete(file);
            }
        }
        else {
            if (!this.tsFiles[file.uri]) {
                let fileCreated = AventusTsFileSelector(file, this);
                if (fileCreated) {
                    this.tsFiles[file.uri] = fileCreated;
                    this.registerOnFileDelete(file);
                }
            }
        }

    }
    public registerOnFileDelete(file: AventusFile) {
        this.onFileDeleteUUIDs[file.uri] = file.onDelete(this.onFileDelete.bind(this));
    }
    public async onFileDelete(file: AventusFile) {
        file.removeOnDelete(this.onFileDeleteUUIDs[file.uri]);
        // be sure to remove element
        if (file.uri.endsWith(AventusExtension.ComponentStyle)) {
            delete this.scssFiles[file.uri];
        }
        else if (file.uri.endsWith(AventusExtension.ComponentView)) {
            delete this.htmlFiles[file.uri];
        }
        else if (file.uri.endsWith(AventusExtension.Component)) {
            delete this.wcFiles[file.uri];
        }
        else {
            delete this.tsFiles[file.uri];
        }

        await this.rebuildAll();
    }

    private registerDef(pathToImport: string) {
        pathToImport = normalize(pathToImport);
        if (pathToImport == this.buildConfig.outputFile.replace(".js", AventusExtension.Definition)) {
            return;
        }
        if (existsSync(pathToImport) && statSync(pathToImport).isFile()) {
            let uriToImport = pathToUri(pathToImport.replace(/\\/g, '/'));
            let file = FilesWatcher.getInstance().registerFile(uriToImport, AventusLanguageId.TypeScript)
            AventusTsFileSelector(file, this);
        }
    }
    public rebuildDefinitionWebComponent() {
        this.definitionWebComponentByName = {};
        for (let uri in this.tsDefFiles) {
            let file = this.tsDefFiles[uri];
            this.definitionWebComponentByName = {
                ...this.definitionWebComponentByName,
                ...file.classInfoByName
            }
        }
    }
    public getWebComponentDefinition(webcompName: string): ClassModel | undefined {
        return this.definitionWebComponentByName[webcompName];
    }

    public destroy() {
        FilesManager.getInstance().removeOnNewFile(this.onNewFileUUID);
        for (let uri in this.scssFiles) {
            this.scssFiles[uri].removeEvents();
            this.scssFiles[uri].file.removeOnDelete(this.onFileDeleteUUIDs[uri]);
        }
        for (let uri in this.htmlFiles) {
            this.htmlFiles[uri].removeEvents();
            this.htmlFiles[uri].file.removeOnDelete(this.onFileDeleteUUIDs[uri]);
        }
        for (let uri in this.tsFiles) {
            this.tsFiles[uri].removeEvents();
            this.tsFiles[uri].file.removeOnDelete(this.onFileDeleteUUIDs[uri]);
        }
    }


}