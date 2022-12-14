var AventusTest;
(AventusTest||(AventusTest = {}));
(function (AventusTest) {
 var namespace = 'AventusTest';
class AvTodoData {    id = 0;    name = "";    state = AvTodoState.Waiting;}var AvTodoState;(function (AvTodoState) {    AvTodoState[AvTodoState["Waiting"] = 0] = "Waiting";    AvTodoState[AvTodoState["InProgress"] = 1] = "InProgress";    AvTodoState[AvTodoState["Done"] = 2] = "Done";})(AvTodoState || (AvTodoState = {}));
class AvLight {    name = "";    value = 0;    color = "";    values = [];}
class AvTodoList extends WebComponent {
    get 'items'() {
						return this.__watch["items"];
					}
					set 'items'(val) {
						this.__watch["items"] = val;
					}    __prepareWatchesActions() {
                this.__watchActions["items"] = [];
						this.__watchActionsCb["items"] = (action, path, value) => {
							for (let fct of this.__watchActions["items"]) {
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
						}                super.__prepareWatchesActions();
            }__initWatches() {
                super.__initWatches();
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
    getNamespace(){
        return namespace;
    }
     addItem(item){this.items.push(item);}}
window.customElements.define('av-todo-list', AvTodoList);

class AvTodoItem extends WebComponent {
    get 'item'() {
						return this.__watch["item"];
					}
					set 'item'(val) {
						this.__watch["item"] = val;
					}    __prepareWatchesActions() {
                this.__watchActions["item"] = [((target, action, path, value) => {    console.log(Aventus.WatchAction[action], path);})];
						this.__watchActionsCb["item"] = (action, path, value) => {
							for (let fct of this.__watchActions["item"]) {
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
						}                super.__prepareWatchesActions();
            }__initWatches() {
                super.__initWatches();
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
    getNamespace(){
        return namespace;
    }
}
window.customElements.define('av-todo-item', AvTodoItem);

class AvTodoCreation extends WebComponent {
    __prepareVariables() { super.__prepareVariables(); if(this.todoList === undefined) {this.todoList = undefined;} }
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
	<button @press="addTodo" _id="avtodocreation_1">Add</button>
</av-form>`,
            slots: {
            },
            blocks: {
                'default':`<av-form>
	<av-input label="Todo name" _id="avtodocreation_0"></av-input>
	<button @press="addTodo" _id="avtodocreation_1">Add</button>
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
    __mapSelectedElement() { super.__mapSelectedElement(); this.inputEl = this.shadowRoot.querySelector('[_id="avtodocreation_0"]');}
    getClassName() {
        return "AvTodoCreation";
    }
    getNamespace(){
        return namespace;
    }
    __addEvents(ids = null) { super.__addEvents(ids); 
                new Aventus.PressManager({
                    "element": this._components['avtodocreation_1'],
                    "onPress": (e, pressInstance) => {
                        this.addTodo(e, pressInstance);
                     },
                });
                 }
     addTodo(){let data = new AvTodoData();data.name = this.inputEl.value;this.todoList?.addItem(data);}}
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
    __mapSelectedElement() { super.__mapSelectedElement(); this.listEl = this.shadowRoot.querySelector('[_id="avtodo_0"]');this.creationEl = this.shadowRoot.querySelector('[_id="avtodo_1"]');}
    getClassName() {
        return "AvTodo";
    }
    getNamespace(){
        return namespace;
    }
     postCreation(){this.creationEl.todoList = this.listEl;}}
window.customElements.define('av-todo', AvTodo);

class AvInput extends AvFormElement {
    static get observedAttributes() {return ["label"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'label'() {
                    return this.getAttribute('label');
                }
                set 'label'(val) {
                    if(val === undefined || val === null){this.removeAttribute('label')}
                    else{this.setAttribute('label',val)}
                }    __getStyle() {
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
    __mapSelectedElement() { super.__mapSelectedElement(); this.inputEl = this.shadowRoot.querySelector('[_id="avinput_1"]');}
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['label'] = []this.__onChangeFct['label'].push((path) => {if("label".startsWith(path)){
                            for(var i = 0;i<this._components['avinput_0'].length;i++){
                            this._components['avinput_0'][i].innerHTML = ""+this.label+"".toString();
                        }
                    }}) }
    getClassName() {
        return "AvInput";
    }
    getNamespace(){
        return namespace;
    }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('label'); }
    __addEvents(ids = null) { super.__addEvents(ids); if (ids == null || ids.indexOf('avinput_1') != -1) {
                    if (this._components['avinput_1']) {
                        for (var i = 0; i < this._components['avinput_1'].length; i++) {
                            this._components['avinput_1'][i].addEventListener('input', (e) => { this.inputChanged(e) })
                        }
                    }
                } }
     getDefaultValue(){return "";} inputChanged(){this.value = this.inputEl.value;this.onValueChanged();}}
window.customElements.define('av-input', AvInput);

class AvComplexTest extends WebComponent {
    static get observedAttributes() {return ["testvariable"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'testvariable'() {
                    return this.getAttribute('testvariable');
                }
                set 'testvariable'(val) {
                    if(val === undefined || val === null){this.removeAttribute('testvariable')}
                    else{this.setAttribute('testvariable',val)}
                }    get 'data'() {
						return this.__watch["data"];
					}
					set 'data'(val) {
						this.__watch["data"] = val;
					}    __prepareWatchesActions() {
                this.__watchActions["data"] = [];
						this.__watchActionsCb["data"] = (action, path, value) => {
							for (let fct of this.__watchActions["data"]) {
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
						}                super.__prepareWatchesActions();
            }__initWatches() {
                super.__initWatches();
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
    __prepareForLoop(){ super.__prepareForLoop(); this.__loopTemplate['avcomplextest_5'] = `        <div _id="avcomplextest_3"></div>    `;this.__prepareForCreate['avcomplextest_5'] = (el, data, key, indexes) => {
                let result = {};
                let arr_avcomplextest_3 = Array.from(el.querySelectorAll('[_id="avcomplextest_3"]'));
                result[""] = [];result["$index$_i"] = [];result["$index$_j"] = [];
                for(let item of arr_avcomplextest_3){
                            item.__templates={};
                            item.__values={};
                            item.__values[""] = data;
                        result[""].push(item);
                        item.__templates[""] = [];item.__values["$index$_i"] = indexes["i"];
                        result["$index$_i"].push(item);
                        item.__templates["$index$_i"] = [];item.__values["$index$_j"] = indexes["j"];
                        result["$index$_j"].push(item);
                        item.__templates["$index$_j"] = [];/**replaceValue*/
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
                                }));item.__templates["$index$_i"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["$index$_j"]+") "+element.__values[""]+""));item.__templates["$index$_j"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["$index$_j"]+") "+element.__values[""]+""));item.__templates[""].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["$index$_j"]+") "+element.__values[""]+""));/**replaceTemplate*/
                            for(let propName in item.__templates){
                                for(let callback of item.__templates[propName]){
                                    callback(item);
                                }
                            }
                        }
                return result;
            };
            this.__loopTemplate['avcomplextest_4'] = `    <div _id="avcomplextest_1"></div>    <div _id="avcomplextest_2"></div>    <av-for item="value" in="light.values" class="values" index="j" _id="avcomplextest_5"></av-for>`;this.__prepareForCreate['avcomplextest_4'] = (el, data, key, indexes) => {
                let result = {};
                let arr_avcomplextest_1 = Array.from(el.querySelectorAll('[_id="avcomplextest_1"]'));let arr_avcomplextest_3 = Array.from(el.querySelectorAll('[_id="avcomplextest_3"]'));let arr_avcomplextest_2 = Array.from(el.querySelectorAll('[_id="avcomplextest_2"]'));
                result["color"] = [];result["$index$_i"] = [];result["name"] = [];result["$index$_i"] = [];result["j"] = [];result["value"] = [];result["value"] = [];
                for(let item of arr_avcomplextest_1){
                            item.__templates={};
                            item.__values={};
                            item.__values["color"] = data["color"];
                        result["color"].push(item);
                        item.__templates["color"] = [];item.__values["$index$_i"] = indexes["i"];
                        result["$index$_i"].push(item);
                        item.__templates["$index$_i"] = [];item.__values["name"] = data["name"];
                        result["name"].push(item);
                        item.__templates["name"] = [];/**replaceValue*/
                            item.__templates["color"].push(((element) => element.setAttribute("class", "btn-"+element.__values["color"]+"")));item.__templates["$index$_i"].push(((element) => element.innerHTML = ""+element.__values["$index$_i"]+") "+element.__values["name"]+" is "+element.__values["color"]+""));item.__templates["name"].push(((element) => element.innerHTML = ""+element.__values["$index$_i"]+") "+element.__values["name"]+" is "+element.__values["color"]+""));item.__templates["color"].push(((element) => element.innerHTML = ""+element.__values["$index$_i"]+") "+element.__values["name"]+" is "+element.__values["color"]+""));item.__templates["name"].push(((element, forceRefreshView = false) => {
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
                                }));/**replaceTemplate*/
                            for(let propName in item.__templates){
                                for(let callback of item.__templates[propName]){
                                    callback(item);
                                }
                            }
                        }for(let item of arr_avcomplextest_3){
                            item.__templates={};
                            item.__values={};
                            item.__values["$index$_i"] = indexes["i"];
                        result["$index$_i"].push(item);
                        item.__templates["$index$_i"] = [];item.__values["j"] = data["j"];
                        result["j"].push(item);
                        item.__templates["j"] = [];item.__values["value"] = data["value"];
                        result["value"].push(item);
                        item.__templates["value"] = [];/**replaceValue*/
                            item.__templates["$index$_i"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["j"]+") "+element.__values["value"]+""));item.__templates["j"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["j"]+") "+element.__values["value"]+""));item.__templates["value"].push(((element) => element.innerHTML = "("+element.__values["$index$_i"]+"."+element.__values["j"]+") "+element.__values["value"]+""));/**replaceTemplate*/
                            for(let propName in item.__templates){
                                for(let callback of item.__templates[propName]){
                                    callback(item);
                                }
                            }
                        }for(let item of arr_avcomplextest_2){
                            item.__templates={};
                            item.__values={};
                            item.__values["value"] = data["value"];
                        result["value"].push(item);
                        item.__templates["value"] = [];/**replaceValue*/
                            item.__templates["value"].push(((element) => element.innerHTML = ""+element.__values["value"]+"%"));/**replaceTemplate*/
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
    __mapSelectedElement() { super.__mapSelectedElement(); this.salut = this.shadowRoot.querySelector('[_id="avcomplextest_0"]');this.valueTest = this.shadowRoot.querySelector('[_id="avcomplextest_2"]');}
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['testvariable'] = []this.__onChangeFct['testvariable'].push((path) => {if("testvariable".startsWith(path)){
                            for(var i = 0;i<this._components['avcomplextest_0'].length;i++){
                            this._components['avcomplextest_0'][i].innerHTML = ""+this.testvariable+"".toString();
                        }
                    }}) }
    getClassName() {
        return "AvComplexTest";
    }
    getNamespace(){
        return namespace;
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('testvariable')){ this['testvariable'] = 'test'; } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('testvariable'); }
     postCreation(){let i = 0;let lightT = new AvLight();lightT.name = "light test";lightT.value = 80;lightT.color = "red";window["light"] = lightT;window["temp1"] = this;let interval = setInterval(() => {    i++;    let light = new AvLight();    light.name = "light " + i;    light.value = 80;    light.color = "red";    let nb = [];    for (let j = 0; j < 3; j++) {        nb.push(0);    }    this.data.push(light);    if (i == 10) {        console.log(JSON.parse(JSON.stringify(this.data)));        clearInterval(interval);    }}, 0);}}
window.customElements.define('av-complex-test', AvComplexTest);
AventusTest.AvTodoData=AvTodoData;
AventusTest.AvTodoState=AvTodoState;
AventusTest.AvLight=AvLight;
AventusTest.AvTodoList=AvTodoList;
AventusTest.AvTodoItem=AvTodoItem;
AventusTest.AvTodoCreation=AvTodoCreation;
AventusTest.AvTodo=AvTodo;
AventusTest.AvInput=AvInput;
AventusTest.AvComplexTest=AvComplexTest;
})(AventusTest);
