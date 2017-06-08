# declarejs
The best way to create JavaScript classes.  Syntax and features similar to other robust languages like C# and Java. So, bring structure and control to your client-side code.

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
- Less than 8K!


## Sample
```
var declare = declarejs; // global

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
	
	"void setName": function(value){
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

	"void setDog": function(Obj){
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

alert(Joe.speak() + "<br/>Animals: " + classes.Animal.names.join(", "));
```
