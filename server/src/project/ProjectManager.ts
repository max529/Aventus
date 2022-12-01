import { AventusExtension } from "../definition";
import { AventusFile } from '../files/AventusFile';
import { FilesManager } from '../files/FilesManager';
import { Build } from './Build';
import { Project } from "./Project";

export class ProjectManager {
    private static instance: ProjectManager;
    public static getInstance(): ProjectManager {
        if (!this.instance) {
            this.instance = new ProjectManager();
        }
        return this.instance;
    }
    private projects: { [uri: string]: Project } = {};
    private constructor() {
        FilesManager.getInstance().onNewFile(this.onNewFile.bind(this));
    }
    private async onNewFile(file: AventusFile) {
        if (file.document.uri.endsWith(AventusExtension.Config)) {
            if (!this.projects[file.document.uri]) {
                this.projects[file.document.uri] = new Project(file);
                await this.projects[file.document.uri].init()
                file.onDelete(this.onDeleteFile.bind(this));
            }
            else {
                console.error("a config file with the uri :" + file.document.uri + " is already inside project manager");
            }
        }
    }
    private async onDeleteFile(file: AventusFile) {
        if (this.projects[file.document.uri]) {
            this.projects[file.document.uri].destroy();
            delete this.projects[file.document.uri];
        }
    }

    public getProjectByUri(uri: string): Project | undefined {
        return this.projects[uri];
    }

    public getMatchingBuildsByUri(uri: string): Build[] {
        let result: Build[] = []
        for (let projectUri in this.projects) {
            let project = this.projects[projectUri];
            let resultTemps = project.getMatchingBuildsByUri(uri);
            for (let resultTemp of resultTemps) {
                result.push(resultTemp);
            }
        }
        return result;
    }

    public destroyAll() {
        for (let projectUri in this.projects) {
            this.projects[projectUri].destroy()
        }
    }
}



