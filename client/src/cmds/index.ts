import { AddConfigSection } from './AddConfigSection';
import { BuildProject } from "./BuildProject";
import { Create } from "./Create";
import { StaticExport } from "./StaticExport";


export const Commands = {
    allCommandes: {
        [Create.cmd]: Create,
        [BuildProject.cmd]: BuildProject,
        [StaticExport.cmd]: StaticExport,
        [AddConfigSection.cmd]: AddConfigSection
    },
}