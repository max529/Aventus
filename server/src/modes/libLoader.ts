/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join, basename, dirname } from 'path';
import { fstatSync, readFileSync, existsSync } from 'fs';

const contents: { [name: string]: string } = {};



const serverFolder = getServerFolder();
const TYPESCRIPT_LIB_SOURCE = join(serverFolder, 'node_modules/typescript/lib');
export const AVENTUS_DEF_BASE_PATH = join(serverFolder, 'lib/aventus.base.def.avt');
const AVENTUS_BASE_PATH = join(serverFolder, 'lib/aventus.base.js');
const NODE_MODULES = join(serverFolder, 'node_modules');

export function loadLibrary(name: string): string {
	let content = contents[name];
	let libPath;
	let showError = true;
	let force = false;
	if (name == "aventus.def" || name == "aventus.def.ts") {
		libPath = AVENTUS_DEF_BASE_PATH;
	}
	else if (name.startsWith("custom://@types")) {
		libPath = join(NODE_MODULES, name.replace("custom://@types", "@types"));
		showError = false;
	}
	else if (name == "aventus") {
		libPath = AVENTUS_BASE_PATH;
	}
	else if (name.startsWith("file:///")) {
		libPath = decodeURIComponent(name.replace("file:///", ""));
		if (libPath.indexOf("/node_modules/@typescript") != -1) {
			//showError = false;
		}
		else if (libPath.indexOf("/node_modules/@types/typescript__") != -1) {
			//showError = false;
		}
		else if (libPath.endsWith(".ts")) {
			libPath = libPath.replace(".ts", "");
			if (!libPath.endsWith(".avt")) {
				libPath += ".avt";
			}
			force = true;
		}
		else if (libPath.endsWith(".avt")) {
			force = true;
		}
		else {
			showError = false;
		}
	}
	else {
		libPath = join(TYPESCRIPT_LIB_SOURCE, name); // from source
	}

	if (typeof content !== 'string' || force) {
		if (existsSync(libPath)) {
			content = readFileSync(libPath).toString();
		}
		else if (showError) {
			console.error(`Unable to load library ${name} at ${libPath}`);
			content = '';
		}
		contents[name] = content;
	}

	return content;
}


function getServerFolder() {
	if (process.env["aventus_server_folder"]) {
		return process.env["aventus_server_folder"];
	}
	if (__dirname.endsWith("modes")) {
		// dev
		return dirname(dirname(dirname(__dirname)));
	}
	// prod
	return dirname(dirname(__dirname));
}