# declarejs
Most powerful way to create JavaScript classes.  Syntax and features similar to other robust languages like C# and Java.  Bring structure and control to your client-side code.

- Private, protected, and static members
- Abstract classes and singletons
- Ideal for modular code using Requirejs

### Benefits
- Clean, readable syntax
- Class templates to minimize redundancy
- User-defined datatypes
- Has shorthand option for faster coding
- Configurable for debugging and performance
- No references to "prototype"
- No spaghetti code
- No other files required to start
- Less than 12K!

```
<script type="text/javascript" src="https://cdn.rawgit.com/declarejs/declarejs/2.0.9/declare.js"></script>
<script type="text/javascript">
var declare = declarejs; // grab global and start coding
...
```

## Hello World
```
var cPerson = declare("djs.Person", function(keys, self){return {

	"protected string name": "", // or shorhand "pro str name"

	"__construct": function(name){
		this[keys.name] = declare.cast(name, "string");
	},
	
	"string speak": function(){
		return "My name is " + this[keys.name];
	}
	
}});

var Person = new cPerson("Hello World");
console.log(Person.speak());
```

## Class options and member access
```
declare("abstract djs.Animal", function(keys, self){return {

	"protected string name": "", 	// shorhand is "pro str name"
	"static Array names": [],		// static member

	"__construct": function(name){
		if(name) this[keys.name] = declare.cast(name, "string");
		self.names.push(this[keys.name]);
	},
	
	"abstract string speak": undefined 	// override or throw error
	
}});

declare("djs.Dog : djs.Animal", function(keys, self, parent){return {

	"speak": function(){return "Woof";}
	
}});

declare("djs.Person : djs.Animal", ["djs.Dog"], function(keys, self, parent, cDog){return {
	
	"protected djs.Dog Dog": undefined,

	"__construct": function(name, Dog){
		parent.__construct.call(this, name);
		if(Dog) this[keys.Dog] = declare.cast(Dog, cDog); 	// include djs.cDog in class
	},

	"speak": function(){
		return this[keys.Dog] ? "I'm " + this[keys.name] + " and I have a dog." : "I'm " + this[keys.name];
	}
	
}});

declare("singleton djs.Jeff : djs.Person", function(keys, self, parent){return {

	"protected name": "Jeff", 	// string type is implied

}});

var c = declare.classes({
	Animal: "djs.Animal", 
	Person: "djs.Person", 
	Dog: "djs.Dog", 
	Jeff: "djs.Jeff"
});

console.log(new c.Person("Joe", new c.Dog("Smuckers")).speak());
console.log(c.Jeff().speak()); 	// no "new" for singletons
console.log("From: " + c.Animal.names.join(", "));
```
