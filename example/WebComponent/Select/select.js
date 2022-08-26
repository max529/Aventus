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