import { createConnection, ProposedFeatures, _, _Connection } from 'vscode-languageserver/node';
import { AventusHTMLMode } from './modes/aventusHTML/mode';
import { AventusJSMode } from './modes/aventusJs/mode';
import { AventusJSONMode } from './modes/aventusJSON/mode';
import { AventusSCSSMode } from './modes/aventusSCSS/mode';

export let jsMode: AventusJSMode = new AventusJSMode();
export let jsonMode: AventusJSONMode = new AventusJSONMode();
export let htmlMode: AventusHTMLMode = new AventusHTMLMode();
export let scssMode: AventusSCSSMode = new AventusSCSSMode();

let connetion: _Connection<_, _, _, _, _, _, _> | undefined = undefined;
if (!process.env["AVENTUS_CLI"]) {
	connetion = createConnection(ProposedFeatures.all);
}
export const connectionWithClient: _Connection<_, _, _, _, _, _, _> | undefined = connetion;