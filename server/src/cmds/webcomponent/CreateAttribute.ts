import { EOL } from 'os';
import { ExecuteCommandParams, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusLanguageId } from '../../definition';
import { InternalAventusFile } from '../../files/AventusFile';
import { FilesManager } from '../../files/FilesManager';
import { EditFile } from '../../notification/EditFile';

export class CreateAttribute {
	static cmd: string = "aventus.wc.create.attribute";

	constructor(params: ExecuteCommandParams) {
		if (params.arguments && params.arguments.length == 4) {
			let uri = params.arguments[0];
			let name: string = params.arguments[1];
			let type: string = params.arguments[2]
			let position: number = params.arguments[3];
			this.run(uri, name, type, position);
		}
	}

	private async run(uri: string, name: string, type: string, position: number) {
		let file = FilesManager.getInstance().getByUri(uri);
		if (file) {
			let oldEnd = file.document.positionAt(file.content.length);
			let newTxt = '@Attribute()' + EOL + 'public ' + name + ':' + type + ';' + EOL;
			let begin = file.content.slice(0, position);
			let end = file.content.slice(position + 1, file.content.length);
			let txt = begin + newTxt + end;
			let newDocument = TextDocument.create(file.uri, AventusLanguageId.TypeScript, file.version + 1, txt);
			await (file as InternalAventusFile).triggerContentChange(newDocument);
			let textEdits = await (file as InternalAventusFile).getFormatting({
				insertSpaces: true,
				tabSize: 4
			});
			await (file as InternalAventusFile).applyTextEdits(textEdits);

			// TODO check if make sense
			let result: TextEdit[] = [{
				newText: file.content,
				range: {
					start: file.document.positionAt(0),
					end: oldEnd
				}
			}];

			// let result: TextEdit[][] = [];
			// result.push([
			// 	{
			// 		newText: newTxt,
			// 		range: {
			// 			start: file.document.positionAt(position),
			// 			end: file.document.positionAt(position)
			// 		}
			// 	}
			// ])
			// result.push(textEdits);
			EditFile.send(uri, [result])

		}
	}
}