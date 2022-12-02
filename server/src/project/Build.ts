import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { EOL } from "os";
import { normalize } from "path";
import { ClientConnection } from '../Connection';
import { AventusExtension, AventusLanguageId } from "../definition";
import { AventusFile } from '../files/AventusFile';
import { FilesManager } from '../files/FilesManager';
import { FilesWatcher } from '../files/FilesWatcher';
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
import { Compiled } from '../notification/Compiled';
import { RegisterBuild } from '../notification/RegisterBuild';
import { UnregisterBuild } from '../notification/UnregisterBuild';
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
    public get isCoreBuild() {
        return this.project.isCoreBuild;
    }


    public constructor(project: Project, buildConfig: AventusConfigBuild) {
        this.project = project;
        this.buildConfig = buildConfig;
        if (buildConfig.includeBase) {
            buildConfig.includeOnBuild.splice(0, 0, "Aventus");
        }
        this.onNewFileUUID = FilesManager.getInstance().onNewFile(this.onNewFile.bind(this));
        this.tsLanguageService = new AventusTsLanguageService(this);
        this.scssLanguageService = new AventusSCSSLanguageService(this);
        this.htmlLanguageService = new AventusHTMLLanguageService(this);

        RegisterBuild.send(project.getConfigFile().path, buildConfig.name);
    }
    public async init() {
        await this.loadFiles();
    }

    public getOutputUri() {
        return pathToUri(this.buildConfig.outputFile);
    }
    public getComponentPrefix() {
        return this.buildConfig.componentPrefix;
    }
    public isFileInside(uri: string): boolean {
        return uriToPath(uri).match(this.buildConfig.inputPathRegex) != null;
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
            await this.scssFiles[uri].validate();
        }
        for (let uri in this.htmlFiles) {
            await this.htmlFiles[uri].validate();
        }
        for (let uri in this.tsFiles) {
            await this.tsFiles[uri].validate();
        }
        for (let uri in this.wcFiles) {
            await this.wcFiles[uri].validate();
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
        let compiledCodeDocInvisible: string[] = [];
        let compiledCodeNoNamespaceBefore: string[] = [];
        let compiledCodeNoNamespaceAfter: string[] = [];
        let compiledCodeDocNoNamespace: string[] = [];
        let classesName: string[] = [];
        let documents = this.buildOrderFiles();
        let uris: string[] = [];
        let moduleCodeStarted = false;
        for (let doc of documents) {
            uris.push(doc.file.uri);
            if (this.noNamespaceUri[doc.file.uri]) {
                if (doc.compileResult.src != "") {
                    if (moduleCodeStarted) {
                        compiledCodeNoNamespaceAfter.push(doc.compileResult.src)
                    }
                    else {
                        compiledCodeNoNamespaceBefore.push(doc.compileResult.src)
                    }
                }
                if (doc.compileResult.docVisible != "") {
                    compiledCodeDocNoNamespace.push(doc.compileResult.docVisible);
                }
                if (doc.compileResult.docInvisible != "") {
                    compiledCodeDocInvisible.push(doc.compileResult.docInvisible);
                }
            }
            else {
                moduleCodeStarted = true;
                for (let className of doc.compileResult.nameCompiled) {
                    classesName.push(className);
                }
                if (doc.compileResult.src != "") {
                    compiledCode.push(doc.compileResult.src)
                }
                if (doc.compileResult.docVisible != "") {
                    compiledCodeDoc.push(doc.compileResult.docVisible);
                }
                if (doc.compileResult.docInvisible != "") {
                    compiledCodeDocInvisible.push(doc.compileResult.docInvisible);
                }
            }
        }
        this.buildCode(compiledCode, compiledCodeNoNamespaceBefore, compiledCodeNoNamespaceAfter, classesName)
        if (this.buildConfig.generateDefinition) {
            this.buildDocumentation(compiledCodeDoc, compiledCodeDocNoNamespace, compiledCodeDocInvisible)
        }
        else if (existsSync(this.buildConfig.outputFile.replace(".js", ".def.avt"))) {
            unlinkSync(this.buildConfig.outputFile.replace(".js", ".def.avt"));
        }
        Compiled.send(this.name);
    }
    private buildCode(compiledCode: string[], compiledCodeNoNamespaceBefore: string[], compiledCodeNoNamespaceAfter: string[], classesName: string[]) {
        let finalTxt = '';
        finalTxt += this.buildLoadInclude().join(EOL) + EOL;
        let moduleName = this.buildConfig.module;
        let splittedNames = moduleName.split(".");
        finalTxt += compiledCodeNoNamespaceBefore.join(EOL) + EOL;
        finalTxt += "var " + splittedNames[0] + ";" + EOL;
        // create intermediate namespace
        let baseName = '';
        for (let i = 0; i < splittedNames.length; i++) {
            if (baseName != "") { baseName += '.' + splittedNames[i]; }
            else { baseName = splittedNames[i] }

            finalTxt += '(' + baseName + '||(' + baseName + ' = {}));' + EOL
        }
        finalTxt += "(function (" + splittedNames[0] + ") {\r\n var namespace = '" + moduleName + "';\r\n"

        finalTxt += compiledCode.join(EOL) + EOL;
        finalTxt = finalTxt.trim() + EOL;
        let subNamespace: string[] = [];

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
                        let nameToCreate = moduleName + "." + currentNamespace;
                        finalTxt += '(' + nameToCreate + '||(' + nameToCreate + ' = {}));' + EOL
                    }
                }
                let finalName = classNameSplitted[classNameSplitted.length - 1];
                finalTxt += moduleName + "." + className + "=" + finalName + ";" + EOL;
            }
        }
        finalTxt += "})(" + splittedNames[0] + ");" + EOL;

        finalTxt += compiledCodeNoNamespaceAfter.join(EOL) + EOL;
        finalTxt = finalTxt.trim() + EOL;

        let folderPath = getFolder(this.buildConfig.outputFile.replace(/\\/g, "/"));
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }
        writeFileSync(this.buildConfig.outputFile, finalTxt);
    }
    private buildDocumentation(compiledCodeDoc: string[], compiledCodeDocNoNamespace: string[], compiledCodeDocInvisible: string[]) {
        let finaltxt = "";
        finaltxt = "declare global {" + EOL;
        finaltxt += "\tdeclare namespace " + this.buildConfig.module + "{" + EOL;
        finaltxt += compiledCodeDoc.join(EOL) + EOL;
        finaltxt += "\t}";
        compiledCodeDocNoNamespace.length > 0 ? (finaltxt += EOL + compiledCodeDocNoNamespace.join(EOL) + EOL) : (finaltxt += EOL)
        finaltxt += "}";
        compiledCodeDocInvisible.length > 0 ? (finaltxt += EOL + compiledCodeDocInvisible.join(EOL) + EOL) : (finaltxt += EOL)

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
        for (let includeName of this.buildConfig.includeOnBuild) {
            let includeSrc = this.project.getDefSrcFile(includeName);
            if (includeSrc) {
                let pathToImport = includeSrc;
                if (includeSrc.startsWith(".")) {
                    pathToImport = this.project.getConfigFile().folderPath + '/' + includeSrc;
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
        if (this.buildConfig.outsideModulePathRegex) {
            if (file.path.match(this.buildConfig.outsideModulePathRegex)) {
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
        if (this.buildConfig.outsideModulePathRegex) {
            let files: AventusFile[] = FilesManager.getInstance().getFilesMatching(this.buildConfig.outsideModulePathRegex);
            for (let file of files) {
                this.registerFile(file);
                this.noNamespaceUri[file.uri] = true;
            }
        }
        let config = this.project.getConfig();
        if (config) {
            for (let include of config.include) {
                let pathToImport = include.definition;
                if (include.definition.startsWith(".")) {
                    pathToImport = this.project.getConfigFile().folderPath + '/' + include.definition;
                }
                this.registerDef(pathToImport);
            }
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
        if (existsSync(pathToImport) && statSync(pathToImport).isFile()) {
            let uriToImport = pathToUri(pathToImport);
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

    public getNamespaceForUri(uri: string): string {
        if (this.buildConfig.namespaceStrategy == 'manual') {
            return "";
        }
        else if (this.buildConfig.namespaceStrategy == 'rules') {
            let path = uriToPath(uri);
            for (let namespace in this.buildConfig.namespaceRulesRegex) {
                let regex = this.buildConfig.namespaceRulesRegex[namespace]
                if (path.match(regex)) {
                    return namespace;
                }
            }
        }
        else {
            // TODO add follow pattern
        }
        return "";
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
        UnregisterBuild.send(this.project.getConfigFile().path, this.buildConfig.name);
    }


}