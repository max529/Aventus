import { FilesManager } from '../../server/src/FilesManager';
import { ProjectManager } from '../../server/src/project/ProjectManager';
import { pathToUri } from '../../server/src/tools';

process.env["AVENTUS_CLI"] = "true";
process.env["aventus_server_folder"] = __dirname+"/../..";


async function main() {
	let projectToCompile = ""
	if (process.argv.length == 3) {
		projectToCompile = process.argv[2];
	}
	else {
		projectToCompile = __dirname;
		projectToCompile = 'D:\\404\\5_Prog_SVN\\2_Services\\Access\\Release\\currentRelease\\Export\\typescript'
	}
	projectToCompile = projectToCompile.replace(/\\/g, "/")
	ProjectManager.getInstance();
    await FilesManager.getInstance().loadAllAventusFiles([pathToUri(projectToCompile)]);

	FilesManager.getInstance().onShutdown();
}
main();