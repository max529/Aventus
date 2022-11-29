var AventusTest;
(AventusTest||(AventusTest = {}));
(function (AventusTest) {
 var namespace = 'AventusTest';
class AvHelloWorld extends WebComponent {
    static get observedAttributes() {return ["hello_clicked", "word_clicked"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'hello_clicked'() {
                    return Number(this.getAttribute('hello_clicked'));
                }
                set 'hello_clicked'(val) {
                    if(val === undefined || val === null){this.removeAttribute('hello_clicked')}
                    else{this.setAttribute('hello_clicked',val)}
                }get 'word_clicked'() {
                    return Number(this.getAttribute('word_clicked'));
                }
                set 'word_clicked'(val) {
                    if(val === undefined || val === null){this.removeAttribute('word_clicked')}
                    else{this.setAttribute('word_clicked',val)}
                }    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host{margin:15px}:host .hello{color:gray;cursor:pointer;padding:10px 5px;margin-right:5px}:host .hello:hover{background-color:rgba(100,100,100,.5)}:host .world{color:blue;cursor:pointer;padding:10px 5px;margin-left:5px}:host .world:hover{background-color:rgba(100,100,100,.5)}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<span class="hello" @press="onHelloClicked" _id="avhelloworld_0"></span>
<span class="world" _id="avhelloworld_1">World 2</span>`,
            slots: {
            },
            blocks: {
                'default':`<span class="hello" @press="onHelloClicked" _id="avhelloworld_0"></span>
<span class="world" _id="avhelloworld_1">World 2</span>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvHelloWorld", 2])
        return temp;
    }
    __mapSelectedElement() { super.__mapSelectedElement(); this.helloEl = this.shadowRoot.querySelector('[_id="avhelloworld_0"]');this.worldEl = this.shadowRoot.querySelector('[_id="avhelloworld_1"]');}
    __registerOnChange() { super.__registerOnChange(); this.__onChangeFct['hello_clicked'] = []this.__onChangeFct['hello_clicked'].push((path) => {if("hello_clicked".startsWith(path)){
                            for(var i = 0;i<this._components['avhelloworld_0'].length;i++){
                            this._components['avhelloworld_0'][i].innerHTML = "Hello "+this.hello_clicked+"".toString();
                        }
                    }})this.__onChangeFct['word_clicked'] = []this.__onChangeFct['word_clicked'].push((path) => {((target) => {    target.worldEl.innerHTML = "world " + target.word_clicked;})(this);}) }
    __endConstructor() { super.__endConstructor(); (() => {    new Aventus.PressManager({        element: this.worldEl,        onPress: () => {            this.word_clicked++;        }    });})() }
    getClassName() {
        return "AvHelloWorld";
    }
    getNamespace(){
        return namespace;
    }
    __defaultValue() { super.__defaultValue(); if(!this.hasAttribute('hello_clicked')){ this['hello_clicked'] = ''; }if(!this.hasAttribute('word_clicked')){ this['word_clicked'] = ''; } }
    __upgradeAttributes() { super.__upgradeAttributes(); this.__upgradeProperty('hello_clicked');this.__upgradeProperty('word_clicked'); }
    __addEvents(ids = null) { super.__addEvents(ids); 
                new Aventus.PressManager({
                    "element": this._components['avhelloworld_0'],
                    "onPress": (e, pressInstance) => {
                        this.onHelloClicked(e, pressInstance);
                     },
                });
                 }
     onHelloClicked(){this.hello_clicked++;} postCreation(){}}
window.customElements.define('av-hello-world', AvHelloWorld);
AventusTest.AvHelloWorld=AvHelloWorld;
})(AventusTest);
