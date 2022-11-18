class Test1 {
	prop1 = "salut";
	prop2 = "coucou";
	sayHello(){
		console.log("hello");
	}
}

let obj1 = {
	prop1: "aaa"
}

let objClass = new Test1();
console.log({
	...objClass,
	...obj1
})

console.log(Object.assign(objClass, obj1));