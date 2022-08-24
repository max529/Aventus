class AvSelect extends AvFormElement {
    static get observedAttributes() {return ["label"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'label'() {
                        return this.getAttribute('label');
                    }
                    set 'label'(val) {
                        this.setAttribute('label',val);
                    }get 'value_display'() {
						return this.__mutable["value_display"];
					}
					set 'value_display'(val) {
						/*if (this.__mutable["value_display"]) {
							this.__mutable["value_display"].__unsubscribe(this.__mutableActionsCb["value_display"]);
						}*/
						this.__mutable["value_display"] = val;
						if (val) {
							//this.__mutable["value_display"] = Object.transformIntoWatcher(val, this.__mutableActionsCb["value_display"]);
							//this.__mutableActionsCb["value_display"](MutableAction.SET, '', this.__mutable["value_display"]);
						}
						else{
							//this.__mutable["value_display"] = undefined;
						}
					}    __prepareMutablesActions() {
					this.__mutableActions["value_display"] = [];
						this.__mutableActionsCb["value_display"] = (action, path, value) => {
							for (let fct of this.__mutableActions["value_display"]) {
								fct(this, action, path, value);
							}
							if(this.__onChangeFct["value_display"]){
								for(let fct of this.__onChangeFct["value_display"]){
									fct("value_display")
									/*if(path == ""){
										fct("value_display")
									}
									else{
										fct("value_display."+path);
									}*/
								}
							}
						}					super.__prepareMutablesActions();
				}__initMutables() {
					super.__initMutables();
					this["value_display"] = "";
				}
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host{position:relative;margin-top:18px;display:inline-block}:host label{font-family:"Nunito",sans-serif;-webkit-font-smoothing:antialiased;font-weight:400;color:#757575;transform:translate(0, -75%) scale(0.75);position:absolute;left:0;top:2px;font-size:16px;font-weight:400;pointer-events:none;transform-origin:0;transition:transform .1s ease-in,color .1s ease-in,-webkit-transform .1s ease-in}:host .selected{position:relative;display:inline-block;color:#212121;min-width:100px;letter-spacing:0;box-shadow:none;background-size:100% 2px;background-repeat:no-repeat;background-position:center bottom;background-color:rgba(0,0,0,0);background-image:linear-gradient(to top, transparent 1px, #afafaf 1px);font-size:12px;font-weight:400;border:none;padding-bottom:2px;border-radius:0;height:24px;padding-right:24px;line-height:24px;vertical-align:middle;-webkit-transform:translate3d(0, 0, 0);-moz-user-select:none;width:100%;box-sizing:border-box}:host .selected svg{position:absolute;right:0;top:0;bottom:0;margin:auto 0;z-index:0;fill:rgba(0,0,0,.87)}:host av-hideable .container{position:absolute;border-radius:5px;background-color:#fff;max-width:400px;z-index:5;box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12),0 3px 1px -2px rgba(0,0,0,.2)}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<label _id="avselect_0"></label>
<div class="selected" _id="avselect_1">
    <span _id="avselect_2"></span>
    <svg class="caret" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10l5 5 5-5z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
    </svg>
</div>
<av-hideable _id="avselect_3">
    <div class="container" _id="avselect_4">
        <slot></slot>
    </div>
</av-hideable>`,
            slots: {
                'default':`<slot></slot>`
            },
            blocks: {
                'default':`<label _id="avselect_0"></label>
<div class="selected" _id="avselect_1">
    <span _id="avselect_2"></span>
    <svg class="caret" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10l5 5 5-5z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
    </svg>
</div>
<av-hideable _id="avselect_3">
    <div class="container" _id="avselect_4">
        <slot></slot>
    </div>
</av-hideable>`
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
        temp.push(["AvSelect", 5])
        return temp;
    }
    get baseEl () {
										return this.shadowRoot.querySelector('[_id="avselect_1"]');
									}get test () {
										var list = Array.from(this.shadowRoot.querySelectorAll('[_id="avselect_0"]'));
										return list;
									}    __mapSelectedElement() { super.__mapSelectedElement(); this.hider = this.shadowRoot.querySelector('[_id="avselect_3"]');this.options = this.shadowRoot.querySelector('[_id="avselect_4"]');}
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['label'] = []this.__onChangeFct['label'].push((path) => {if("label".startsWith(path)){
									for(var i = 0;i<this._components['avselect_0'].length;i++){
									this._components['avselect_0'][i].innerHTML = ""+this.label+"".toString();
								}
							}})this.__onChangeFct['value_display'] = []this.__onChangeFct['value_display'].push((path) => {if("value_display".startsWith(path)){
									for(var i = 0;i<this._components['avselect_2'].length;i++){
									this._components['avselect_2'][i].innerHTML = ""+this.value_display+"".toString();
								}
							}}) }
    __endConstructor() { super.__endConstructor(); (() => {})() }
    getClassName() {
        return "AvSelect";
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('label')){ this['label'] = ''; } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('label'); }
     getDefaultValue(){return "";} selectValueText(){for (var i = 0; i < this.children.length; i++) {    if (this.children[i] instanceof AvOption) {        let optionEl = this.children[i];        if (this.value == optionEl.value) {            this.value_display = this.children[i].innerHTML;            return;        }    }}this.value_display = '';} openOptions(){this.options.innerHTML = '';var list = this.children;for (var i = 0; i < list.length; i++) {    if (list[i] instanceof AvOption) {        let optionEl = list[i];        if (optionEl.value == this.value) {            optionEl.selected = true;        }        else {            optionEl.selected = false;        }        var clone = optionEl.cloneNode(true);        clone.addEventListener('click', (e) => {            this.selectOption(e.currentTarget);        });        this.options.appendChild(clone);    }}this.hider.show();var offset = this.baseEl.getPositionOnScreen();this.options.style.left = offset.x + 'px';this.options.style.top = offset.y + this.baseEl.offsetHeight + 2 + 'px';this.options.style.minWidth = this.offsetWidth + 'px';} selectOption(opt){this.value = opt.value;this.value_display = opt.innerHTML;this.onValueChanged();this.hider.hide(true);} postCreation(){let valueAttr = this.getAttribute("value");if (valueAttr) {    this.value = valueAttr;    this.removeAttribute("value");}var list = this.children;for (var i = 0; i < list.length; i++) {    if (!(list[i] instanceof AvOption)) {        list[i].remove();        i--;    }    else {        let optionEl = list[i];        if (optionEl.selected) {            this.value = optionEl.value;        }    }}this.addEventListener('click', () => {    this.openOptions();});let form = this.findParentByTag("av-form");if (form) {    form.subscribe(this);}setTimeout(() => {    this.selectValueText();});}}
window.customElements.define('av-select', AvSelect);
class AvOption extends WebComponent {
    static get observedAttributes() {return ["value", "selected"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'value'() {
                        return this.getAttribute('value');
                    }
                    set 'value'(val) {
                        this.setAttribute('value',val);
                    }get 'selected'() {
                        return this.hasAttribute('selected');
                    }
                    set 'selected'(val) {
                        if(val === 1 || val === 'true' || val === ''){
                            val = true;
                        }
                        else if(val === 0 || val === 'false' || val === null || val === undefined){
                            val = false;
                        }
                        if(val !== false && val !== true){
                            console.error("error setting boolean in selected");
                            val = false;
                        }
                        if (val) {
                            this.setAttribute('selected', 'true');
                        } else{
                            this.removeAttribute('selected');
                        }
                    }    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host{padding:5px;width:100%;font-size:12px;box-sizing:border-box;display:block;width:100%;transition:background-color .5s;cursor:pointer}:host([selected]){background-color:rgba(0,0,0,.1)}:host(:hover){background-color:rgba(0,0,0,.1)}:host(:first-child){border-top-left-radius:5px;border-top-right-radius:5px}:host(:last-child){border-bottom-left-radius:5px;border-bottom-right-radius:5px}`);
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
        temp.push(["AvOption", 0])
        return temp;
    }
    getClassName() {
        return "AvOption";
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('value')){ this['value'] = ''; }if(!this.hasAttribute('selected')) { this.attributeChangedCallback('selected', false, false); } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('value');this.__upgradeProperty('selected'); }
    __listBoolProps() { return ["selected"].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }
     postCreation(){if (this.value == '') {    this.value = this.innerHTML;}}}
window.customElements.define('av-option', AvOption);