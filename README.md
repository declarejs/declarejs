# declarejs
Easily create JavaScript classes with protected members.  Provides structure and control to your client-side code.

## Features
- Abstract and singleton class options
- Private, protected and static member access
- Configure for debugging and performance
- Works with Requirejs etc.

and more...
- Clean and readable code
- Class templates help lessen redundancy
- Define your own datatypes
- Keyword aliases for smaller file sizes
- Helpful classes and datatypes built-in
- No more references to "prototype"
- No more spaghetti code
- It's less than 8K!

## Example
```
var declare = declarejs; // grab global

declare("abstract djs.Animal", function(keys, self){return {

	"protected string name": "",
	"static Array names": [],

	"__construct": function(name){
		if(name) this.setName(name);
		if(this[keys.name]) self.names.push(this[keys.name]);
	},

	"getName": function(){
		return this.__get(keys.name);
	},
	
	"setName": function(value){
		this.__set(keys.name, value);
	},
	
	"abstract string speak": undefined
	
}});

declarejs("djs.Dog : djs.Animal", function(keys, self, parent){return {

	"speak": function(){
		return "woof";
	}

}});

declarejs("djs.Person : djs.Animal", "djs.Dog", function(keys, self, parent, cDog){return {

	"djs.Dog Dog": undefined,

	"__construct": function(name, dog){
		parent.__construct.call(this, name);
		if(dog) this.setDog(new cDog(dog));
	},

	"getDog": function(){
		return this.Dog;
	},

	"setDog": function(Obj){
		this.__set(keys.Dog, Obj);
	},

	"string speak": function(){
		var str = "My name is " + this.getName();
		if(this.Dog) str += " and my dog " + this.Dog.getName() + "... " + this.Dog.speak();
		return str;
	}

}});

declarejs("singleton djs.Oprah : djs.Person", function(keys, self, parent){return {

	"protected name": "Oprah",

	"speak": function(){
		return "You get a car!";
	}

}});

// --- implement --- //

var classes = declare.classes({Animal: "djs.Animal", Person: "djs.Person", Oprah: "djs.Oprah"}),
	Joe = new classes.Person("Joe", "Rufus"),
	Oprah = classes.Oprah(); // singleton

alert("Joe: " + Joe.speak() + "<br/>Oprah: " + Oprah.speak() + "<br/>From: " + classes.Animal.names.join(", "));
```
