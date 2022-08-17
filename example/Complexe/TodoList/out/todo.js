class AvTodoData {    constructor() {        this.id = 0;        this.name = "";        this.state = AvTodoState.Waiting;    }}var AvTodoState;(function (AvTodoState) {    AvTodoState[AvTodoState["Waiting"] = 0] = "Waiting";    AvTodoState[AvTodoState["InProgress"] = 1] = "InProgress";    AvTodoState[AvTodoState["Done"] = 2] = "Done";})(AvTodoState || (AvTodoState = {}));

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
					}    __prepareMutables() {
					super.__prepareMutables();
					if (!this.__mutable) {
						this.__mutable = Object.transformIntoWatcher({}, (type, path, element) => {
							console.log("mutable", type, path, element);
							let action = this.__mutableActionsCb[path.split(".")[0]] || this.__mutableActionsCb[path.split("[")[0]];
							action(type, path, element);
						});
					}
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
						}
					this["items"] = []				}
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
								item.__templates[""].push(((element) => {
										let varToCheck = element.__values[""];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["item"] = varToCheck;
										}
										else{
											element.setAttribute("item", ""+element.__values[""]+"");
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
class AvTodoItem extends WebComponent {
    get 'item'() {
						return this.__mutable["item"];
					}
					set 'item'(val) {
						/*if (this.__mutable["item"]) {
							this.__mutable["item"].__unsubscribe(this.__mutableActionsCb["item"]);
						}*/
						this.__mutable["item"] = val;
						if (val) {
							//this.__mutable["item"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["item"]);
							//this.__mutableActionsCb["item"](MutableAction.SET, '', this.__mutable["item"]);
						}
						else{
							//this.__mutable["item"] = undefined;
						}
					}    __prepareMutables() {
					super.__prepareMutables();
					if (!this.__mutable) {
						this.__mutable = Object.transformIntoWatcher({}, (type, path, element) => {
							console.log("mutable", type, path, element);
							let action = this.__mutableActionsCb[path.split(".")[0]] || this.__mutableActionsCb[path.split("[")[0]];
							action(type, path, element);
						});
					}
					this.__mutableActions["item"] = [];
						this.__mutableActionsCb["item"] = (action, path, value) => {
							for (let fct of this.__mutableActions["item"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["item"]){
								for(let fct of this.__onChangeFct["item"]){
									fct("item")
									/*if(path == ""){
										fct("item")
									}
									else{
										fct("item."+path);
									}*/
								}
							}
						}
					this["item"] = "new AvTodoData()"				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<div class="state" _id="avtodoitem_0"></div>
<div class="name" _id="avtodoitem_1"></div>`,
            slots: {
            },
            blocks: {
                'default':`<div class="state" _id="avtodoitem_0"></div>
<div class="name" _id="avtodoitem_1"></div>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvTodoItem", 2])
        return temp;
    }
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['item'] = []this.__onChangeFct['item'].push((path) => {if("item.state".startsWith(path)){
									for(var i = 0;i<this._components['avtodoitem_0'].length;i++){
									this._components['avtodoitem_0'][i].innerHTML = ""+this.item.state+"".toString();
								}
							}})this.__onChangeFct['item'] = []this.__onChangeFct['item'].push((path) => {if("item.name".startsWith(path)){
									for(var i = 0;i<this._components['avtodoitem_1'].length;i++){
									this._components['avtodoitem_1'][i].innerHTML = ""+this.item.name+"".toString();
								}
							}}) }
    getClassName() {
        return "AvTodoItem";
    }
}
window.customElements.define('av-todo-item', AvTodoItem);