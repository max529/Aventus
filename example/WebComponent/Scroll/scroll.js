var AventusTest;
(AventusTest||(AventusTest = {}));
(function (AventusTest) {
 var namespace = 'AventusTest';
class AvScrollTest extends WebComponent {
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host av-scrollable{width:200px;height:200px;border:1px solid gray}:host av-scrollable .item{width:200%;height:50px;background:linear-gradient(90deg, rgb(2, 0, 36) 0%, rgb(9, 9, 121) 35%, rgb(0, 212, 255) 100%);margin:10px 0}:host(.big) av-scrollable{width:400px;height:1000px}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<button _id="avscrolltest_0">change size</button>
&lt;@scrollable&gt;
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
<!--@scrollable-->`,
            slots: {
            },
            blocks: {
                'default':`<button _id="avscrolltest_0">change size</button>
&lt;@scrollable&gt;
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
	<div class="item"></div>
<!--@scrollable-->`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvScrollTest", 1])
        return temp;
    }
    getClassName() {
        return "AvScrollTest";
    }
    getNamespace(){
        return namespace;
    }
    __addEvents(ids = null) { super.__addEvents(ids); if (ids == null || ids.indexOf('avscrolltest_0') != -1) {
                    if (this._components['avscrolltest_0']) {
                        for (var i = 0; i < this._components['avscrolltest_0'].length; i++) {
                            this._components['avscrolltest_0'][i].addEventListener('click', (e) => { this.changeSize(e) })
                        }
                    }
                } }
     changeSize(e){this.classList.toggle("big");}}
window.customElements.define('av-scroll-test', AvScrollTest);
AventusTest.AvScrollTest=AvScrollTest;
})(AventusTest);
