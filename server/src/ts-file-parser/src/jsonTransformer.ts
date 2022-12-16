export class JSONTransformer {
    public static unique(arr: string[]): string[] {
        let obj = {};
        for (var i = 0; i < arr.length; i++) {
          var str = arr[i];
          obj[str] = true;
        }
        return Object.keys(obj);
    }

    public static toValidateView( obj: any ): any {
        var self;
        let text = obj.getFullText()
        eval("self = " + obj.getFullText());
        return self;
    }
}