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
declare("abstract lib.Hello", function(keys, cSelf, cParent){return {
	
	"string speak": function(){ // public by default
		return "Hello";
	}
	
}});

declare("lib.World : lib.Hello", function(keys, cSelf, cParent){return {

	"protected string name": "nobody", 	// shorthand is "pro str name"

	"__construct": function(name){
		if(name) declare.set(this, keys.name);
	},
	
	"speak": function(){ // string type implied
		return cParent.speak.call(this) + " World! I'm " + this[keys.name];
	}
	
}});

var cPerson = declare.classes("lib.Person");
var Joe = new cPerson("Joe");
console.log(Joe.speak()); 	// "Hello World! I'm Joe."
```


# Declaring

Creating new classes, also known as *declaring*, happens when you call the declarejs global function. This will be the starting point for developing your modular code base.  Below will explain the diffent aspects to this function.

```javascript
declarejs(header:string, [includes:Array], handler:function):class
```

| Parameter | Type | Description |
| :----- | :----- | :----- |
| header | string | Declare your class options and parent class. |
| includes | Array | Optional. Pass in both user-defined classes and native javascript classes. |
| handler | function | Define class members and access included classes. Return new members as a simple object. |

**Declaration Handler**

```javascript
function(keys:object, self:class, [parent:class], [include:class], ...):object // returns the members
```

| Parameter | Type | Description |
| :----- | :----- | :----- |
| keys | object | Holds the names of each class member. See **_Member Protection_**. |
| self | class | The constructor function of the class that is being declared. |
| parent | class | Optional. The constructor function of the parent class. |
| include | class | Optional. The constructor function of the included class. |

**Member Protection**

It must be stated in the beginning that member protection is only designed to keep honest coders honest.  There are ways to get around this feature.  That being said, it is still a power aspect to Declarejs and here is how it work:  When a member is labeled *protected* or *private* the name will subsequently be obfuscated. All member names, obfuscated or othewise, are stored on an object that gets passed to the declaration handler.  **Note:** It is important not to pass the *keys* to any outside functions or objects.

```
...
console.log(keys); 		// {secret: "1cpjp6", whisper: "dy8ko2", talk: "talk"}
this[keys.secret] = "some"; 	// protected property
this[keys.whisper](); 		// protected method
this[keys.speak](); 		// public method
this.speak(); 			// also works
this.whisper();			// ERROR!
```

**Declaration Options**

```javascript
declarejs("(options) lib.SomeClass : (parent)", (includes...), function(keys, cSelf, cParent, ...){return {

	"(options) (type) propName": "value",
	"(options) (type) methodName": function(){}

}});
var cSomeClass = declarejs.classes("lib.SomeClass"); // access built-in function
var SomeObject = new cSomeClass();

