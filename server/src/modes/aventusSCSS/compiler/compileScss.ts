import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { normalize, sep } from 'path';
import { pathToFileURL } from 'url';
import { aventusExtension } from '../../aventusJs/aventusDoc';
import { getFolder } from '../../aventusJs/utils';

const nodeSass = require('sass');

function resolvePath(loadingPath: string, currentFolder: string): string {
	loadingPath = normalize(currentFolder + "/" + loadingPath);
	if (existsSync(loadingPath)) {
		return loadingPath;
	}
	let pathWithExtension = loadingPath + aventusExtension.ComponentStyle;
	if (existsSync(pathWithExtension)) {
		return pathWithExtension;
	}
	let splitted = loadingPath.split(sep);
	splitted[splitted.length - 1] = "_" + splitted[splitted.length - 1];
	let pathWithUnderscore = splitted.join(sep);
	if (existsSync(pathWithUnderscore)) {
		return pathWithUnderscore;
	}
	let pathWithUnderscoreExtension = pathWithUnderscore + aventusExtension.ComponentStyle;
	if (existsSync(pathWithUnderscoreExtension)) {
		return pathWithUnderscoreExtension;
	}
	return "";
}
function loadFile(stylePath: string): {
	state: 'ok' | 'ko',
	content: string,
	importedPath: string[]
} {
	let folderPath = getFolder(stylePath);
	let text = readFileSync(stylePath, 'utf8');
	//remove comment 
	text = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1')
	let regex = /@import *?('|")(\S*?)('|");?/g;
	let arrMatch: RegExpExecArray | null = null;
	let importedPath: string[] = [];
	while (arrMatch = regex.exec(text)) {
		let importName = arrMatch[2];
		let pathToImport = resolvePath(importName, folderPath);
		if (pathToImport == "") {
			return {
				state: "ko",
				content: "error can't load path " + importName + " in file " + stylePath,
				importedPath: [],
			}
		}
		importedPath.push(pathToImport);
		let newContent = loadFile(pathToImport);
		if (newContent.state == "ko") {
			return newContent;
		}
		for (let addedPath of newContent.importedPath) {
			if (importedPath.indexOf(addedPath) == -1) {
				importedPath.push(addedPath);
			}
		}
		text = text.replace(arrMatch[0], newContent.content);
	}
	return {
		state: "ok",
		content: text,
		importedPath: importedPath,
	}
}
export interface ScssCompilerResult {
	success: boolean,
	content: string,
	rawContent: string,
	importedPath: string[],
	errorInfo: string
}
export function compileScss(stylePath): ScssCompilerResult {
	let result = loadFile(stylePath);
	if (result.state == "ko") {
		return {
			success: false,
			content: '',
			rawContent: '',
			errorInfo: result.content,
			importedPath: result.importedPath
		}
	}
	try {

		let compiled = nodeSass.compileString(result.content, {
			style: 'compressed'
		}).css.toString().trim();
		return {
			success: true,
			content: compiled,
			rawContent: result.content,
			errorInfo: '',
			importedPath: result.importedPath
		}
	}
	catch (e: any) {
		return {
			success: false,
			errorInfo: e,
			content: '',
			rawContent: '',
			importedPath: result.importedPath
		}
	}
}

