# declarejs
Most powerful way to create JavaScript classes.  Syntax and features similar to other languages like C# and Java.  Bring structure and control to your client-side code.

- Private, protected, and static members
- Abstract classes and singletons
- Ideal for modular code using Requirejs

##### Benefits
- Clean, readable syntax
- Class templates to minimize redundancy
- User-defined datatypes
- Has shorthand option for faster coding
- Configurable for debugging and performance
- No references to "prototype"
- No spaghetti code
- No other files required to start
- Less than 12K!

# Starting
```
<script type="text/javascript" src="https://cdn.rawgit.com/declarejs/declarejs/2.0.9/declare.js"></script>
<script type="text/javascript">
var declare = declarejs; // the global object
```
```
require.config({
    paths: {
        declare: "https://cdn.rawgit.com/declarejs/declarejs/2.0.9/declare.js",
    }
});
```
```
bower install https://cdn.rawgit.com/declarejs/declarejs/2.0.9/declare.js
```

# Functions

These are accessed via the global declarejs object.
```javascript
var n = declare.cast("50%", "integer")
```
| Name | Parameters | Returns | Description |
| ----- | ----- | ----- | ----- |
| template() | *name*:string, *type1*:string, [*type2*:string...], *handler*:function | *none* | Generate datatypes and classes dynamically by passing parameters during runtime.  Allowed values for *type1, type2, ...*: string, type, integer, number. See examples. |
| datatype() | *name*:string, *parent*:datatype, *handler*:function | integer | Create a new datatype. Name prefixing is required: *khw.Widget* |
| cast() | **value**:mixed, **type**:type\|class | mixed | Convert a value to the specified type.  Pass in a type name or constructor (native or otherwise). |
| mustCast() | **value**:mixed, **type**:type\|class | mixed | Does the same as *cast()* but throws an error if *undefined* is returned. |
| valid() | **value**:mixed, **type**:type\|class, **strict**:boolean | boolean | Returns true if value is casted as non-undefined. |
| get() | **classname**:string | class | Gets the requested class. |


# Classes

#### Base

Abstract - Takes care of some basic functionality like setting and getting data members.

| Method | Parameters | Returns | Description |
| ----- | ----- | ----- | ----- |
| __construct() | [**values**:object] | *this* | Pass in any initial values. |
| has() | **name**:string | boolean | Returns true if member exists and is non-undefined. |
| set() | **name**:string, **value**:mixed | *this* | Will set a member if it exists otherwise an error is thrown. |
| get() | **name**:string | mixed | Will return a value if the member exists otherwise an error is thrown. |
| props() | [**values**:object] | object\|*this* | Set and get multiple members depending on which parameter gets passed. |

#### Model

Extends **Base** \| Abstract - A class that serves to hold a value or values.

| Method | Parameters | Returns | Description |
| ----- | ----- | ----- | ----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| ... | | | See *Base* |


#### Data

Extends **Model** \| Abstract - A class that holds a single value.

| Method | Parameters | Returns | Description |
| ----- | ----- | ----- | ----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| ... | | | See *Model* |

# Templates
### Model<name:type>

Extends **Model<parenttype>** \| A class that takes a datatype or class name.  It dynamically extends the generated class using the parent of the type parameter.

| Method | Parameters | Returns | Description |
| ----- | ----- | ----- | ----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| ... | | | See *Base* |




# Samples
##### Hello World
```javascript
var cPerson = declare("djs.Person", function(keys, self){return {

	"protected string name": "",

	"__construct": function(name){
		this[keys.name] = declare.cast(name, "string");
	},
	
	"string speak": function(){
		return "My name is " + this[keys.name];
	}
	
}});

var Person = new cPerson("Hello World");
console.log(Person.speak()); 	// "My name is Hello World"
```

##### Classes and Members
```javascript
declare("abstract djs.Animal", function(keys, self){return {

	"protected string name": "", 	// shorhand is "pro str name"
	"static Array names": [],	// static member

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
		if(Dog) this[keys.Dog] = declare.cast(Dog, cDog); 	// include
	},

	"speak": function(){
		return this[keys.Dog] ? "I'm " + this[keys.name] + " and have a dog." : "I'm " + this[keys.name];
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

console.log(new c.Person("Joe", new c.Dog("Smuckers")).speak()); // "I'm Joe and have a dog."
console.log(c.Jeff().speak()); 	// "I'm Jeff"  (no "new" for singletons)
console.log("From: " + c.Animal.names.join(", ")); // "From: Smuckers, Joe, Jeff"
```

##### Datatypes and Templates
```javascript
declare.datatype("djs.propername", "string", function(value, parent){

	// cast as parent datatype first
	value = parent(value);

	// return value or undefined to indicate invalid
	return (value && value.length && value[0].toUpperCase() === value[0]) ? value : undefined;
});

declare("djs.Vacation : Model", ["List<djs.propername>"], function(keys, self, parent, cNamesList){return {

	"protected djs.propername title": undefined,
	"protected List<djs.propername> Places": undefined,

	"__construct": function(name, places){
		parent.__construct.apply(this);
		this[keys.title] = declare.cast(name, "djs.propername");
		this[keys.Places] = new cNamesList(places);
	},

	"string description": function(){
		return this[keys.title] + " is " + this[keys.Places].stringify(", ") + ".";
	}

}});

var cVacation = declare.get("djs.Vacation");
var RoadTrip = new cVacation("Summer Trip", ["Portand", "San Francisco", "Los Angeles"]);
console.log(RoadTrip.description());
```
