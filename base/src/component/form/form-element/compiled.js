class AvFormElement extends WebComponent {
    static get observedAttributes() {return ["required", "name", "focusable"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    constructor() { super(); if (this.constructor == AvFormElement) { throw "can't instanciate an abstract class"; } }
    get 'required'() {
                        return this.hasAttribute('required');
                    }
                    set 'required'(val) {
                        if(val === 1 || val === 'true' || val === ''){
                            val = true;
                        }
                        else if(val === 0 || val === 'false' || val === null || val === undefined){
                            val = false;
                        }
                        if(val !== false && val !== true){
                            console.error("error setting boolean in required");
                            val = false;
                        }
                        if (val) {
                            this.setAttribute('required', 'true');
                        } else{
                            this.removeAttribute('required');
                        }
                    }get 'name'() {
                        return this.getAttribute('name');
                    }
                    set 'name'(val) {
                        this.setAttribute('name',val);
                    }get 'focusable'() {
                        return this.hasAttribute('focusable');
                    }
                    set 'focusable'(val) {
                        if(val === 1 || val === 'true' || val === ''){
                            val = true;
                        }
                        else if(val === 0 || val === 'false' || val === null || val === undefined){
                            val = false;
                        }
                        if(val !== false && val !== true){
                            console.error("error setting boolean in focusable");
                            val = false;
                        }
                        if (val) {
                            this.setAttribute('focusable', 'true');
                        } else{
                            this.removeAttribute('focusable');
                        }
                    }get 'value'() {
						return this.__mutable["value"];
					}
					set 'value'(val) {
						/*if (this.__mutable["value"]) {
							this.__mutable["value"].__unsubscribe(this.__mutableActionsCb["value"]);
						}*/
						this.__mutable["value"] = val;
						if (val) {
							//this.__mutable["value"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["value"]);
							//this.__mutableActionsCb["value"](MutableAction.SET, '', this.__mutable["value"]);
						}
						else{
							//this.__mutable["value"] = undefined;
						}
					}    __prepareMutablesActions() {
					this.__mutableActions["value"] = [];
						this.__mutableActionsCb["value"] = (action, path, value) => {
							for (let fct of this.__mutableActions["value"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["value"]){
								for(let fct of this.__onChangeFct["value"]){
									fct("value")
									/*if(path == ""){
										fct("value")
									}
									else{
										fct("value."+path);
									}*/
								}
							}
						}					super.__prepareMutablesActions();
				}__initMutables() {
					super.__initMutables();
					this["value"] = this.getDefaultValue();
				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<slot></slot>`,
            slots: {
                'default':`<slot></slot>`
            },
            blocks: {
                'default':`<slot></slot>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvFormElement", 0])
        return temp;
    }
    getClassName() {
        return "AvFormElement";
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('required')) { this.attributeChangedCallback('required', false, false); }if(!this.hasAttribute('name')){ this['name'] = ''; }if(!this.hasAttribute('focusable')) { this.attributeChangedCallback('focusable', false, false); } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('required');this.__upgradeProperty('name');this.__upgradeProperty('focusable'); }
    __listBoolProps() { return ["required","focusable"].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }
     postCreation(){this.findParentByType(AvForm).subscribe(this);} onValueChanged(){this.dispatchEvent(new CustomEvent("change", {    detail: {        value: this.value    }}));} setFocus(){}}
window.customElements.define('av-form-element', AvFormElement);