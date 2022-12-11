import * as connect from 'connect';
import * as send from 'send';
import * as url from 'url';
import { createServer, Server, ServerResponse } from 'http';
import { extname, join } from 'path';
import { readFileSync } from 'fs';
import { replace } from 'event-stream';
import serveIndex = require('serve-index');
import { INJECTED_CODE } from './injectedCode';
import { WebSocket, WebSocketServer } from 'ws';

export class HttpServer {
	private config = {
		host: '0.0.0.0',
		port: 8080,
		root: './dist',
		file: 'index.html',
		delay: 200,
	}
	private server: Server<any, any> | undefined;
	private reloadTimeout;
	private clients: WebSocket[] = [];

	public constructor() { }

	public start() {
		if (!this.server) {
			var app = connect();
			let staticServer = this.createStaticServer();
			app.use(staticServer)
				.use(this.entryPoint(staticServer, this.config.file))
				.use(serveIndex(this.config.root, { icons: true }) as any);
			this.server = createServer(app);
			this.server.addListener('listening', function (/*e*/) {
				console.log('listening');
			})

			this.clients = [];
			var wss = new WebSocketServer({ server: this.server });
			wss.on('connection', (ws) => {
				ws.onclose = () => {
					this.clients = this.clients.filter(function (x) {
						return x !== ws;
					});
				}
				this.clients.push(ws);
			})

			this.server.listen(this.config.port, this.config.host);
			this.server.close();
		}
	}
	public stop() {
		if (this.server) {
			this.server.close();
			this.server = undefined;
		}
	}

	public updateCSS(css: string, element: string, children: string[]) {
		this.send("update_css", { css, element, children });
	}
	public updateComponent(js: string, element: string, children: string[]) {
		this.send("update_component", { js, element, children });
	}
	public reload() {
		if (this.reloadTimeout) {
			clearTimeout(this.reloadTimeout);
		}
		this.reloadTimeout = setTimeout(() => {
			this._reload();
		}, this.config.delay)
	}
	private _reload() {
		this.send("reload", {});
	}
	private send(cmd: string, obj: {}) {
		let message = {
			cmd: cmd,
			params: obj
		}
		let content = JSON.stringify(message);
		for (let client of this.clients) {
			client.send(content);
		}
	}

	private escape(html: string) {
		return String(html)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
	private entryPoint(staticHandler, file) {
		return function (req, res, next) {
			req.url = "/" + file;
			staticHandler(req, res, next);
		};
	}
	private createStaticServer() {
		return (req: connect.IncomingMessage, res: ServerResponse<connect.IncomingMessage>, next: connect.NextFunction) => {
			if (req.method !== "GET" && req.method !== "HEAD") return next();
			var reqpath = url.parse(req.url || '').pathname || '';
			var hasNoOrigin = !req.headers.origin;
			var injectCandidates = [new RegExp("</body>", "i"), new RegExp("</head>", "i")];
			var injectTag: string | null = null;

			const directory = () => {
				var pathname = url.parse(req.originalUrl || '').pathname;
				res.statusCode = 301;
				res.setHeader('Location', pathname + '/');
				res.end('Redirecting to ' + this.escape(pathname || '') + '/');
			}

			function file(filepath /*, stat*/) {
				var x = extname(filepath).toLocaleLowerCase(), match,
					possibleExtensions = ["", ".html", ".htm", ".xhtml", ".php", ".svg"];
				if (hasNoOrigin && (possibleExtensions.indexOf(x) > -1)) {
					// TODO: Sync file read here is not nice, but we need to determine if the html should be injected or not
					var contents = readFileSync(filepath, "utf8");
					for (var i = 0; i < injectCandidates.length; ++i) {
						match = injectCandidates[i].exec(contents);
						if (match) {
							injectTag = match[0];
							break;
						}
					}

				}
			}

			function error(err) {
				if (err.status === 404) return next();
				next(err);
			}

			function inject(stream) {
				if (injectTag) {
					let tagToUse = injectTag;
					// We need to modify the length given to browser
					var len = INJECTED_CODE.length + Number(res.getHeader('Content-Length'));
					res.setHeader('Content-Length', len);
					var originalPipe = stream.pipe;
					stream.pipe = function (resp) {
						originalPipe.call(stream, replace(new RegExp(tagToUse, "i"), INJECTED_CODE + injectTag)).pipe(resp);
					};
				}
			}

			send(req, reqpath, { root: this.config.root })
				.on('error', error)
				.on('directory', directory)
				.on('file', file)
				.on('stream', inject)
				.pipe(res);
		};
	}
}