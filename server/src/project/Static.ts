import { AventusConfigStatic } from "../language-services/json/definition";
import { Project } from "./Project";
import { FSWatcher, watch } from "chokidar";
import { normalize, sep } from "path";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
const nodeSass = require('sass');
import * as cheerio from 'cheerio';

export class Static {
    private project: Project;
    private staticConfig: AventusConfigStatic;

    private watcher: FSWatcher | undefined;
    private isReady: boolean = false;

    public get name() {
        return this.staticConfig.name;
    }

    public constructor(project: Project, staticConfig: AventusConfigStatic) {
        this.project = project;
        this.staticConfig = staticConfig;

        this.registerWatcher();
        this.isReady = true;
        this.export();
    }
    public export() {
        if (this.isReady) {
            const foundAll = (dir) => {
                var result: string[] = [];
                var recu = (dir) => {
                    let content = readdirSync(dir);
                    content.forEach(name => {
                        let completePath = dir + '/' + name;
                        if (lstatSync(completePath).isDirectory()) {
                            // If it is another directory
                            let files = recu(completePath);
                            if (files.length > 0) {
                                result.concat(files);
                            }
                        } else {
                            result.push(completePath);
                        }
                    });
                    return result;
                }
                result = recu(dir);
                return result;
            }
            const recuCheckColor = (el, name) => {
                for (var key in el.attribs) {
                    if (el.attribs[key].startsWith('#')) {
                        var color = el.attribs[key];
                        if (this.staticConfig.colorsMap && this.staticConfig.colorsMap[color]) {
                            el.attribs['class-' + key] = this.staticConfig.colorsMap[color];
                        } else {
                            //console.error('unknow color ' + color + ' in file ' + name);
                        }
                    }
                }
                if (el.children) {
                    for (var i = 0; i < el.children.length; i++) {
                        recuCheckColor(el.children[i], name);
                    }
                }
            }
            const copyFile = (pathFile, pathOut) => {
                pathOut = normalize(pathOut);
                let splitted = pathOut.split(sep);
                let filename = splitted.pop();
                let folder = splitted.join(sep);

                if (!existsSync(folder)) {
                    mkdirSync(folder, { recursive: true });
                }
                if (filename.endsWith(".scss")) {
                    if (!filename.startsWith("_")) {
                        let style = nodeSass.compile(pathFile, {
                            style: 'compressed',
                        }).css.toString().trim();
                        writeFileSync(pathOut.replace(".scss", ".css"), style);
                    }
                }
                else if (filename.endsWith(".svg")) {
                    let ctx = readFileSync(pathFile, 'utf8');
                    let $ = cheerio.load(ctx);
                    if (this.staticConfig.colorsMap) {
                        recuCheckColor($._root, pathFile);
                    }
                    let result = $('body').html();
                    if (result == null) {
                        result = "";
                    }
                    writeFileSync(pathOut, result);
                }
                else {
                    copyFileSync(pathFile, pathOut)
                }
            }
            let staticFiles = foundAll(this.staticConfig.inputPathFolder);
            staticFiles.forEach(filePath => {
                filePath = filePath.replace(/\\/g, '/');
                let resultPath = filePath.replace(this.staticConfig.inputPathFolder, this.staticConfig.outputPathFolder)
                copyFile(filePath, resultPath);
            })
        }
    }
    public registerWatcher() {
        if (this.staticConfig.hasOwnProperty("exportOnChange") && !this.staticConfig.exportOnChange) {
            return;
        }

        this.watcher = watch(this.staticConfig.inputPathFolder, {
            ignored: /^\./,
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100
            },
            ignoreInitial: true,
        });
        this.watcher.on('add', (path) => {
            this.export();
        })
        this.watcher.on('change', (path) => {
            this.export();
        })
        this.watcher.on('unlink', (path) => {
            this.export();
        })
        this.watcher.on('error', function (error) { })
    }

    public destroy() {
        if (this.watcher) {
            this.watcher.close();
        }
    }
}