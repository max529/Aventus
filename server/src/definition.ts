
export enum AventusType {
    Component,
    Lib,
    Data,
    RAM,
    Socket,
    Static,
    Definition,
    Unknow
}
export const AventusLanguageId = {
    Base: "Aventus",
    TypeScript: "Aventus Ts",
    HTML: "Aventus HTML",
    SCSS: "Aventus SCSS",
    WebComponent: "Aventus WebComponent",
}
export const AventusExtension = {
    Base: ".avt",
    Config: "aventus.conf.json",
    ComponentLogic: ".wcl.avt",
    ComponentView: ".wcv.avt",
    ComponentStyle: ".wcs.avt",
    Component: ".wc.avt",
    Data: ".data.avt",
    Lib: ".lib.avt",
    RAM: ".ram.avt",
    Socket: ".socket.avt",
    Static: ".static.avt",
    Definition: ".def.avt"
}