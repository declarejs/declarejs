# declarejs
Easily create JavaScript classes with protected members.  Provides structure and control to your client-side code.

## Features
- Abstract and singleton class options
- Private, protected and static member access
- Configure for debugging and performance
- Works with Requirejs etc.

and more...
- Clean and readable code
- Lessen redundancy using class templates
- Define your own datatypes
- Keyword aliasing for smaller file sizes
- Helpful classes and datatypes built-in
- No tedious references to "prototype"
- Reduces spaghetti code
- It's less than 8K!

## Example
```
<html><head><title>declarejs</title>

<script type="text/javascript" src="../../declare.js"></script>
<script type="text/javascript">

var declare = declarejs;

// --- classes --- //

declare("abstract djs.Animal", function(keys, self){return {

	"protected scalar secret": "",
	"protected string name": "",
	"static Array names": [],

	"__construct": function(name){
		if(name) this.setName(name);
		if(this[keys.name]) self.names.push(this[keys.name]);
	},

	"getName": function(){return this.__get(keys.name);},
	
	"setName": function(value){this.__set(keys.name, value);},
	
	"abstract string speak": undefined
	
}});

declarejs("djs.Dog : djs.Animal", function(keys, self, parent){return {

	"speak": function(){return "woof";}

}});

declarejs("djs.Person : djs.Animal", "djs.Dog", function(keys, self, parent, cDog){return {

	"djs.Dog Dog": undefined,

	"__construct": function(name, dog){
		parent.__construct.call(this, name);
		if(dog) this.setDog(new cDog(dog));
	},

	"getDog": function(){return this.Dog;},

	"setDog": function(Obj){this.__set(keys.Dog, Obj);},

	"string speak": function(){
		var str = "My name is " + this.getName();
		if(this.Dog) str += " and my dog " + this.Dog.getName() + "... " + this.Dog.speak();
		return str;
	}

}});

declarejs("singleton djs.Oprah : djs.Person", function(keys, self, parent){return {

	"protected name": "Oprah",

	"speak": function(){return "You get a car!";}

}});

</script></head><body><script type="text/javascript">
		
// --- implement --- //

var classes = declare.classes({Animal: "djs.Animal", Person: "djs.Person", Oprah: "djs.Oprah"}),
	Joe = new classes.Person("Joe", "Rufus"),
	Oprah = classes.Oprah(); // get singleton

html = "Joe: " + Joe.speak() + "<br/>";
html += "Oprah: " + Oprah.speak() + "<br/>";
html += "creations: " + classes.Animal.names.join(", ") + "<br/>";
document.body.innerHTML = html;

</script></body></html>
```
