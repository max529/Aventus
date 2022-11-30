import { AddConfigSection } from './AddConfigSection';
import { BuildProject } from "./BuildProject";
import { Create } from "./Create";
import { StaticExport } from "./StaticExport";
import { CreateAttribute } from './webcomponent/CreateAttribute';
import { CreateProperty } from './webcomponent/CreateProperty';
import { CreateWatch } from './webcomponent/CreateWatch';
import { ImportViewElement } from './webcomponent/ImportViewElement';


export const Commands = {
    allCommandes: {
        [Create.cmd]: Create,
        [BuildProject.cmd]: BuildProject,
        [StaticExport.cmd]: StaticExport,
        [AddConfigSection.cmd]: AddConfigSection,
        [CreateAttribute.cmd]: CreateAttribute,
        [CreateProperty.cmd]: CreateProperty,
        [CreateWatch.cmd]: CreateWatch,
        [ImportViewElement.cmd]: ImportViewElement,
    },
}