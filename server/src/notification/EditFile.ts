import { ClientConnection } from '../Connection';
import { TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';


export class EditFile {

	public static send(uri: string, transformations: TextEdit[][]) {
		ClientConnection.getInstance().sendNotification("aventus/editFile", {
			uri,
			transformations
		})
	}
}