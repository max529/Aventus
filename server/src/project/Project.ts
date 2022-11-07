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

    public get isCoreBuild() {
        return this._isCoreBuild;
    }
    public getConfigFile() {
        return this.configFile;
    }
    public getOutputFiles(){
        return this.outputFiles;
    }

    public constructor(configFile: AventusFile) {
        this.configFile = configFile;
        this.onContentChangeUUID = this.configFile.onContentChange(this.onConfigChange.bind(this));
        this.onSaveUUID = this.configFile.onSave(this.onConfigSave.bind(this));

        if (configFile.folderUri.toLowerCase().endsWith("/aventus/base/src")) {
            // it's core project => remove all completions with generic def
            this._isCoreBuild = true;
        }
        this.onConfigSave();
    }
    /**
     * Validate config and send error
     */
    public onConfigChange() {
        return AventusJSONLanguageService.getInstance().valideConfig(this.configFile);
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
            for(let build of this.config.build){
                this.outputFiles.push(build.outputFile);
            }
            for (let build of this.config.build) {
                this.builds.push(new Build(this, build));
            }
            if (this.config.static) {
                for (let _static of this.config.static) {
                    this.statics.push(new Static(this, _static));
                }
            }
        }
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

        for (let build of this.builds) {
            build.destroy();
        }
        for (let _static of this.statics) {
            _static.destroy();
        }
    }
}
