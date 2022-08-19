class AvTodoData {
class AvLight {

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
				}
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
    __prepareForLoop(){ super.__prepareForLoop(); this.__loopTemplate['avtodolist_1'] = `    <av-todo-item _id="avtodolist_0"></av-todo-item>`;
					let result = {};
					let arr_avtodolist_0 = Array.from(el.querySelectorAll('[_id="avtodolist_0"]'));
					result[""] = [];
					for(let item of arr_avtodolist_0){
								item.__templates={};
								item.__values={};
								item.__values[""] = data;
							result[""].push(item);
							item.__templates[""] = [];
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
									}));
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
     addItem(item){this.items.push(item);}
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
					}
					this.__mutableActions["item"] = [((target, action, path, value) => {
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
				}
					super.__initMutables();
					this["item"] = new AvTodoData();
				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host{display:block;margin:10px 0}:host .name::before{content:" - ";display:inline-block;margin-right:15px;margin-left:15px}`);
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
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['item'] = []
									for(var i = 0;i<this._components['avtodoitem_0'].length;i++){
									this._components['avtodoitem_0'][i].innerHTML = ""+this.item.state+"".toString();
								}
							}})
									for(var i = 0;i<this._components['avtodoitem_1'].length;i++){
									this._components['avtodoitem_1'][i].innerHTML = ""+this.item.name+"".toString();
								}
							}})
    getClassName() {
        return "AvTodoItem";
    }
}
window.customElements.define('av-todo-item', AvTodoItem);
class AvTodoCreation extends WebComponent {
    __prepareVariables() { super.__prepareVariables(); if(this.todoList === undefined) {this.todoList = undefined;}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<av-form>
	<av-input label="Todo name" _id="avtodocreation_0"></av-input>
	<button av-press="addTodo" _id="avtodocreation_1">Add</button>
</av-form>`,
            slots: {
            },
            blocks: {
                'default':`<av-form>
	<av-input label="Todo name" _id="avtodocreation_0"></av-input>
	<button av-press="addTodo" _id="avtodocreation_1">Add</button>
</av-form>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvTodoCreation", 2])
        return temp;
    }
    get inputEl () {
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avtodocreation_0"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
        return "AvTodoCreation";
    }
    __addEvents(ids = null) { super.__addEvents(ids); 
                new PressManager({
                    "element": this._components['avtodocreation_1'],
                    "onPress": (e) => {
                        this.addTodo(e, this);
                     },
                });
                 }
     addTodo(){var _a;
window.customElements.define('av-todo-creation', AvTodoCreation);
class AvTodo extends WebComponent {
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host{display:flex;flex-direction:column}:host av-todo-list{margin-bottom:30px}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<h1>My todo list</h1>
<av-todo-list _id="avtodo_0"></av-todo-list>
<av-todo-creation _id="avtodo_1"></av-todo-creation>`,
            slots: {
            },
            blocks: {
                'default':`<h1>My todo list</h1>
<av-todo-list _id="avtodo_0"></av-todo-list>
<av-todo-creation _id="avtodo_1"></av-todo-creation>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvTodo", 2])
        return temp;
    }
    get listEl () {
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avtodo_0"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avtodo_1"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
        return "AvTodo";
    }
     postCreation(){this.creationEl.todoList = this.listEl;}
window.customElements.define('av-todo', AvTodo);
class AvInput extends AvFormElement {
    static get observedAttributes() {return ["label"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'label'() {
                        return this.getAttribute('label');
                    }
                    set 'label'(val) {
                        this.setAttribute('label',val);
                    }
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<label for="test" _id="avinput_0"></label>
<input id="test" _id="avinput_1">`,
            slots: {
            },
            blocks: {
                'default':`<label for="test" _id="avinput_0"></label>
<input id="test" _id="avinput_1">`
            }
        }
                let newHtml = parentInfo.html
                for (let blockName in info.blocks) {
                    if (!parentInfo.slots.hasOwnProperty(blockName)) {
                        throw "can't found slot with name " + blockName;
                    }
                    newHtml = newHtml.replace(parentInfo.slots[blockName], info.blocks[blockName]);
                }
                info.html = newHtml;
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvInput", 2])
        return temp;
    }
    get inputEl () {
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avinput_1"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
									for(var i = 0;i<this._components['avinput_0'].length;i++){
									this._components['avinput_0'][i].innerHTML = ""+this.label+"".toString();
								}
							}})
    getClassName() {
        return "AvInput";
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('label')){ this['label'] = ''; }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('label');
    __addEvents(ids = null) { super.__addEvents(ids); if (ids == null || ids.indexOf('avinput_1') != -1) {
                    if (this._components['avinput_1']) {
                        for (var i = 0; i < this._components['avinput_1'].length; i++) {
                            this._components['avinput_1'][i].addEventListener('input', (e) => { this.inputChanged(e) })
                        }
                    }
                } }
     getDefaultValue(){return "";}
