var AventusTest;(function (AventusTest) {




class AvScrollTest extends Aventus.WebComponent {
    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(`:host av-scrollable{width:200px;height:200px;border:1px solid gray}:host av-scrollable .item{width:200%;height:50px;background:linear-gradient(90deg, rgb(2, 0, 36) 0%, rgb(9, 9, 121) 35%, rgb(0, 212, 255) 100%);margin:10px 0}:host(.big) av-scrollable{width:400px;height:1000px}`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: `<button av-click="changeSize">change size</button>
<av-scrollable>
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
</av-scrollable>`,
            slots: {
            },
            blocks: {
                'default':`<button av-click="changeSize">change size</button>
<av-scrollable>
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
</av-scrollable>`
            }
        }
        return info;
    }
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["AvScrollTest", 0])
        return temp;
    }
    getClassName() {
        return "AvScrollTest";
    }
     changeSize(e){this.classList.toggle("big");}}
window.customElements.define('av-scroll-test', AvScrollTest);
AventusTest.AvScrollTest=AvScrollTest;
})(AventusTest || (AventusTest = {}));
