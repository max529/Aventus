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
					}    __prepareMutablesActions() {
					this.__mutableActions["item"] = [(() => {    console.log("Changed");})];
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
						}					super.__prepareMutablesActions();
				}__initMutables() {
					super.__initMutables();
					this["item"] = new AvTodoData();
				}
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