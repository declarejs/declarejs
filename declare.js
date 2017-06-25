
declarejs = (function(){

	var version = '2.0.10',
	debug = true,
	inspecting = false,
	userules = false, // no rules for internal (see bottom)
	compiling = false,
	aliases = {},	// see init()
	scalars = {string: 1, number: 1, boolean: 1},
	structs = {}, 	// class structures
	classes = {}, 	// assembled classes
	datatypes = {},
	templates = {},		// name =>  value
	routines = {},	
	casters = {},
	makers = {},		// name => make functions (for datatypes and classes)
	parents = {}, 		// name => parent name (for datatypes and classes)
	parentclasses = {}, // classname => parent class (for performance)
	compiles = [], 		// compile queue
	singles = {},		// singleton objects

	// constants - these are set in init() for max minification
	C_PUBLIC, C_PROTECTED, C_PRIVATE, C_STATIC, C_FINAL, C_SINGLETON, C_ABSTRACT, C_MIXED, C_SCALAR, C_STRING, C_INTEGER, C_UNDEFINED, C_BOOLEAN, C_FUNCTION, C_OBJECT, C_NUMBER, C_TYPE, C_CLASS,

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

		// create alias
		var arr = ["this", "make", C_PUBLIC, C_PROTECTED, C_PRIVATE, C_STATIC, C_FINAL, C_SINGLETON, C_ABSTRACT, C_MIXED, C_SCALAR, C_STRING, C_NUMBER, C_INTEGER, C_UNDEFINED, C_BOOLEAN, C_FUNCTION, C_OBJECT, C_TYPE, C_CLASS];
		for(var i=0; i<arr.length; i++){
			var str = arr[i].substr(0, 3);
			aliases[str] = arr[i];
		}

		// NOTE: "undefined" datatype has to be added like this
		datatypes[C_UNDEFINED] = {name: C_UNDEFINED, parent: C_MIXED, func: emptyFunc, value: undefined, hasvalue: true};
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
			if(value) console.log("declarejs: " + version);
		}
	},

	inspect = function(){
		if(debug) debugger;
	},

	emptyFunc = function(){},

	load = function(Obj, name){ // fill property if empty
		var value;
		for(var i=1; i<arguments.length; i++){
			name = arguments[i];
			value = Obj.get(name);
			if(value === undefined) Obj.set(name, Obj["make_" + name]());
		}
	},

	fill = function(Obj, name){ // fill property no matter what
		for(var i=1; i<arguments.length; i++) Obj.set(arguments[i], Obj["make_" + arguments[i]]());
	},
	
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

	loadType = function(name){
		if(!datatypes[name] && !structs[name]){
			if(window[name]) nativetype(name);
			else templatize(name);
		}
	},

	templatize = function(type){

		var parts = type.substr(0, type.length-1).split("<");
		if(parts.length <= 1) missingError(type); // not a template

		// settings
		var name = parts[0],
			template = templates[name],
			args = parts[1].split(",");

		// exists?
		if(!template) missingError(type);

		if(template.params.length !== args.length) templateParamError(type);
		for(var i=0; i<args.length; i++){
			switch(template.params[i]){
				case C_TYPE: // fall through
				case C_STRING: if(!args[i].length) templateParamError(type); break; // WIP: need logic for type somewhere else
				case C_BOOLEAN: args[i] = (args[i] && args[i] !== "" && args[i] !== null); break;
				case C_INTEGER: args[i] = parseInt(args[i]); if(isNaN(args[i])) templateParamError(type); break;
				case C_NUMBER: args[i] = parseFloat(args[i]); if(isNaN(args[i])) templateParamError(type); break;
				default: templateParamError(type);
			}

		}

		// call template function (will declare new class)
		args.unshift(type);
		template.func.apply({}, args);
	},

	cast = function(value, type){
		if(casters[type]) return casters[type](value, casters[parents[type]]);
		if(typeof(type) === C_FUNCTION) return (value instanceof type) ? value : undefined; // class function?

		// native type?
		if(window[type]){
			nativetype(type);
			return casters[type](value);
		}

		// from template
		templatize(type);
		return casters[type] ? casters[type](value, casters[parents[type]]) : malformedError(type);
	},

	templateParts = function(str){
		var parts = str.split();
	},


	valid = function(value, type, strict){
		return strict ? (value === cast(value, type)) : (value == cast(value, type));
	},

	// makes

	make = function(type){
		if(makers[type]) return makers[type].apply(this, arguments); // "this" is just filler and doesn't mean anything
		if(window[type]){
			nativetype(type);
			return make(type);
		}
		missingError(type);
	},

	makeDatatype = function(type, args){ // not public, added to makers
		var datatype = datatypes[type];
		if(datatype.hasvalue) return datatype.value;
		datatype.hasvalue = true;
		return datatype.value = makeDatatype(datatype.parent);
	},

	makeClass = function(type, args){
		return singles[type] || makeHelper(get(type), args, 1);
	},

	makeSingleton = function(type, args){
		return singles[type] || makeHelper(get(type), args, 1);
	},

	makeApply = function(c, arr){ // public
		return makeHelper(c, arr, 0);
	},

	makeHelper = function(c, args, i){ // internal only
		switch(args.length-i){
			case 0: return new c();
			case 1: return new c(args[i]);
			case 2: return new c(args[i], args[i+1]);
			case 3: return new c(args[i], args[i+1], args[i+2]);
			case 4: return new c(args[i], args[i+1], args[i+2], args[i+3]);
		}
		return new c(args[i], args[i+1], args[i+2], args[i+3], args[i+4]);
	},

	// END makes

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

	member = function(Obj, key){
		return Obj.__member(key);
	},

	prop = function(Obj, name){ // set and get without errors
		if(arguments.length === 1) return Obj["get_" + name] ? Obj["get_" + name]() : undefined;
		if(Obj["set_" + name]) Obj["set_" + name](arguments[1]);
		return Obj;
	},

	props = function(Obj, values){ // set values without errors
		if(!values) return Obj.props();
		for(var item in values){
			if(Obj["set_" + item]) Obj["set_" + item](values[item]);
		}
		return Obj;
	},

	className = function(mixed){
		return mixed.__class;
	},

	parentName = function(mixed){
		return parents[mixed] || parents[mixed.__class];
	},

	parentClass = function(mixed){
		return parentclasses[mixed] || parentclasses[mixed.__class];
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
				case "this": 
					member.thistype = true;
					member.type = struct.name;
				break;
				// make
				case "make+": case "mak+": struct.preloads[name] = name; // mark as preload (and pass through to "make")
				case "make":
					if(!members["make_"+name]) addMember("make_"+name, function(){return make(member.type, true);}, struct); 
				break;
				case "make-": case "mak-": delete struct.preloads[name]; break; // do not preload
				// /make
				case "get": 
					if(!members["get_"+name]) addMember("get_"+name, function(){return this[member.key];}, struct); 
				break;
				case "set": 
					if(!members["set_"+name]) addMember("set_"+name, function(value){this[member.key] = cast(value, member.type); return this;}, struct); 
				break;
				case "set+": 
					addMember("set_"+name, function(value){
						if(value === undefined) this[member.key] = this["make_" + name].call(this);
						else {
							this[member.key] = cast(value, member.type); 
							if(this[member.key] === undefined) this[member.key] = this["make_" + name].call(this, value);
						}
						return this;
					}, struct); 
				break;
				case "all": 	parts.push("set", "get", "make"); break;
				case "all+": 	parts.push("set+", "get", "make"); break;
				case "all++": 	parts.push("set+", "get", "make+"); break;
				default: 
					if(part.length){
						if(debug && member.type) malformedError(header);
						member.type = part;
					}
				break; // set type, skip empty chars
			}
		}

		// parent member?
		if(pmember){

			// use parent member key
			member.key = pmember.key;

			// check with parent
			if(debug){
				if(member.access !== pmember.access) mismatchError("access", header);
				if(pmember.access === C_PRIVATE) violationError(C_PRIVATE, header);
				if(pmember[C_FINAL]) violationError(C_FINAL, header);
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

		// load member
		loadType(member.type);

		// attach member
		if(member[C_STATIC]) c[member.key] = data;
		else c[member.key] = c.prototype[member.key] = data;

		// append struct members
		struct.members[name] = struct.members_new[name] = member;
	},

	nativetype = function(name, func){
		var c = window[name];
		if(!c) missingError(name);
		casters[name] = function(value){if(value instanceof c) return value;};
		parents[name] = C_OBJECT;
		makers[name] = makeClass;
	},

	datatype = function(name, parent, mixed, value){
		var enums, func, 
			maker = makeDatatype;

		// duplicate?
		if(datatypes[name]) duplicateError(name);
		
		// maker?
		if(typeof(value) === "function"){
			maker = value;
			value = undefined;
		}

		// checks
		if(debug && userules){
			checkName(name, 1); // check name
			if(typeof(parent) !== C_STRING) requiredError("parent", name); // parent required
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
		
		// append globals
		datatypes[name] = {name: name, parent: parent, func: func, enums: enums, value: value, hasvalue: (value !== undefined)};
		casters[name] = func;
		parents[name] = parent;
		makers[name] = maker;
	},

	checkName = function(name, casetype){
		if(userules){
			// spaces?
			if(name.split(" ").length > 1) malformedError("spaces", name);

			// seperate from any possible params
			name = name.split("<").shift();

			// if no dots and not an internal template, then error
			var parts = name.split(".");
			if(parts.length < 2 && !templates[name]) requiredError("prefix", name);
			
			// no case checking means template
			if(casetype){
				var basename = parts.pop();

				// lowercase is datatype, uppercase is class
				if((casetype === 1 && basename[0].toLowerCase() !== basename[0]) || (casetype === 2 && basename[0].toUpperCase() !== basename[0])){
					malformedError("case", name);
				}
			}
		}
	},

	routine = function(header, func){
		//template(header, func, true);
	},

	template = function(header, func){

		// settings
		var parts = header.split(">").shift().split("<"),
			name = parts[0];

		// no spaces
		header = header.split(" ").join("");

		if(debug) checkName(name);

		// duplicate?
		if(templates[name]) duplicateError(header);

		// append global templates
		templates[name] = {name: name, params: parts[1].split(","), func: func};
	},

	templateParent = function(name, type){
		var parent = parentName(type);
		return parent ? name + "<" + parent + ">" : name;
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

		// check name
		if(makers[name]) duplicateError(name);
		if(debug) checkName(name, 2);

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
		struct.preloads = {}; // new concept

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

		// has parent?
		if(struct.parent){

			// extend
			var pc = struct.parent.c,
				tempFunc = pc.prototype.__realconstruct;
			pc.prototype.__realconstruct = emptyFunc;
			c.prototype = new pc();
			pc.prototype.__realconstruct = tempFunc;

			// append globals
			parents[name] = parentname;
			parentclasses[name] = pc;
		}

		// includes
		includes.push(struct.keys);
		includes.push(struct.c);
		if(struct.parent) includes.push(struct.parent.c);
		var incs = arguments[1];
		if(arguments[1] instanceof Array){ // WIP: --- needs to be reworked
			var incs = arguments[1];
			for(var i=0; i<incs.length; i++){
				struct.includedtypes.push(incs[i]);
				includes.push(loadInclude(incs[i]));
			}
		} else {
			for(var i=1; i<(arguments.length-1); i++){
				struct.includedtypes.push(arguments[i]);
				includes.push(loadInclude(arguments[i]));
			}
		}


		// constructors and makers
		if(struct[C_ABSTRACT]){
			c.prototype.__realconstruct = makers[name] = function(){error(C_ABSTRACT + "Instance", name);}
		} else if(struct[C_SINGLETON]) {
			makers[name] = makeSingleton;
			c.prototype.__realconstruct = function(){
				assemble(name);
				return singles[name] || makeArgs(c, arguments);
			}
		} else {
			makers[name] = makeClass;
			c.prototype.__realconstruct = function(){ // overridden in the assemble function
				assemble(name);
				this.__construct.apply(this, arguments);
			}
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

			// tmeplatize
			templatize(name);

			// should exist now
			if(!structs[name] || !structs[name].declared) malformedError(name);
		}

		// append assembled classes
		classes[name] = struct.c;

		// settings
		var c = struct.c,
			parent = struct.parent,
			proto = c.prototype,
			keys = struct.keys,
			preloads = struct.preloads,
			members_bykey = struct.members_bykey;

		// parent?
		if(parent){
			assemble(parent.name);

			// copy members and keys
			var pc = parent.c;

			var temp = {};
			for(var item in pc.prototype) c[item] = proto[item] = pc.prototype[item];
			for(var item in parent.members) struct.members[item] = parent.members[item];
			for(var item in parent.keys) struct.keys[item] = parent.keys[item];
			for(var item in parent.preloads) struct.preloads[item] = parent.preloads[item];

			// singleton?
			if(parent[C_SINGLETON]) struct[C_SINGLETON] = true;
			if(parent[C_PRIVATE] && !struct[C_PRIVATE]) mismatchError(C_PRIVATE + "Class", struct.header);
		}

		// assemble includes
		for(var i=0; i<struct.includedtypes.length; i++) assemble(struct.includedtypes[i]);

		// call user-defined function
		var newmembers = struct.func.apply({}, struct.includes) || {};

		// add base constructor
		if(!parent && !newmembers.__construct) newmembers.__construct = emptyFunc;

		// add new members
		for(var item in newmembers) addMember(item, newmembers[item], struct);

		// add built-in members
		c.__class = proto.__class = name; // class
		c.__parent = proto.__parent = parent ? parent.name : false; // parent
		for(var item in keys) members_bykey[keys[item]] = struct.members[item];
		c.__member = proto.__member = function(key){return members_bykey[key];} // member
		



		// non-abstract constructors (see declare for abstract constructor)
		if(!struct[C_ABSTRACT]){
			// standard and singletons
			if(!struct[C_SINGLETON]){
				for(var haspreload in preloads) break; // has preload?
				if(!haspreload) proto.__realconstruct = proto.__construct; // no preloads
				else {
					// construct with preloads
					proto.__realconstruct = function(){
						for(var item in preloads) this[keys[item]] = this["make_" + item]();
						this.__construct.apply(this, arguments);
					};
				}
			} else {
				// singleton...
				proto.__realconstruct = function(){
					// as function call
					if(!this.__class) return singles[name] || makeArgs(c, arguments);

					// as instance creation
					if(singles[name]) violationError(C_SINGLETON, name);
					singles[name] = this;
					for(var item in preloads) this[keys[item]] = this["make_" + item](); // preload?
					this.__construct.apply(this, arguments);
				};
			}
		}

		// append globals
		casters[name] = function(value){if(value instanceof c) return value;};

		// return
		return struct;
	},

	warning = function(name, desc){
		error(name, desc, 1);
	},

	error = function(name, desc, iswarning){
		if(typeof(desc) === C_STRING) name += ": " + desc;
		if(iswarning) return console.warn(name);
		throw new Error(name);
	},

	malformedError = function(type, desc){
		error("malformed", desc ? (type + ":" + desc) : type);
	},

	missingError = function(name){
		error("missing", name);
	},

	templateParamError = function(name){
		error("tplParam", name);
	},

	duplicateError = function(header){
		error("duplicate", header);
	},

	violationError = function(prefix, desc){
		error(prefix + "Violation", desc);
	},

	requiredError = function(prefix, desc){
		error(prefix + "Required", desc);
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

		"__construct": function(values){
			if(values) this.props(values);
		},

		// access

		"boo has": function(name){
			return this["get_" + name] ? !!this["get_" + name]() : false;
		},

		"thi set": function(name, value){
			if(debug && !this["set_" + name]) missingError(this.__class + "::set_" + name);
			this["set_" + name](value);
			return this;
		},

		"mix get": function(name){
			if(debug && !this["get_" + name]) missingError(this.__class + "::get_" + name);
			return this["get_" + name]();
		},

		"mix props": function(obj){
			if(obj){
				for(var item in obj) this.set(item, obj[item]);
				return this;
			}
			obj = {};
			for(var item in this){
				if(item.substr(0, 4) === "get_") obj[item.substr(4, 100)] = this[item]();
			}
			return obj;
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
			return this.props();
		}

	}});

	declare("abs Model : Base", function(keys, self, parent){return {
		
		"thi each": function(func){
			for(var item in this){
				if(this.has(item)) func(item, this.get(item));
			}
			return this;
		}

	}});

	declare("Data : Model", function(keys, self, parent){return {

		"pro get typ type": C_MIXED, // use auto-get
		"pro get set mix data": undefined, // use auto-get

		"__construct": function(data){
			parent.__construct.call(this);

			// date data first
			if(data === undefined) this[keys.data] = this.make_data();
			else this.set_data(data);
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

		"__construct": function(values){
			parent.__construct.call(this);
			if(values) this.props(values);
		},

		"make_data": function(){
			return {};
		},

		"get_data": function(){
			return this.props();
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

		"props": function(obj){
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

		// casts

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

		"props": function(arr){
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
			var data = this[keys.data];
			value = this.convert(value);
			if(value === undefined) return this;
			if(pos < 0) pos = data.length + pos;
			else if(pos === data.length) return data.push(value);
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
			return this.props(string.split(token));
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

	// datatype(C_UNDEFINED, C_MIXED, emptyFunc), // KEEP: this had to be added in init() to avoid errors

	datatype(C_SCALAR, C_MIXED, function(value){
		if(scalars[typeof(value)]) return value;
	}, ""),

	datatype(C_STRING, C_SCALAR, function(value){
		value = cast(value, "scalar");
		if(value) return value;
	}, ""),

	datatype("uppercase", C_STRING, function(value){
		value = cast(value, "string");
		if(value !== undefined) return value.toUpperCase();
	}, ""),

	datatype("lowercase", C_STRING, function(value){
		value = cast(value, "string");
		if(value !== undefined) return value.toLowerCase();
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
	}, function(){ // custom maker
		return {};
	}),

	//datatype("null", C_OBJECT, function(value){
	//	if(value === null) return value;
	//}),

	datatype(C_FUNCTION, C_MIXED, function(value){
		if(typeof(value) === "function") return value;
	}, emptyFunc), // custom maker

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

	// --- routines --- //

	/*
	routine("parentof(type)", function(type){
		return "djs.ui.Control";
	});
	*/

	// --- templates --- //


	template("Model<type>", function(classname, type){ // NOTE: keep template name as Model not Data

		declare(classname + " : " + templateParent("Data", type), function(keys, self){ return {

			"pro type": type

		}});

	});
	
	template("Map<type>", function(classname, type){

		declare(classname + " : " + templateParent("Map", type), function(keys, self){ return {

			"pro type": type,

		}});

	});

	template("List<type>", function(classname, type){

		declare(classname + " : " + templateParent("List", type), function(keys, self){ return {

			"pro type": type,

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
	declare.load = load;
	declare.fill = fill;
	declare.make = make;
	declare.makeApply = makeApply;
	declare.warning = warning;
	declare.error = error;
	declare.compile = compile;
	declare.classes = getClasses; // different public name
	declare.config = config;
	declare.member = member;
	declare.prop = prop;
	declare.props = props;
	declare.className = className;
	declare.parentName = parentName;
	declare.parentClass = parentClass;
	declare.debug = function(){return debug;}; // no direct access to this
	declare.version = function(){return version;}; // no direct access to this
	if(debug) declare.inspect = inspect; // internal use only
	return declare;

})();


// requirejs module?
if(window["define"]) define([], function(){return declarejs;});
