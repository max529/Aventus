import { ExecuteCommandParams } from "vscode-languageserver";
import { AddConfigSection } from './addConfigSection';
import { BuildProject } from "./buildProject";
import { Create } from "./create";
import { MergeComponent } from "./mergeComponent";
import { SplitComponent } from "./splitComponent";
import { StaticExport } from "./staticExport";
import { CreateAttribute } from './webcomponent/CreateAttribute';
import { CreateProperty } from './webcomponent/CreateProperty';
import { CreateWatch } from './webcomponent/CreateWatch';
import { ImportViewElement } from './webcomponent/ImportViewElement';

export const Commands = {
    allCommandes: {
        [BuildProject.cmd]: BuildProject,
        [Create.cmd]: Create,
        [MergeComponent.cmd]: MergeComponent,
        [SplitComponent.cmd]: SplitComponent,
        [StaticExport.cmd]: StaticExport,
        [AddConfigSection.cmd]: AddConfigSection,
        [CreateAttribute.cmd]: CreateAttribute,
        [CreateProperty.cmd]: CreateProperty,
        [CreateWatch.cmd]: CreateWatch,
        [ImportViewElement.cmd]: ImportViewElement,
    },
    execute: function (params: ExecuteCommandParams) {
        let cmd = this.allCommandes[params.command];
        if (cmd) {
            new cmd(params);
        }
    }
}