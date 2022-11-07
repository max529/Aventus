var AventusTest;(function (AventusTest) {
 var namespace = 'AventusTest';class AvSelect extends Aventus.AvFormElement {
    static get observedAttributes() {return ["label"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'label'() {
                    return this.getAttribute('label');
                }
                set 'label'(val) {
                    if(val === undefined || val === null){this.removeAttribute('label')}
                    else{this.setAttribute('label',val)}
                }    get 'value_display'() {
						return this.__watch["value_display"];
					}
					set 'value_display'(val) {
						this.__watch["value_display"] = val;
					}    __prepareWatchesActions() {
                this.__watchActions["value_display"] = [];
						this.__watchActionsCb["value_display"] = (action, path, value) => {
							for (let fct of this.__watchActions["value_display"]) {
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
						}                super.__prepareWatchesActions();
            }__initWatches() {
                super.__initWatches();
                this["value_display"] = "";
            }
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(``);
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
    __mapSelectedElement() { super.__mapSelectedElement(); this.hider = this.shadowRoot.querySelector('[_id="avselect_3"]');this.options = this.shadowRoot.querySelector('[_id="avselect_4"]');this.baseEl = this.shadowRoot.querySelector('[_id="avselect_1"]');this.test = this.shadowRoot.querySelector('[_id="avselect_0"]');}
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
    getNamespace(){
        return namespace;
    }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('label'); }
     getDefaultValue(){return "";} selectValueText(){for (var i = 0; i < this.children.length; i++) {    if (this.children[i] instanceof AvOption) {        let optionEl = this.children[i];        if (this.value == optionEl.value) {            this.value_display = this.children[i].innerHTML;            return;        }    }}this.value_display = '';} openOptions(){this.options.innerHTML = '';var list = this.children;for (var i = 0; i < list.length; i++) {    if (list[i] instanceof AvOption) {        let optionEl = list[i];        if (optionEl.value == this.value) {            optionEl.selected = true;        }        else {            optionEl.selected = false;        }        var clone = optionEl.cloneNode(true);        clone.addEventListener('click', (e) => {            this.selectOption(e.currentTarget);        });        this.options.appendChild(clone);    }}this.hider.show();var offset = this.baseEl.getPositionOnScreen();this.options.style.left = offset.x + 'px';this.options.style.top = offset.y + this.baseEl.offsetHeight + 2 + 'px';this.options.style.minWidth = this.offsetWidth + 'px';} selectOption(opt){this.value = opt.value;this.value_display = opt.innerHTML;this.onValueChanged();this.hider.hide({    force: true});} postCreation(){let valueAttr = this.getAttribute("value");if (valueAttr) {    this.value = valueAttr;    this.removeAttribute("value");}var list = this.children;for (var i = 0; i < list.length; i++) {    if (!(list[i] instanceof AvOption)) {        list[i].remove();        i--;    }    else {        let optionEl = list[i];        if (optionEl.selected) {            this.value = optionEl.value;        }    }}this.addEventListener('click', () => {    this.openOptions();});let form = this.findParentByTag("av-form");if (form) {    form.subscribe(this);}setTimeout(() => {    this.selectValueText();});}}
window.customElements.define('av-select', AvSelect);
class AvOption extends Aventus.WebComponent {
    get 'value'() {
                    return this.getAttribute('value');
                }
                set 'value'(val) {
                    if(val === undefined || val === null){this.removeAttribute('value')}
                    else{this.setAttribute('value',val)}
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
    getNamespace(){
        return namespace;
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('value')){ this['value'] = ''; }if(!this.hasAttribute('selected')) { this.attributeChangedCallback('selected', false, false); } }
    __listBoolProps() { return ["selected"].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }
     postCreation(){if (this.value == '') {    this.value = this.innerHTML;}}}
window.customElements.define('av-option', AvOption);
AventusTest.AvSelect=AvSelect;
AventusTest.AvOption=AvOption;
})(AventusTest || (AventusTest = {}));
