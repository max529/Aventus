import { Range } from 'vscode-languageserver';
import {ClientConnection } from '../Connection';

export class EditFile {

    public static send(uri: string, transformations: { range: Range, newText: string }[][]) {
        ClientConnection.getInstance().sendNotification("aventus/editFile", {
			uri,
			transformations
		})
    }
}