import { normalize } from "path";
import { Diagnostic, getLanguageService, LanguageService } from "vscode-json-languageservice";
import { AventusExtension } from "../../definition";
import { AventusFile } from "../../FilesManager";
import { createErrorTs, getFolder, uriToPath } from "../../tools";
import { AventusConfig, AventusConfigBuild, AventusConfigStatic } from "./definition";
import { AventusConfigSchema } from "./schema";

export class AventusJSONLanguageService {
    private static instance: AventusJSONLanguageService;
    public static getInstance(): AventusJSONLanguageService {
        if(!this.instance){
            this.instance  = new AventusJSONLanguageService();
        }
        return this.instance;
    }

    private languageService: LanguageService;

    private constructor() {
        this.languageService = getLanguageService({
            schemaRequestService: async (uri) => {
                return JSON.stringify(AventusConfigSchema);
            }
        });
        this.languageService.configure({ allowComments: false, schemas: [{ fileMatch: [AventusExtension.Config], uri: AventusConfigSchema.$schema }] });
    }

    public async valideConfig(file: AventusFile): Promise<Diagnostic[]> {
        let document = file.document;
        let jsonDoc = this.languageService.parseJSONDocument(document);
        let errors = await this.languageService.doValidation(document, jsonDoc, undefined, AventusConfigSchema);
        if (errors.length == 0) {
            let configTxt = document.getText();
            try {
                let resultConfig: AventusConfig = JSON.parse(configTxt);
                return errors;
            }
            catch (e) {
                errors.push(createErrorTs(document, "Can't parse the json"))
            }
        }
        return errors;
    }
    public async getConfig(file: AventusFile): Promise<AventusConfig | null> {
        let document = file.document;
        let jsonDoc = this.languageService.parseJSONDocument(document);
        let errors = await this.languageService.doValidation(document, jsonDoc, undefined, AventusConfigSchema);
        if (errors.length == 0) {
            let configTxt = document.getText();
            try {
                let resultConfig: AventusConfig = JSON.parse(configTxt);
                this.prepareConfigFile(document.uri, resultConfig);
                return resultConfig;
            }
            catch (e) {
                errors.push(createErrorTs(document, "Can't parse the json"))
            }
        }
        return null;
    }


    private prepareConfigFile(uri: string, config: AventusConfig) {
        for (let build of config.build) {
            this.prepareBuild(uri, build);
        }
        if (config.static) {
            for (let _static of config.static) {
                this.prepareStatic(uri, _static);
            }
        }
    }
    private prepareBuild(configUri: string, build: AventusConfigBuild) {
        let baseDir = getFolder(configUri);
        let regexs: string[] = [];
        if (!build.hasOwnProperty("compileOnSave")) {
            build.compileOnSave = true;
        }
        if (!build.include) {
            build.include = [];
        }
        // input
        for (let inputPath of build.inputPath) {
            let slash = "";
            if (!inputPath.startsWith("/")) {
                slash = "/";
            }
            let splitedInput = inputPath.split("/");
            if (splitedInput[splitedInput.length - 1] == "" || splitedInput[splitedInput.length - 1] == "*") {
                splitedInput[splitedInput.length - 1] = "*"
            }
            else if (splitedInput[splitedInput.length - 1].indexOf(".") == -1) {
                // its a folder but without end slash
                splitedInput.push("*");
            }
            inputPath = splitedInput.join("/");
            let regTemp = normalize(uriToPath(baseDir) + slash + inputPath).replace(/\\/g, '\\/').replace("*", ".*");
            regexs.push("(^" + regTemp + "$)");
        }
        let regexJoin = regexs.join("|");
        if (regexJoin == "") {
            regexJoin = "(?!)";
        }
        build.inputPathRegex = new RegExp(regexJoin);

        // output
        if (!build.outputFile.startsWith("/")) {
            build.outputFile = "/" + build.outputFile;
        }
        build.outputFile = normalize(uriToPath(baseDir) + build.outputFile);

        // no namespace
        if (build.noNamespacePath) {
            regexs = [];
            for (let noNamespacePath of build.noNamespacePath) {
                let slash = "";
                if (!noNamespacePath.startsWith("/")) {
                    slash = "/";
                }
                let splitedInput = noNamespacePath.split("/");
                if (splitedInput[splitedInput.length - 1] == "" || splitedInput[splitedInput.length - 1] == "*") {
                    splitedInput[splitedInput.length - 1] = "*"
                }
                else if (splitedInput[splitedInput.length - 1].indexOf(".") == -1) {
                    // its a folder but without end slash
                    splitedInput.push("*");
                }
                noNamespacePath = splitedInput.join("/");
                let regTemp = normalize(uriToPath(baseDir) + slash + noNamespacePath).replace(/\\/g, '\\/').replace("*", ".*");
                regexs.push("(^" + regTemp + "$)");
            }
            regexJoin = regexs.join("|");
            if (regexJoin == "") {
                regexJoin = "(?!)";
            }
            build.noNamespacePathRegex = new RegExp(regexJoin);
        }
    }

    private prepareStatic(configUri: string, _static: AventusConfigStatic) {
        let baseDir = getFolder(configUri);
        let slash = "";
        if (!_static.inputPath.startsWith("/")) {
            slash = "/";
        }
        _static.inputPathFolder = normalize(uriToPath(baseDir) + slash + _static.inputPath);
        _static.inputPathFolder = _static.inputPathFolder.replace(/\\/g, '/')

        slash = "";
        if (!_static.outputPath.startsWith("/")) {
            slash = "/";
        }
        _static.outputPathFolder = normalize(uriToPath(baseDir) + slash + _static.outputPath);
        _static.outputPathFolder = _static.outputPathFolder.replace(/\\/g, '/');
        if (_static.hasOwnProperty("exportOnChange") && !_static.exportOnChange) {
            return;
        }
    }
}