class AvComplexTest extends Aventus.WebComponent {
    static get observedAttributes() {return ["testvariable"].concat(super.observedAttributes).filter((v, i, a) => a.indexOf(v) === i);}
    get 'testvariable'() {
                        return this.getAttribute('testvariable');
                    }
                    set 'testvariable'(val) {
						if(val === undefined || val === null){this.removeAttribute('testvariable')}
						else{this.setAttribute('testvariable',val)}
                    }get 'data'() {
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
						}					super.__prepareWatchesActions();
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