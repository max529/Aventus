import { CompletionItem, CompletionList, FormattingOptions, Hover, Position, Range, TextEdit } from 'vscode-languageserver';
import { AventusFile } from "../FilesManager";
import { AventusConfig } from "../language-services/json/definition";
import { AventusJSONLanguageService } from '../language-services/json/LanguageService';
import { Build } from "./Build";
import { Static } from "./Static";

export class Project {
    private configFile: AventusFile;
    private config: AventusConfig | null = null;
    private builds: Build[] = [];
    private statics: Static[] = [];
    private _isCoreBuild: Boolean = false;
    private outputFiles: string[] = [];

    private onContentChangeUUID: string;
    private onSaveUUID: string;
    private onFormattingUUID: string;
    private onCompletionUUID: string;
    private onCompletionResolveUUID: string;
    private onHoverUUID: string;

    public get isCoreBuild() {
        return this._isCoreBuild;
    }
    public getConfigFile() {
        return this.configFile;
    }
    public getOutputFiles() {
        return this.outputFiles;
    }

    public constructor(configFile: AventusFile) {
        this.configFile = configFile;
        this.onContentChangeUUID = this.configFile.onContentChange(this.onConfigChange.bind(this));
        this.onSaveUUID = this.configFile.onSave(this.onConfigSave.bind(this));
        this.onFormattingUUID = this.configFile.onFormatting(this.onFormatting.bind(this));
        this.onCompletionUUID = this.configFile.onCompletion(this.onCompletion.bind(this));
        this.onCompletionResolveUUID = this.configFile.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.onHoverUUID = this.configFile.onHover(this.onHover.bind(this));

        if (configFile.folderUri.toLowerCase().endsWith("/aventus/base/src")) {
            // it's core project => remove all completions with generic def
            this._isCoreBuild = true;
        }

    }
    public async init() {
        await this.onConfigSave();
    }
    /**
     * Validate config and send error
     */
    public async onConfigChange() {
        return await AventusJSONLanguageService.getInstance().valideConfig(this.configFile);
    }
    /**
     * Load the new config file and create build
     */
    public async onConfigSave() {
        let newConfig = await AventusJSONLanguageService.getInstance().getConfig(this.configFile);
        if (this.config) {
            let oldConfigTxt = JSON.stringify(this.config);
            let newConfigTxt = "";
            if (newConfig) {
                newConfigTxt = JSON.stringify(newConfig);
            }
            if (oldConfigTxt == newConfigTxt) {
                // no change inside configuration => no need to reload all
                return;
            }
            // remove all old builds
            for (let build of this.builds) {
                build.destroy();
            }
        }
        this.builds = [];
        this.config = newConfig;
        if (this.config) {
            for (let build of this.config.build) {
                this.outputFiles.push(build.outputFile);
            }
            for (let build of this.config.build) {
                let newBuild = new Build(this, build)
                this.builds.push(newBuild);
                await newBuild.init()
            }
            if (this.config.static) {
                for (let _static of this.config.static) {
                    this.statics.push(new Static(this, _static));
                }
            }
        }
    }

    public async onFormatting(document: AventusFile, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        return await AventusJSONLanguageService.getInstance().format(document, range, options);
    }
    public async onCompletion(document: AventusFile, position: Position): Promise<CompletionList> {
        return await AventusJSONLanguageService.getInstance().doComplete(document, position);
    }
    public async onCompletionResolve(document: AventusFile, item: CompletionItem): Promise<CompletionItem> {
        return await AventusJSONLanguageService.getInstance().doResolve(item);
    }
    public async onHover(document: AventusFile, position: Position): Promise<Hover | null> {
        return await AventusJSONLanguageService.getInstance().doHover(document, position);
    }

    public getBuild(name: string): Build | undefined {
        for (let build of this.builds) {
            if (build.name == name) {
                return build;
            }
        }
        return undefined;
    }
    public getStatic(name: string): Static | undefined {
        for (let _static of this.statics) {
            if (_static.name == name) {
                return _static;
            }
        }
        return undefined;
    }


    public destroy() {
        this.configFile.removeOnSave(this.onSaveUUID);
        this.configFile.removeOnContentChange(this.onContentChangeUUID);
        this.configFile.removeOnFormatting(this.onFormattingUUID);
        this.configFile.removeOnCompletion(this.onCompletionUUID);
        this.configFile.removeOnCompletionResolve(this.onCompletionResolveUUID);
        this.configFile.removeOnHover(this.onHoverUUID);

        for (let build of this.builds) {
            build.destroy();
        }
        for (let _static of this.statics) {
            _static.destroy();
        }
    }

}
