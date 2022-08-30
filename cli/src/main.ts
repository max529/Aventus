process.env["AVENTUS_CLI"] = "true";
process.env["aventus_server_folder"] = __dirname+"/../..";

import { jsMode } from '../../server/src/mode';
import { pathToUri } from '../../server/src/modes/aventusJs/utils';
import { init } from '../../server/src/server';

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
	await init([pathToUri(projectToCompile)]);

	let program = jsMode.programManager.getPrograms();
}
main();