# Declarejs
Most powerful way to create JavaScript classes.  Syntax and features similar to other languages like C# and Java.  Bring structure and control to your client-side code.

- Private, protected, and static members
- Abstract classes and singletons
- Ideal for modular code using Requirejs

**Benefits**
- Clean, readable syntax
- Class templates to minimize redundancy
- User-defined datatypes
- Has shorthand option for faster coding
- Configurable for debugging and performance
- No references to "prototype"
- No spaghetti code
- No other files required to start
- Less than 12K!

# Start
```
<script type="text/javascript" src="https://cdn.rawgit.com/declarejs/declarejs/2.0.9/declare.js"></script>
<script type="text/javascript">
var declare = declarejs; // the global
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
**Hello World**
```javascript
declare("abstract app.Hello", function(keys, cSelf, cParent){return {
	
	"string speak": function(){ // public by default
		return "Hello";
	}
	
}});

declare("app.World : app.Hello", function(keys, cSelf, cParent){return {

	"protected string name": "nobody", 	// shorthand is "pro str name"

	"__construct": function(name){
		if(name) declare.set(this, keys.name);
	},
	
	"speak": function(){ // string type implied
		return cParent.speak.call(this) + " World! I'm " + this[keys.name];
	}
	
}});

var cPerson = declare.classes("djs.Person");
var Joe = new cPerson("Joe");
console.log(Joe.speak()); 	// "Hello World! I'm Joe."
```


# Module

The global function that serves as the basis for everything in Declarejs.  It has a dual purpose, to create classes and to hold built-in functions (see *Functions*).

```javascript
declarejs("(options) lib.Name : (parent)", (included...), function(keys, cSelf, cParent, ...){return {

	"(options) (type) propName": "somevalue",
	"(options) (type) methodName": function(){}

}});
var cSomeClass = declarejs.classes("lib.Name"); // access built-in function
var SomeObject = new cSomeClass();

```
**Parameters**

| Parameter | Type | Description |
| :----- | :----- | :----- |
| header | string | Declare your class options and parent class. |
| includes | Array | Optional. Pass in both user-defined classes and native javascript classes. |
| handler | function | Define class members and access included classes. Return new members as a simple object. |

**Class Options**

| Option | Description |
| :----- | :----- |
| abstract | Cannot be an instance. |
| singleton | Only one instance allowed. |

**Member Options**

| Option | Description |
| :----- | :----- |
| public | Accessable outside and outside the instance. Default access. |
| protected | Accessable within the instance only. |
| private | Accessable within the instance of a specified class only. |
| static | Exists on the class and not the instance |
| final | Cannot be overridden. Methods only. |
| abstract | Must be overridden. |


# Functions

These built-in functions are attached to the *Declarejs* global function.
```javascript
var n = declarejs.cast("50%", "integer");
```
| Functions | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| template() | **name**:string, **type1**:string, [**type2**:string...], **handler**:function | *none* | Generate datatypes and classes dynamically by passing parameters during runtime.  **Note:** Possible values for *type* are "string", "integer", "number". |
| datatype() | **name**:string, **parent**:datatype, **handler**:function | integer | Create a new datatype. **Note:** Must be prefixed and have lowercase first char like *lib.someDatatype* |
| cast() | **value**:mixed, **type**:type\|class | mixed | Convert a value to the specified type.  Pass in a type name or constructor (native or otherwise). |
| mustCast() | **value**:mixed, **type**:type\|class | mixed | Does the same as *cast()* but throws an error if *undefined*. |
| valid() | **value**:mixed, **type**:type\|class, **strict**:boolean | boolean | Returns true if value is casted to a defined value. |
| get() | **classname**:string | class | Gets the requested class. |
| load() | **Object**:Object, **prop1**:string, [**prop2**:string...] | undefined | Fill a property with a default value *IF* they are undefined. |
| fill() | **Object**:Object, **prop1**:string, [**prop2**:string...] | undefined | Fill a property with a default value. |
| make() | **type**:string, [**param1**:mixed], [**param2**:string...] | mixed | Make an object or get the default value of a datatype. |
| makeApply() | **type**:string, **args**:Array | mixed | Make an object by passing in arguments. |
| compile() | *none* | undefined | Compile any new declared classes. |
| classes() | **names**:object\|string | mixed | Get multiple classes or one class. |
| config() | **values**:object | undefined | Configure multiple values. |
| config() | **name**:string, [**value**:mixed] | mixed | Access an individual config value. |
| member() | **Object**:Object, **name**:string | object | Get object member info. |
| prop() | **Object**:Object, [**name**:string], [**value**:mixed] | mixed | Access an individual property on an object. |
| props() | **Object**:Object, [**values**:object] | object | Access properties on an object. **Note:** Will NOT throw an error if a member does not exist. |
| className() | **mixed**:class\|object | string | Returns the class name. |
| parentName() | **mixed**:class\|object\|name | string | Returns the parent class name. |
| parentClass() | **mixed**:class\|object\|name | class | Returns the parent class. |
| debug() | *none* | boolean | Returns true if debug mode is on. |
| version() | *none* | string | Get the Declarejs version. |


# Classes
Some helpful classes that can be used as the foundation for your library.

### Base

Abstract. Takes care of some basic functionality like accessing object properties.

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| __construct() | [**values**:object] | *this* | Pass in any initial values. |
| has() | **name**:string | boolean | Returns true if member exists and is non-undefined. |
| set() | **name**:string, **value**:mixed | *this* | Will set a member if it exists otherwise an error is thrown. |
| get() | **name**:string | mixed | Will return a value if the member exists otherwise an error is thrown. |
| props() | [**values**:object] | object\|*this* | Set and get multiple members depending on which parameter gets passed. |

### Model

Abstract. A class that serves to hold a value or values.

*Model / Base*

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |
| **Property** | **Type** |  | **Description** |
| values | object | 


### Model\<type\>

Parameterized.  A class that takes a datatype or class name. This will determine which type of value the model will hold.
Parent class is dynamically generated based on the parameter.

**Parameters**: type:string<br/>
**Hierarchy**: *Model\<type\> / Model\<...\> / Data / Model / Base*

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |


### Data

Abstract. A class that holds a single value.

*Data / Model / Base*

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |




# Samples

**Classes and Members**
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

**Datatypes and Templates**
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
