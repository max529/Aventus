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