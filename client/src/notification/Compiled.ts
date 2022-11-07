import { Singleton } from "../Singleton";

export class Compiled {
    public static cmd: string = "aventus/compiled";

    public static action(buildName: string) {
        let n = new Date();
        let h: number | string = n.getHours();
        if (h < 10) {
            h = '0' + h;
        }
        let m: number | string = n.getMinutes();
        if (m < 10) {
            m = '0' + m;
        }
        let s: number | string = n.getSeconds();
        if (s < 10) {
            s = '0' + s;
        }
        if (Singleton.client.components) {
            Singleton.client.components.lastCompiledInfo.text = "Aventus: " + buildName + " compiled at " + h + ":" + m + ":" + s;
        }
    }
}