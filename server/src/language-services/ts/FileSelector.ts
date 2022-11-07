import { AventusExtension } from '../../definition';
import { AventusFile } from '../../FilesManager';
import { Build } from '../../project/Build';
import { AventusWebComponentLogicalFile } from './component/File';
import { AventusDataFile } from './data/File';
import { AventusDefinitionFile } from './definition/File';
import { AventusTsFile } from './File';
import { AventusLibFile } from './lib/File';
import { AventusRamFile } from './ram/File';
import { AventusSocketFile } from './socket/File';
import { AventusStaticFile } from './static/File';

export function AventusTsFileSelector(file: AventusFile, build: Build): AventusTsFile | null {
	let result: AventusTsFile | null = null;
	if (file.uri.endsWith(AventusExtension.ComponentLogic)) {
		result = new AventusWebComponentLogicalFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.Data)) {
		result = new AventusDataFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.Lib)) {
		result = new AventusLibFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.RAM)) {
		result = new AventusRamFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.Socket)) {
		result = new AventusSocketFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.Static)) {
		result = new AventusStaticFile(file, build);
	}
	else if (file.uri.endsWith(AventusExtension.Definition)) {
		result = new AventusDefinitionFile(file, build);
	}
	return result;
}