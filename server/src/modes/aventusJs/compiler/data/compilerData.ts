import { AventusDoc } from '../../aventusDoc';
import { AventusConfig } from '../../config';
import { compileValidatorData } from '../data/compilerValidator';
import { genericCompile } from '../utils';


export function compileData(aventusDoc: AventusDoc, config: AventusConfig): {
	nameCompiled: string[],
	nameDoc: string[],
	src: string,
	doc: string,
	dependances: string[]
} {
	if (compileValidatorData(aventusDoc.document, config).length > 0) {
		return {
			nameCompiled: [],
			nameDoc: [],
			src: "",
			doc: "",
			dependances: []
		};
	}

	return genericCompile(aventusDoc.document);
}