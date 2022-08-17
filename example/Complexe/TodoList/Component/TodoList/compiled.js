class AvTodoList extends WebComponent {
    get 'items'() {
						return this.__mutable["items"];
					}
					set 'items'(val) {
						/*if (this.__mutable["items"]) {
							this.__mutable["items"].__unsubscribe(this.__mutableActionsCb["items"]);
						}*/
						this.__mutable["items"] = val;
						if (val) {
							//this.__mutable["items"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["items"]);
							//this.__mutableActionsCb["items"](MutableAction.SET, '', this.__mutable["items"]);
						}
						else{
							//this.__mutable["items"] = undefined;
						}
					}    __prepareMutablesActions() {
					this.__mutableActions["items"] = [];
						this.__mutableActionsCb["items"] = (action, path, value) => {
							for (let fct of this.__mutableActions["items"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["items"]){
								for(let fct of this.__onChangeFct["items"]){
									fct("items")
									/*if(path == ""){
										fct("items")
									}
									else{
										fct("items."+path);
									}*/
								}
							}
						}					super.__prepareMutablesActions();
				}__initMutables() {
					super.__initMutables();
					this["items"] = [];
				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<av-for in="items" item="item" index="i" _id="avtodolist_1"></av-for>`,
            slots: {
            },
            blocks: {
                'default':`<av-for in="items" item="item" index="i" _id="avtodolist_1"></av-for>`
            }
        }
        return info;
    }
    __prepareForLoop(){ super.__prepareForLoop(); this.__loopTemplate['avtodolist_1'] = `    <av-todo-item _id="avtodolist_0"></av-todo-item>`;this.__prepareForCreate['avtodolist_1'] = (el, data, key, indexes) => {
					let result = {};
					let arr_avtodolist_0 = Array.from(el.querySelectorAll('[_id="avtodolist_0"]'));
					result[""] = [];
					for(let item of arr_avtodolist_0){
								item.__templates={};
								item.__values={};
								item.__values[""] = data;
							result[""].push(item);
							item.__templates[""] = [];/**replaceValue*/
								item.__templates[""].push(((element, forceRefreshView = false) => {
										let varToCheck = element.__values[""];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["item"] = varToCheck;
										}
										else{
											element.setAttribute("item", ""+element.__values[""]+"");
										}
										if (forceRefreshView) {
											if(element.__onChangeFct && element.__onChangeFct["item"]){
												for(let fct of element.__onChangeFct["item"]){
													fct("item")
												}
											}
										}
									}));/**replaceTemplate*/
								for(let propName in item.__templates){
									for(let callback of item.__templates[propName]){
										callback(item);
									}
								}
							}
					return result;
				};
				 }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvTodoList", 2])
        return temp;
    }
    getClassName() {
        return "AvTodoList";
    }
}
window.customElements.define('av-todo-list', AvTodoList);