```
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
| Function | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| template() | **name**:string, **type**:string, [**type2**:string...], **handler**:function | *none* | Generate datatypes and classes dynamically by passing parameters during runtime.  **Note:** Possible values for *type* are "string", "integer", "number". |
| datatype() | **name**:string, **parent**:datatype, **handler**:function | integer | Create a new datatype. **Note:** Must be prefixed and have lowercase first char like *lib.someDatatype* |
| cast() | **value**:mixed, **type**:type\|class | mixed | Convert a value to the specified type.  Pass in a type name or constructor (native or otherwise). |
| mustCast() | **value**:mixed, **type**:type\|class | mixed | Does the same as *cast()* but throws an error if *undefined*. |
| valid() | **value**:mixed, **type**:type\|class, **strict**:boolean | boolean | Returns true if value is casted to a defined value. |
| get() | **classname**:string | class | Gets the requested class. |
| load() | **Object**:Object, **property**:string, [**property2**:string...] | undefined | Fill a property with a default value *IF* they are undefined. |
| fill() | **Object**:Object, **property**:string, [**property2**:string...] | undefined | Fill a property with a default value. |
| make() | **type**:string, [**parameter**:mixed], [**parameter2**:mixed...] | mixed | Make an object or get the default value of a datatype. |
| makeApply() | **type**:string, **arguments**:Array | mixed | Make an object by passing in arguments. |
| compile() | *none* | undefined | Compile any uncompiled declared classes. **Note:** You can precompile classes on page load for performance. |
| classes() | **names**:object\|string | mixed | Get multiple classes or one class. |
| config() | **values**:object | undefined | Configure multiple values. |
| config() | **name**:string, [**value**:mixed] | mixed | Access an individual config value. |
| member() | **Object**:Object, **name**:string | object | Get object member info. |
| prop() | **Object**:Object, **name**:string, [**value**:mixed] | mixed | Get or set an individual property on an object. |
| props() | **Object**:Object, [**values**:object] | object | Get or set properties on an object. **Note:** Will NOT throw an error if a member does not exist. |
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

Abstract. A class that simply holds a property or multiple properties.  Research MVC patterns for more info.

**Hierarchy**: Model / Base*

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |
| **Property** | **Type** |  | **Description** |
| values | object | 


### Model\<type\>

A parameterized class that takes a datatype or class name. This parameter will determines the data property.
**Note:** Parent class is dynamically generated based on the parameter.

**Parameters**: type:string<br/>
**Hierarchy**: *Model\<type\> / Model\<...\> / Data / Model / Base*

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |


### Data

Abstract. A model class that has a single data property.

**Hierarchy**: Data / Model / Base

| Method | Parameters | Returns | Description |
| :----- | :----- | :----- | :----- |
| each() | **handler**:function | *this* | Iterates the values object and passes the key and value to the handlers. |
| | | | *more in parent...* |




# Samples

**Classes and Members**
```javascript
declare("abstract lib.Animal", function(keys, self){return {

	"protected string name": "", 	// shorhand is "pro str name"
	"static Array names": [],	// static member

	"__construct": function(name){
		if(name) this[keys.name] = declare.cast(name, "string");
		self.names.push(this[keys.name]);
	},
	
	"abstract string speak": undefined 	// override or throw error
	
}});

declare("lib.Dog : lib.Animal", function(keys, self, parent){return {

	"speak": function(){return "Woof";}
	
}});

declare("lib.Person : lib.Animal", ["lib.Dog"], function(keys, self, parent, cDog){return {
	
	"protected lib.Dog Dog": undefined,

	"__construct": function(name, Dog){
		parent.__construct.call(this, name);
		if(Dog) this[keys.Dog] = declare.cast(Dog, cDog); 	// include
	},

	"speak": function(){
		return this[keys.Dog] ? "I'm " + this[keys.name] + " and have a dog." : "I'm " + this[keys.name];
	}
	
}});

declare("singleton lib.Jeff : lib.Person", function(keys, self, parent){return {

	"protected name": "Jeff", 	// string type is implied

}});

var c = declare.classes({
	Animal: "lib.Animal", 
	Person: "lib.Person", 
	Dog: "lib.Dog", 
	Jeff: "lib.Jeff"
});

console.log(new c.Person("Joe", new c.Dog("Smuckers")).speak()); // "I'm Joe and have a dog."
console.log(c.Jeff().speak()); 	// "I'm Jeff"  (no "new" for singletons)
console.log("From: " + c.Animal.names.join(", ")); // "From: Smuckers, Joe, Jeff"
```

**Datatypes and Templates**
```javascript
declare.datatype("lib.propername", "string", function(value, parent){

	// cast as parent datatype first
	value = parent(value);

	// return value or undefined to indicate invalid
	return (value && value.length && value[0].toUpperCase() === value[0]) ? value : undefined;
});

declare("lib.Vacation : Model", ["List<lib.propername>"], function(keys, self, parent, cNamesList){return {

	"protected lib.propername title": undefined,
	"protected List<lib.propername> Places": undefined,

	"__construct": function(name, places){
		parent.__construct.apply(this);
		this[keys.title] = declare.cast(name, "lib.propername");
		this[keys.Places] = new cNamesList(places);
	},

	"string description": function(){
		return this[keys.title] + " is " + this[keys.Places].stringify(", ") + ".";
	}

}});

var cVacation = declare.get("lib.Vacation");
var RoadTrip = new cVacation("Summer Trip", ["Portand", "San Francisco", "Los Angeles"]);
console.log(RoadTrip.description());
```