window.customElements.define('av-input', AvInput);
class AvComplexTest extends WebComponent {
    static get observedAttributes() {return ["testvariable"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'testvariable'() {
                        return this.getAttribute('testvariable');
                    }
                    set 'testvariable'(val) {
                        this.setAttribute('testvariable',val);
                    }
						return this.__mutable["data"];
					}
					set 'data'(val) {
						/*if (this.__mutable["data"]) {
							this.__mutable["data"].__unsubscribe(this.__mutableActionsCb["data"]);
						}*/
						this.__mutable["data"] = val;
						if (val) {
							//this.__mutable["data"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["data"]);
							//this.__mutableActionsCb["data"](MutableAction.SET, '', this.__mutable["data"]);
						}
						else{
							//this.__mutable["data"] = undefined;
						}
					}
					this.__mutableActions["data"] = [];
						this.__mutableActionsCb["data"] = (action, path, value) => {
							for (let fct of this.__mutableActions["data"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["data"]){
								for(let fct of this.__onChangeFct["data"]){
									fct("data")
									/*if(path == ""){
										fct("data")
									}
									else{
										fct("data."+path);
									}*/
								}
							}
						}
				}
					super.__initMutables();
					this["data"] = [];
				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host av-for{width:400px}:host av-for div{float:left;width:50%;border:1px solid #000;box-sizing:border-box;text-align:center}:host av-for div.btn-red{background-color:red}:host av-for div.btn-blue{background-color:blue}:host av-for div.btn-green{background-color:green}:host av-for .values{margin-top:10px}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<h2 _id="avcomplextest_0"></h2>
<av-for item="light" in="data" index="i" _id="avcomplextest_4"></av-for>`,
            slots: {
            },
            blocks: {
                'default':`<h2 _id="avcomplextest_0"></h2>
<av-for item="light" in="data" index="i" _id="avcomplextest_4"></av-for>`
            }
        }
        return info;
    }
    __prepareForLoop(){ super.__prepareForLoop(); this.__loopTemplate['avcomplextest_5'] = `        <div _id="avcomplextest_3"></div>    `;
					let result = {};
					let arr_avcomplextest_3 = Array.from(el.querySelectorAll('[_id="avcomplextest_3"]'));
					result[""] = [];
					for(let item of arr_avcomplextest_3){
								item.__templates={};
								item.__values={};
								item.__values[""] = data;
							result[""].push(item);
							item.__templates[""] = [];
							result["$index$_i"].push(item);
							item.__templates["$index$_i"] = [];
							result["$index$_j"].push(item);
							item.__templates["$index$_j"] = [];
								item.__templates[""].push(((element, forceRefreshView = false) => {
										let varToCheck = element.__values[""];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["nb"] = varToCheck;
										}
										else{
											element.setAttribute("nb", ""+element.__values[""]+"");
										}
										if (forceRefreshView) {
											if(element.__onChangeFct && element.__onChangeFct["nb"]){
												for(let fct of element.__onChangeFct["nb"]){
													fct("nb")
												}
											}
										}
									}));
								for(let propName in item.__templates){
									for(let callback of item.__templates[propName]){
										callback(item);
									}
								}
							}
					return result;
				};
				this.__loopTemplate['avcomplextest_4'] = `    <div _id="avcomplextest_1"></div>    <div _id="avcomplextest_2"></div>    <av-for item="value" in="light.values" class="values" index="j" _id="avcomplextest_5"></av-for>`;
					let result = {};
					let arr_avcomplextest_1 = Array.from(el.querySelectorAll('[_id="avcomplextest_1"]'));
					result["color"] = [];
					for(let item of arr_avcomplextest_1){
								item.__templates={};
								item.__values={};
								item.__values["color"] = data["color"];
							result["color"].push(item);
							item.__templates["color"] = [];
							result["$index$_i"].push(item);
							item.__templates["$index$_i"] = [];
							result["name"].push(item);
							item.__templates["name"] = [];
								item.__templates["color"].push(((element) => element.setAttribute("class", "btn-"+element.__values["color"]+"")));
										let varToCheck = element.__values["name"];
										if(varToCheck instanceof Object && !(varToCheck instanceof Date)){
											element["name"] = varToCheck;
										}
										else{
											element.setAttribute("name", ""+element.__values["name"]+"");
										}
										if (forceRefreshView) {
											if(element.__onChangeFct && element.__onChangeFct["name"]){
												for(let fct of element.__onChangeFct["name"]){
													fct("name")
												}
											}
										}
									}));
								for(let propName in item.__templates){
									for(let callback of item.__templates[propName]){
										callback(item);
									}
								}
							}
								item.__templates={};
								item.__values={};
								item.__values["$index$_i"] = indexes["i"];
							result["$index$_i"].push(item);
							item.__templates["$index$_i"] = [];
							result["j"].push(item);
							item.__templates["j"] = [];
							result["value"].push(item);
							item.__templates["value"] = [];
								item.__templates["$index$_i"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["j"]+") "+element.__values["value"]+""));
								for(let propName in item.__templates){
									for(let callback of item.__templates[propName]){
										callback(item);
									}
								}
							}
								item.__templates={};
								item.__values={};
								item.__values["value"] = data["value"];
							result["value"].push(item);
							item.__templates["value"] = [];
								item.__templates["value"].push(((element) => element.innerHTML = ""+element.__values["value"]+"%"));
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
        temp.push(["AvComplexTest", 6])
        return temp;
    }
    get salut () {
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avcomplextest_0"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
                        var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avcomplextest_2"]'));
                        if(list.length == 1){
                            list = list[0]
                        }
                        return list;
                    }
									for(var i = 0;i<this._components['avcomplextest_0'].length;i++){
									this._components['avcomplextest_0'][i].innerHTML = ""+this.testvariable+"".toString();
								}
							}})
    getClassName() {
        return "AvComplexTest";
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('testvariable')){ this['testvariable'] = 'test'; }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('testvariable');
     postCreation(){let i = 0;
window.customElements.define('av-complex-test', AvComplexTest);