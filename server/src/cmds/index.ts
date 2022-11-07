import { ExecuteCommandParams } from "vscode-languageserver";
import { BuildProject } from "./BuildProject";
import { Create } from "./create";
import { MergeComponent } from "./mergeComponent";
import { SplitComponent } from "./splitComponent";
import { StaticExport } from "./staticExport";

export const Commands = {
    allCommandes: {
        [BuildProject.cmd]: BuildProject,
        [Create.cmd]: Create,
        [MergeComponent.cmd]: MergeComponent,
        [SplitComponent.cmd]: SplitComponent,
        [StaticExport.cmd]: StaticExport
    },
    execute: function (params: ExecuteCommandParams) {
        let cmd = this.allCommandes[params.command];
        if (cmd) {
            new cmd(params);
        }
    }
}