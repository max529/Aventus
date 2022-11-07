import { AventusExtension } from "../definition";
import { AventusFile, FilesManager } from "../FilesManager";
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
    private onNewFile(file: AventusFile) {
        if (file.document.uri.endsWith(AventusExtension.Config)) {
            if (!this.projects[file.document.uri]) {
                this.projects[file.document.uri] = new Project(file);
                file.onDelete(this.onDeleteFile.bind(this));
            }
            else {
                console.error("a config file with the uri :" + file.document.uri + " is already inside project manager");
            }
        }
    }
    private onDeleteFile(file: AventusFile) {
        if (this.projects[file.document.uri]) {
            this.projects[file.document.uri].destroy();
            delete this.projects[file.document.uri];
        }
    }

    public getProjectByUri(uri: string): Project | undefined {
        return this.projects[uri];
    }
}



