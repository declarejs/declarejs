# declarejs
The best way to create JavaScript classes.  It brings structure and control to your client-side applications.  Syntax and features similar to languages like C#, C++, and Java.

- Private, protected and static members
- Abstract classes and singletons
- Configure for debugging or performance
- Ideal for modular code with Requirejs


### Other features
- Clean, readable syntax
- Class templates for minimizing redundancy
- User-defined datatypes
- Has shorthand option for faster coding
- No references to "prototype"
- No spaghetti code
- No other files required to start
- It's less than 8K!


## Sample
```
var declare = declarejs; // grab global

declare("abstract djs.Animal", function(keys, self){return {

	"protected string name": "",
	"static Array names": [],

	"__construct": function(name){
		if(name) this.setName(name);
		if(this[keys.name]) self.names.push(this[keys.name]);
	},
	
	"abstract string speak": undefined,

	"string getName": function(){
		return this[keys.name];
	},
	
	"und setName": function(value){
		this[keys.name] = declare.cast(value, "string");
	}
	
}});

declare("djs.Dog : djs.Animal", function(keys, self, parent){return {

	"speak": function(){
		return "woof";
	}

}});

declare("djs.Person : djs.Animal", "djs.Dog", function(keys, self, parent, cDog){return {

	"protected djs.Dog Dog": undefined,

	"__construct": function(name, dog){
		parent.__construct.call(this, name);
		if(dog) this.setDog(new cDog(dog));
	},

	"djs.Dog getDog": function(){
		return this[keys.Dog];
	},

	"und setDog": function(Obj){
		this[keys.Dog] = declare.cast(value, cDog);
	},

	"speak": function(){
		var str = "My name is " + this.getName();
		if(this.Dog) str += " and my dog " + this.Dog.getName() + "... " + this.Dog.speak();
		return str;
	}

}});

// --- implement --- //

var classes = declare.classes({Animal: "djs.Animal", Person: "djs.Person"});
var Joe = new classes.Person("Joe", "Rufus");

alert(Joe.speak() + "<br/>Created " + classes.Animal.names.join(", "));
```
