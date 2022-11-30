import { ExecuteCommandParams } from 'vscode-languageserver';
import { FilesManager } from '../../files/FilesManager';

export class CreateWatch {
	static cmd: string = "aventus.wc.create.watch";

	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments.length == 2) {
			let uri = params.arguments[0];
			let name: string = params.arguments[1];
			let file = FilesManager.getInstance().getByUri(uri);
			if(file){
				
			}
		}
	}
}