# declarejs
Easily create JavaScript classes with protected members.  Provides structure and control to your client-side code.

## Features
- Abstract classes and singletons with ease
- Private, protected and static members
- Configure for debugging or performance
- Ideal for modular code using Requirejs

and more...
- Clean, readable code
- Class templates for less redundancy
- Define your own datatypes
- Use shorthand keywords for smaller files
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
		return this[keys.name];
	},
	
	"setName": function(value){
		this[keys.name] = declare.cast(value, "string");
	},
	
	"abstract string speak": undefined
	
}});

declarejs("djs.Dog : djs.Animal", function(keys, self, parent){return {

	"speak": function(){
		return "woof";
	}

}});

declarejs("djs.Person : djs.Animal", "djs.Dog", function(keys, self, parent, cDog){return {

	"protected djs.Dog Dog": undefined,

	"__construct": function(name, dog){
		parent.__construct.call(this, name);
		if(dog) this.setDog(new cDog(dog));
	},

	"getDog": function(){
		return this[keys.Dog];
	},

	"setDog": function(Obj){
		this[keys.Dog] = declare.cast(value, cDog);
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

var classes = declare.classes({Animal: "djs.Animal", Person: "djs.Person", Oprah: "djs.Oprah"});
var Joe = new classes.Person("Joe", "Rufus");
var Oprah = classes.Oprah(); // singleton, use contructor as a function

alert("Joe: " + Joe.speak() + "<br/>Oprah: " + Oprah.speak() + "<br/>From: " + classes.Animal.names.join(", "));
```
