class AvFormElement extends WebComponent {
    static get observedAttributes() {return ["required", "name", "nullable"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
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
                    }get 'nullable'() {
                        return this.hasAttribute('nullable');
                    }
                    set 'nullable'(val) {
                        if(val === 1 || val === 'true' || val === ''){
                            val = true;
                        }
                        else if(val === 0 || val === 'false' || val === null || val === undefined){
                            val = false;
                        }
                        if(val !== false && val !== true){
                            console.error("error setting boolean in nullable");
                            val = false;
                        }
                        if (val) {
                            this.setAttribute('nullable', 'true');
                        } else{
                            this.removeAttribute('nullable');
                        }
                    }    __prepareVariables() { super.__prepareVariables(); if(this.value === undefined) {this.value = null;} }
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
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('required')) { this.attributeChangedCallback('required', false, false); }if(!this.hasAttribute('name')){ this['name'] = ''; }if(!this.hasAttribute('nullable')) { this.attributeChangedCallback('nullable', false, false); } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('required');this.__upgradeProperty('name');this.__upgradeProperty('nullable'); }
    __listBoolProps() { return ["required","nullable"].concat(super.__listBoolProps()).filter((v, i, a) => a.indexOf(v) === i); }
     onValueChanged(){this.dispatchEvent(new CustomEvent("change", {    detail: {        value: this.value    }}));}}
window.customElements.define('av-form-element', AvFormElement);