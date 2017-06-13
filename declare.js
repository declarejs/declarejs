
declarejs = (function(){

	var version = '2.0.7',
	debug = true,
	inspecting = false,
	userules = false, // no rules for internal (see bottom)
	compiling = false,
	aliases = {},	// see init()
	scalars = {string: 1, number: 1, boolean: 1},
	structs = {}, 	// class structures
	classes = {}, 	// assembled classes
	datatypes = {},
	templates = {},
	casters = {},
	compiles = [], 	// compile queue
	singles = {},	// singleton objects

	// constants - these are set in init() for max minification
	C_PUBLIC, C_PROTECTED, C_PRIVATE, C_STATIC, C_FINAL, C_SINGLETON, C_ABSTRACT, C_MIXED, C_SCALAR, C_STRING, C_INTEGER, C_UNDEFINED, C_BOOLEAN, C_FUNCTION, C_OBJECT, C_NUMBER, C_TYPE, C_CLASS, C_THIS,

	// --- init --- //

	init = function(){

		// set constants - NOTE: only used in functions that get called in debug mode or before compiling (for max runtime performance)
		C_PUBLIC = "public";
		C_PROTECTED = "protected";
		C_PRIVATE = "private";
		C_STATIC = "static";
		C_FINAL = "final";
		C_SINGLETON = "singleton";
		C_ABSTRACT = "abstract";
		C_MIXED = "mixed";
		C_SCALAR = "scalar";
		C_STRING = "string";
		C_INTEGER = "integer";
		C_UNDEFINED = "undefined";
		C_BOOLEAN = "boolean";
		C_FUNCTION = "function";
		C_OBJECT = "object";
		C_NUMBER = "number";
		C_TYPE = "type";
		C_CLASS = "class";
		C_THIS = "this";

		// create alias
		var arr = [C_PUBLIC, C_PROTECTED, C_PRIVATE, C_STATIC, C_FINAL, C_SINGLETON, C_ABSTRACT, C_MIXED, C_SCALAR, C_STRING, C_NUMBER, C_INTEGER, C_UNDEFINED, C_BOOLEAN, C_FUNCTION, C_OBJECT, C_TYPE, C_CLASS, C_THIS];
		aliases["void"] = C_UNDEFINED; // other alias
		for(var i=0; i<arr.length; i++){
			var str = arr[i].substr(0, 3);
			aliases[str] = arr[i];
		}

	},

	// --- functions --- //
	
	config = function(name, value){
		if(value === undefined){
			if(name === "debug") return debug;
			if(typeof(name) === C_OBJECT){
				for(var item in name) config(item, name[item]);
			}
		} else if(name === "debug"){
			debug = !!value; 
			if(debug) console.log("declarejs: " + version);
		}
	},

	inspect = function(){
		if(debug) debugger;
	},

	emptyFunc = function(){},

	abstractMethod = function(classname, name){
		return function(){
			error(C_ABSTRACT + "Method", classname + "::" + name + "()");
		}
	},

	mustCast = function(value, type){
		var value2 = cast(value, type);
		return (value2 !== undefined) ? value2 : invalidError("cast", value);
	},

	castElse = function(value, type, _else){
		value = cast(value, type);
		return value === undefined ? _else : value;
	},

	cast = function(value, type){
		if(casters[type]) return casters[type](value); // declared datatype?
		if(typeof(type) === C_FUNCTION) return (value instanceof type) ? value : undefined; // class function?
		if(window[type]){ // native class?
			casters[type] = function(value){if(value instanceof window[type]) return value;} // cache it
			return (value instanceof window[type]) ? value : undefined;
		}
		missingError(type); // error
	},

	valid = function(value, type, strict){
		return strict ? (value === cast(value, type)) : (value == cast(value, type));
	},

	make = function(name){
		return makeWith(name, arguments);
	},

	makeWith = function(name, a){
		var c = get(name);
		switch(a.length){
			case 0: return new c();
			case 1: return new c(a[1]);
			case 2: return new c(a[1], a[2]);
			case 3: return new c(a[1], a[2], a[3]);
			case 4: return new c(a[1], a[2], a[3], a[4]);
			default: return new c(a[1], a[2], a[3], a[4], a[5]);
		}
	},

	compile = function(){
		if(!compiles.length || compiling) return;
		compiling = true;

		// build classes
		for(var i=0; i<compiles.length; i++) assemble(compiles[i]);
		compiles = [];
		compiling = false;
	},

	get = function(name){
		if(!classes[name]) assemble(name);
		return classes[name] || window[name] || assemble(name).c;
	},

	getClasses = function(obj){
		var obj2 = {};
		for(var item in obj) obj2[item] = get(obj[item]);
		return obj2;
	},
	
	obscure = function(name, access){
		return debug ? (name + "(" + access.toUpperCase() + ")") : Math.round(Math.random()*100000000).toString(36);
	},

	addMember = function(header, data, struct){
		var parts = header.split(" "),
			name = parts.pop(),
			rawtype = typeof(data),
			c = struct.c,
			pmember = struct.parent ? struct.parent.members[name] : false,
			members = struct.members;

		// set member
		var member = {
			name: name,
			key: name,
			header: header,
			access: C_PUBLIC,
			type: false,
			thistype: false,
			ismethod: (rawtype === C_FUNCTION)
		}

		// parse header
		for(var i=0; i<parts.length; i++){
			var part = aliases[parts[i]] || parts[i];
			switch(part){
				case C_STATIC: member[part] = true; break;
				case C_PROTECTED: case C_PRIVATE: case C_PUBLIC: member.access = part; break;
				case C_ABSTRACT: 
					rawtype = C_FUNCTION;
					member.ismethod = true;
					member[part] = true;
					if(debug && pmember && pmember[part] === undefined) data = abstractMethod(struct.name, name); 
				break; 
				case C_THIS: 
					member.thistype = true;
					member.type = struct.name; 
				break;
				case "all": // START accessors
				case "get": 
					if(!members["get_"+name]) addMember("get_"+name, function(){return this[member.key];}, struct); 
					if(part === "get") break; // skip "set" if only wanting "get" method
				case "set": 
					if(!members["set_"+name]) addMember("set_"+name, function(value){this[member.key] = cast(value, member.type); return this;}, struct); 
				break; // END accessors
				default: 
					if(part.length) member.type = part; // non-empty part must be the type
				break;
			}
		}

		// parent member?
		if(pmember){

			// use parent member key
			member.key = pmember.key;

			// check with parent
			if(debug){
				if(member.access !== pmember.access) mismatchError("access", header);
				if(pmember.access === C_PRIVATE) error(C_PRIVATE + "Member", header);
				if(pmember[C_FINAL]) error(C_FINAL + "Member", header);
				if((member.ismethod && !pmember.ismethod) || (!member.ismethod && pmember.ismethod)) mismatchError(C_TYPE, header);
				if((member[C_STATIC] && !pmember[C_STATIC]) || (!member[C_STATIC] && pmember[C_STATIC])) mismatchError(C_STATIC, header);
				// --- WIP: check type compatability
			}

			// member type
			if(pmember.thistype){
				member.type = struct.name;
				member.thistype = true;
			} else if(!member.type) member.type = pmember.type;
		} else {
			// no parent member...

			if(!member.type) member.type = member.ismethod ? C_MIXED : rawtype;
			if(member.access !== C_PUBLIC) member.key = pmember ? pmember.key : obscure(name, member.access); // generate new key
			struct.keys[name] = member.key; // append keys (keep after generate key)
		}

		// attach member
		if(member[C_STATIC]) c[member.key] = data;
		else c[member.key] = c.prototype[member.key] = data;

		// append struct members
		struct.members[name] = struct.members_new[name] = member;
	},

	datatype = function(name, parent, mixed){
		var enums, func;

		// duplicate?
		if(datatypes[name]) redeclareError(name);
		
		// checks
		if(debug && userules){
			checkName(name);
			if(typeof(parent) !== C_STRING) error("needsParent", name);
			if(name.toLowerCase() !== name) error("needsLowercase", name);
		}

		// enum?
		switch(typeof(mixed)){
			case C_FUNCTION: // function
				func = mixed; 
			break;
			case C_OBJECT: // enum
				if(mixed instanceof Array){ // array
					enums = {};
					for(var i=0; i<mixed.length; i++) enums[i] = enums[mixed[i]] = enums[i+""] = i; // key variations: number, string, numeric-string
				} else enums = mixed; // object
				
				// enum caster
				func = function(value){
					if(enums[value] !== undefined) return datatypes[parent].func(enums[value]);
				}
			break;
			default: invalidError("param", name); // error
		}
		
		// add to datatypes
		datatypes[name] = {name: name, parent: parent, func: func, enums: enums};
		casters[name] = func;
	},

	checkName = function(name){
		if(name.split(".").length < 2) violationError("naming", "must prefix " + name); // dot required and no spaces allowed
		if(name.split(" ").length > 1) violationError("naming", name); // dot required and no spaces allowed
	},

	template = function(header, func){

		// settings
		var parts = header.split(">").shift().split("<"),
			name = parts[0];

		// no spaces
		header = header.split(" ").join("");

		if(debug && userules) checkName(name);

		// duplicate?
		if(templates[name]) redeclareError(header);

		// append global templates
		templates[name] = {name: name, params: parts[1].split(","), func: func};
	},

	castParam = function(value, type, name){
		switch(type){
			case "string": case "type": if(value !== "") return value; break; // WIP: need logic for type somewhere else
			case "boolean": return (value && value !== "" && value !== null) ? true : false;
			case "integer": 
				value = parseInt(value);
				if(!isNaN(value)) return value;
			break;
			case "number": 
				value = parseFloat(value);
				if(!isNaN(value)) return value;
			break;
		}
		invalidError("templateParam", type);
	},

	loadInclude = function(name){
		return window[name] || loadStruct(name).c;
	},

	loadStruct = function(name){
		if(structs[name]) return structs[name];

		// the class
		var c = function(){return c.prototype.__realconstruct.apply(this, arguments);}
		c.prototype.__realconstruct = function(){missingError(name);}; // gets overridden after extending as parent (if applies)

		// the struct
		compiles.push(name);
		return structs[name] = {c: c, name: name, assembled: false, declared: false};
	},


	declare = function(header){
		
		// settings
		var parts = header.split(" : ").join(":").split(":"),
			parts2 = parts[0].split(" "),
			name = parts2.pop(),
			parentname = parts[1],
			includes = [],
			struct = loadStruct(name), // this also appends global structs
			c = struct.c;

		// load struct
		struct.header = header;
		struct.parent = parentname ? loadStruct(parentname) : false;
		struct.declared = true;
		struct.func = arguments[arguments.length-1];
		struct.includedtypes = [];
		struct.includes = includes;
		struct.keys = {};
		struct.members = {};
		struct.members_new = {};
		struct.members_bykey = {};

		// parse header
		for(var i=0; i<parts2.length; i++){
			var part = aliases[parts2[i]] || parts2[i];
			switch(part){
				case C_ABSTRACT: case C_SINGLETON: struct[part] = true; break;
				case C_PRIVATE:
					struct[part] = true;
					delete structs[name]; // do before obscuring
					name = struct.name = obscure(name, C_PRIVATE);
					structs[name] = struct; // see loadStruct
					compiles.pop(); // see loadStruct
					compiles.push(name);
				break;
				default: if(part.length) malformedError(header); break;
			}
		}

		// extend?
		if(struct.parent){
			var pc = struct.parent.c,
				tempFunc = pc.prototype.__realconstruct;
			pc.prototype.__realconstruct = emptyFunc;
			c.prototype = new pc();
			pc.prototype.__realconstruct = tempFunc;
		}

		// includes
		includes.push(struct.keys);
		includes.push(struct.c);
		if(struct.parent) includes.push(struct.parent.c);
		for(var i=1; i<(arguments.length-1); i++){
			struct.includedtypes.push(arguments[i]);
			includes.push(loadInclude(arguments[i]));
		}

		// constructor
		if(struct[C_ABSTRACT]){
			c.prototype.__realconstruct = function(){error(C_ABSTRACT + "Instance", name);}
		} else {
			// auto-assemble here, overridden in the assemble function
			c.prototype.__realconstruct = function(){assemble(name); this.__construct.apply(this, arguments);}
		}

		// extras
		c.__class = name;
		c.__parent = parentname;
		
		// return class
		return c;
	},

	assemble = function(name){
		var struct = loadStruct(name);
		if(struct.assembled) return struct;
		struct.assembled = true;

		// templatized class?
		if(!struct.declared){


			// parse name
			var parts = name.split(">").shift().split("<");
			if(parts.length < 2) missingError(name); // not a templatized class
			else if(parts.length > 2) malformedError(name); //

			// settings
			var tname = parts[0],
				tparams = parts[1].split(","),
				template = templates[tname];

			// checks
			if(!template) missingError(tname + " template");
			if(template.params.length !== tparams.length) mismatchError("parameter", name);
			for(var i=0; i<tparams.length; i++) tparams[i] = castParam(tparams[i], template.params[i], name);

			// call template function (will declare new class)
			tparams.unshift(name);
			template.func.apply({}, tparams);

			// check for new class declaration
			if(!structs[name] || !structs[name].declared) malformedError(name);
		}

		// append assembled classes
		classes[name] = struct.c;

		// settings
		var c = struct.c,
			parent = struct.parent,
			proto = c.prototype,
			keys = struct.keys,
			members_bykey = struct.members_bykey;

		// parent?
		if(parent){
			assemble(parent.name);

			// copy members and keys
			var pc = parent.c;
			for(var item in pc.prototype) c[name] = proto[item] = pc.prototype[item];
			for(var item in parent.members) struct.members[item] = parent.members[item];
			for(var item in parent.keys) struct.keys[item] = parent.keys[item];

			// singleton?
			if(parent[C_SINGLETON]) struct[C_SINGLETON] = true;
			if(parent[C_PRIVATE] && !struct[C_PRIVATE]) mismatchError(C_PRIVATE + "Class", struct.header);
		}

		// assemble includes
		for(var i=0; i<struct.includedtypes.length; i++) assemble(struct.includedtypes[i]);

		// call user-defined function
		var newmembers = struct.func.apply({}, struct.includes) || {};

		// add new members
		for(var item in newmembers) addMember(item, newmembers[item], struct);

		// add built-in members
		if(!proto.__construct) proto.__construct = c.__construct = emptyFunc; // construct
		c.__class = proto.__class = name; // class
		c.__parent = proto.__parent = parent ? parent.name : false; // parent
		for(var item in keys) members_bykey[keys[item]] = struct.members[item];
		c.__member = proto.__member = function(key){return members_bykey[key];} // member
		



		// non-abstract constructors (see declare for abstract constructor)
		if(!struct[C_ABSTRACT]){
			// standard and singletons
			if(!struct[C_SINGLETON]) proto.__realconstruct = proto.__construct; 
			else {
				// singleton...
				proto.__realconstruct = function(){
					// as function call
					if(!this.__class) return singles[name] || makeWith(name, arguments);

					// as instance creation
					if(singles[name]) violationError(C_SINGLETON, name);
					singles[name] = this;
					this.__construct.apply(this, arguments);
				};
			}
		}

		// make caster
		casters[name] = function(value){if(value instanceof c) return value;};

		// return
		return struct;
	},

	error = function(name, desc){
		throw new Error(name + ": " + desc);
	},

	malformedError = function(header){
		error("malformed", header);
	},

	missingError = function(name){
		error("missing", name);
	},

	missingPrefixError = function(header){
		error("missingPrefix", header);
	},

	redeclareError = function(header){
		violationError("naming", "duplicate: " + header);
	},

	violationError = function(prefix, desc){
		error(prefix + "Violation", desc);
	},

	mismatchError = function(prefix, desc){
		error(prefix + "Mismatch", desc);
	},

	invalidError = function(prefix, desc){
		error(prefix + "Invalid", desc);
	},

	end = 0;


	// initialize the module
	init();


	// --- classes --- //

	declare("abs Base", function(keys, self, parent){return {

		// access

		"boo has": function(name){
			return this["get_" + name] ? !!this["get_" + name]() : false;
		},

		"Base set": function(name, value){
			this["set_" + name](value);
			return this;
		},

		"mix get": function(name){
			return this["get_" + name]();
		},

		// casts

		"mix to": function(type){
			var func = this["to_" + type];
			if(func) return func();
			if(casters[type]) return casters[type](this); // declared datatype?
		},

		"obj to_mixed": function(type){
			return this;
		},

		"obj to_object": function(type){
			obj = {};
			for(var item in this){
				if(item.substr(0, 3) === "get_") obj[item.substr(4, 100)] = this[item]();
			}
			return obj;
		}

	}});

	declare("abs Model : Base", function(keys, self, parent){return {

		"__construct": function(mixed){
			if(mixed !== undefined) this.set_values(mixed);
		},

		"mix values": function(obj){
			if(!obj) return this.to_object();
			for(var item in obj) this.set(item, obj[item]);
			return this;
		},

		"thi each": function(func){
			for(var item in this){
				if(this.has(item)) func(item, this.get(item));
			}
			return this;
		}

	}});

	declare("Data : Model", function(keys, self, parent){return {

		"pro get typ type": C_MIXED, // use auto-get
		"pro get mix data": undefined, // use auto-get

		"__construct": function(mixed){
			parent.__construct.call(this);
			this.set_data(mixed);
		},

		"mix make_data": emptyFunc,

		"und set_data": function(value){
			if(value === undefined) this[keys.data] = this.make_data();
			else {
				var value2 = cast(value, this[keys.type]);
				this[keys.data] = (value2 === undefined) ? this.make_data(value) : value2;
			}
			return this;
		}
	}});

	declare("Map : Data", function(keys, self, parent){return {


		"__construct": function(obj){
			parent.__construct.call(this);
			if(obj) this.values(obj);
		},

		"make_data": function(){
			return {};
		},

		"get_data": function(){
			return this.values();
		},

		"convert": function(value, key){
			return cast(value, this[keys.type]);
		},

		"each": function(func){
			var data = this[keys.data];
			for(var item in data) func(item, data[item]);
			return this;
		},

		"remove": function(name){
			var data = this[keys.data],
				value = data[name];
			delete data[name];
			return value;
		},

		"count": function(){
			var c = 0;
			for(var item in this[keys.data]) c++;
			return c;
		},

		"values": function(obj){
			if(obj){
				for(var item in obj) this.set(item, obj[item]);
				return this;
			}
			var data = this[keys.data];
			obj = {};
			for(var item in data) obj[item] = data[item];
			return obj;
		},

		"set": function(name, value){
			value = this.convert(value);
			if(value !== undefined) this[keys.data][name] = value;
			return this;
		},

		"get": function(name, _else){
			return this[keys.data][name] || _else;
		},

		// cast

		"str to_string": function(){
			return JSON.stringify(this[keys.data]);
		}

	}});

	declare("List : Map", function(keys, self, parent){ return {

		"make_data": function(){
			return [];
		},

		"each": function(func){
			var data = this[keys.data];
			for(var i=0; i<data.length; i++) func(i, data[i]);
			return this;
		},

		"count": function(){
			return this[keys.data].length;
		},

		"values": function(arr){
			if(arr){
				for(var i=0; i<arr.length; i++) this.set(i, arr[i]);
				return this;
			}
			var data = this[keys.data];
			arr = [];
			for(var i=0; i<data.length; i++) arr.push(data[i]);
			return arr;
		},

		"set": function(pos, value){
			value = this.convert(value);
			if(value === undefined) return this;
			if(pos < 0) pos = this[keys.data].length + pos;
			else if(pos === (data.length-1)) return data.push(value);
			else if(data[pos] !== undefined) return data[pos] = value;
			return this;
		},

		"remove": function(pos){
			var data = this[keys.data];
			if(pos < 0) pos = data.length + pos;
			if(pos === 0) return data.shift();
			if(pos === data.length-1) return data.pop();
			if(data[pos] !== undefined) return data.splice(pos, 1).pop();
		},

		"append": function(value){
			value = this.convert(value, this[keys.data].length);
			if(value !== undefined) this[keys.data].push(value);
			return this;
		},

		"prepend": function(value){
			value = this.convert(value, 0);
			if(value !== undefined) this[keys.data].unshift(value);
			return this;
		},

		"parse": function(string, token){
			return this.values(string.split(token));
		},

		"stringify": function(token){
			return this[keys.data].join(token);
		},

		// casts

		"obj to_Array": function(){
			var arr = [], 
				data = this[keys.data];
			for(var i=0; i<data.length; i++) arr.push(data[i]);
			return arr;
		}

	}});
	


	// --- datatype --- //

	datatype(C_MIXED, false, function(value){
		return value;
	}),

	datatype(C_SCALAR, C_MIXED, function(value){
		if(scalars[typeof(value)]) return value;
	}, ""),

	datatype(C_STRING, C_SCALAR, function(value){
		value = cast(value, "scalar");
		if(value) return value;
	}, ""),

	datatype(C_NUMBER, C_SCALAR, function(value){
		if(!isNaN(value)) return value;
		value = parseFloat(value);
		if(!isNaN(value)) return value;
	}, 0),

	datatype(C_INTEGER, C_NUMBER, function(value){
		value = parseInt(value);
		if(!isNaN(value)) return value;
	}),

	datatype(C_BOOLEAN, C_SCALAR, function(value){
		if(value === true || value === false) return value;
		return (!value || value === "" || value === null) ? false : true;
	}, false),

	datatype(C_OBJECT, C_MIXED, function(value){
		if(typeof(value) === "object") return value;
	}),

	datatype(C_FUNCTION, C_MIXED, function(value){
		if(typeof(value) === "function") return value;
	}),

	datatype(C_CLASS, C_FUNCTION, function(value){
		if(typeof(value) === "function" && value.__class) return value;
	}),

	datatype(C_TYPE, C_STRING, function(value){
		value = cast(value, "string");
		if(value && casters[value]) return value;
	}),

	datatype(C_MIXED + C_TYPE, C_TYPE, function(value){
		value = cast(value, "string");
		if(value && datatypes[value]) return value;
	}),

	datatype(C_CLASS + C_TYPE, C_TYPE, function(value){
		value = cast(value, "string");
		if(value && classes[value]) return value;
	}),


	// --- templates --- //
	
	template("Map<type>", function(classname, type){

		declare(classname + " : Map", function(keys, self){ return {

			"pro type": type,

		}});

	});

	template("List<type>", function(classname, type){

		declare(classname + " : List", function(keys, self){ return {

			"pro type": type,

		}});

	});

	template("Data<type>", function(classname, type){

		declare(classname + " : Data", function(keys, self){return {

			"pro type": type

		}});

	});


	// --- internal --- //

	compile(); // compile built-in types
	userules = true; // turn on naming rules now
	if(inspecting) debugger;
	

	// --- public --- //
	
	declare.template = template;
	declare.datatype = datatype;
	declare.cast = cast;
	declare.mustCast = mustCast;
	declare.valid = valid;
	declare.get = get;
	declare.make = make;
	declare.makeWith = makeWith;
	declare.compile = compile;
	declare.classes = getClasses;
	declare.config = config;
	if(debug) declare.inspect = inspect; // internal use only
	return declare;

})();


// requirejs module?
if(window["define"]) define([], function(){return declarejs;});
