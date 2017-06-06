
define([], function(){


	var version = '2.0.0',
	debug = true,
	inspecting = false,
	userules = false, // no rules for internal (see bottom)
	aliases = {},	// see init()
	scalars = {string: 1, number: 1, boolean: 1},
	structs = {}, 	// class structures
	classes = {}, 	// assembled classes
	datatypes = {},
	templates = {},
	casters = {},
	compiles = [], 	// compile queue
	singles = {},	// singletons objects

	init = function(){

		// create alias
		var arr = ("string public protected private static final singleton abstract integer undefined boolean open make").split(" ");
		for(var i=0; i<arr.length; i++){
			var str = arr[i].substr(0, 3);
			aliases[str] = arr[i];
		}

	},

	inspect = function(){
		if(debug) debugger;
	},

	emptyFunc = function(){},

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
		if(typeof(type) === "function") return (value instanceof type) ? value : undefined; // class function?
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

	compiling = false,
	compile = function(){
		if(!compiles.length || compiling) return;
		compiling = true;

		// build classes
		for(var i=0; i<compiles.length; i++) assemble(compiles[i]);
		compiles = [];
		compiling = false;
	},

	get = function(name){
		if(compiles.length) compile();
		return classes[name] || window[name] || assemble(name).c;
	},

	check = function(name){
		var struct = structs[name];
		if(struct.checked) return struct;
		// --- WIP
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
			access: "public",
			type: false,
			ismethod: (rawtype === "function")
		}

		// parse header
		for(var i=0; i<parts.length; i++){
			var part = aliases[parts[i]] || parts[i];
			switch(part){
				case "static": member[part] = true; break;
				case "protected": case "private": case "public": member.access = part; break;
				case "all": // START accessors
				case "get": 
					if(!members["get_"+name]) addMember("get_"+name, function(){return this[member.key];}, struct); 
					if(part === "get") break; // skip "set" if only wanting "get" method
				case "set": 
					if(!members["set_"+name]) addMember("set_"+name, function(value){this[member.key] = cast(value, member.type); return this;}, struct); 
				break; // END accessors
				default: if(part.length) member.type = true; break;
			}
		}

		// parent member?
		if(pmember){
			// check with parent member...
			member.key = pmember.key;
			if(member.access !== pmember.access) mismatchError("access", header);
			if(pmember.access === "private") error("privateMember", header);
			if(pmember.final) error("finalMember", header);
			if((member.ismethod && !pmember.ismethod) || (!member.ismethod && pmember.ismethod)) mismatchError("type", header);
			if((member.static && !pmember.static) || (!member.static && pmember.static)) mismatchError("static", header);
			if(member.type) {} // --- WIP: check compatability here
			else member.type = pmember.type;
		} else {
			// no parent member...
			if(member.access !== "public") member.key = pmember ? pmember.key : obscure(name, member.access);
			if(!member.type) member.type = member.ismethod ? "data" : rawtype;
			struct.keys[name] = member.key;
		}

		// attach member
		if(member.static) c[member.key] = data;
		else c[member.key] = c.prototype[member.key] = data;

		// append struct members
		struct.members[name] = struct.members_new[name] = member;
	},

	datatype = function(name, parent, func){
		if(userules) checkName(name);
		if(datatypes[name]) redeclareError(name);
		
		// checks
		if(userules){
			if(typeof(parent) !== "string") error("needsParent", name);
			if(name.toLowerCase() !== name) error("needsLowercase", name);
		}
		
		datatypes[name] = {name: name, parent: parent, func: func};
		//show("DATATYPE: " + name);
		casters[name] = func;
	},

	checkName = function(name){
		if(name.split(".").length < 2) missingPrefixError(name); // dot required and no spaces allowed
		if(name.split(" ").length > 1) malformedError(name); // dot required and no spaces allowed
	}

	template = function(header, func){
		var parts = header.split(">").shift().split("<"),
			name = parts[0];

		if(userules) checkName(name);

		// duplicate?
		if(templates[name]) redeclareError(header);

		// append global templates
		templates[name] = {name: name, params: parts[1].split(","), func: func};
	},

	castParam = function(value, type, name){
		switch(type){
			case "string": if(value !== "") return value; break;
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
		invalidError("parameter", name);
	},

	loadInclude = function(name){
		return window[name] || loadStruct(name).c;
	},

	loadStruct = function(name){
		if(structs[name]) return structs[name];

		// the class
		var c = function(){c.prototype.__realconstruct.apply(this, arguments);}
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

		// parse header
		for(var i=0; i<parts2.length; i++){
			var part = aliases[parts2[i]] || parts2[i];
			switch(part){
				case "abstract": case "singleton": struct[part] = true; break;
				case "private":
					struct[part] = true;
					delete structs[name]; // do before obscuring
					name = struct.name = obscure(name, "private");
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
		if(struct.abstract){
			c.prototype.__realconstruct = function(){error("abstractInstance", name);}
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
			parent = struct.parent;

		// parent?
		if(parent){
			assemble(parent.name);

			// copy members and keys
			var pc = parent.c;
			for(var item in pc.prototype) c[name] = c.prototype[item] = pc.prototype[item];
			for(var item in parent.members) struct.members[item] = parent.members[item];
			for(var item in parent.keys) struct.keys[item] = parent.keys[item];

			// singleton?
			if(parent.singleton) struct.singleton = true;
			if(parent.private && !struct.private) mismatchError("privateClass", struct.header);
		}

		// call user-defined function
		var newmembers = struct.func.apply({}, struct.includes) || {};

		// add new members
		for(var item in newmembers) addMember(item, newmembers[item], struct);

		// add extras
		c.__class = c.prototype.__class = name;
		c.__parent = c.prototype.__parent = parent ? parent.name : false;
		if(!c.prototype.__construct) c.prototype.__construct = c.__construct = emptyFunc;

		// non-abstract constructors (see declare for abstract constructor)
		if(!struct.abstract){
			// standard and singletons
			if(!struct.singleton) c.prototype.__realconstruct = c.prototype.__construct; 
			else {
				// singleton...
				c.prototype.__realconstruct = function(){
					if(singles[name]) error("multiSingletons", name);
					singles[name] = this;
					this.__construct.apply(this, arguments);
				}
				c.single = function(){
					return singles[name] || makeWith(name, arguments);
				}
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
		error("redeclared", header);
	},

	mismatchError = function(name, desc){
		error(name + "Mismatch", desc);
	},

	invalidError = function(name, desc){
		error(name + "Invalid", desc);
	},

	end = 0;



	// --- classes --- //
	
	declare("Map<data>", function(keys, self, parent){return {

		"protected attrs": undefined,
		"protected type": "data",

		"__construct": function(obj){
			this[keys.attrs] = {};
			if(obj) this.values(obj);
		},

		"convert": function(value, key){
			return cast(value, this[keys.type]);
		},

		"each": function(func){
			var attrs = this[keys.attrs];
			for(var item in attrs) func(item, attrs[item]);
			return this;
		},

		"remove": function(name){
			var attrs = this[keys.attrs],
				value = attrs[name];
			delete attrs[name];
			return value;
		},

		"count": function(){
			var c = 0;
			for(var item in this[keys.attrs]) c++;
			return c;
		},

		"values": function(obj){
			if(obj){
				for(var item in obj) this.set(item, obj[item]);
				return this;
			}
			var attrs = this[keys.attrs];
			obj = {};
			for(var item in attrs) obj[item] = attrs[item];
			return obj;
		},

		"set": function(name, value){
			value = this.convert(value);
			if(value !== undefined) this[keys.attrs][name] = value;
			return this;
		},

		"get": function(name, _else){
			return this[keys.attrs][name] || _else;
		}

	}});

	declare("List<data> : Map<data>", function(keys, self, parent){ return {

		"__construct": function(arr){
			this[keys.attrs] = [];
			if(arr) this.values(arr);
		},

		"each": function(func){
			var attrs = this[keys.attrs];
			for(var i=0; i<attrs.length; i++) func(i, attrs[i]);
			return this;
		},

		"count": function(){
			return this[keys.attrs].length;
		},

		"values": function(arr){
			if(arr){
				for(var i=0; i<arr.length; i++) this.set(i, arr[i]);
				return this;
			}
			var attrs = this[keys.attrs];
			arr = [];
			for(var i=0; i<attrs.length; i++) arr.push(attrs[i]);
			return arr;
		},

		"set": function(pos, value){
			value = this.convert(value);
			if(value === undefined) return this;
			if(pos < 0) pos = this[keys.attrs].length + pos;
			else if(pos === (attrs.length-1)) return attrs.push(value);
			else if(attrs[pos] !== undefined) return attrs[pos] = value;
			return this;
		},

		"remove": function(pos){
			var attrs = this[keys.attrs];
			if(pos === 0) return attrs.shift();
			if(pos === attrs.length-1) return attrs.pop();
			if(attrs[pos] !== undefined) return attrs.splice(pos, 1).pop();
		},

		"append": function(value){
			value = this.convert(value, this[keys.attrs].length);
			if(value !== undefined) this[keys.attrs].push(value);
			return this;
		},

		"prepend": function(value){
			value = this.convert(value, 0);
			if(value !== undefined) this[keys.attrs].unshift(value);
			return this;
		}

	}});
	
	// init
	init();


	// --- datatype --- //

	datatype("data", false, function(value){
		return value;
	}),

	datatype("scalar", "data", function(value){
		if(scalars[typeof(value)]) return value;
	}, ""),

	datatype("string", "scalar", function(value){
		value = cast(value, "scalar");
		if(value) return value;
	}, ""),

	datatype("number", "scalar", function(value){
		if(!isNaN(value)) return value;
		value = parseFloat(value);
		if(!isNaN(value)) return value;
	}, 0),

	datatype("integer", "number", function(value){
		value = parseInt(value);
		//debugger;
		if(!isNaN(value)) return value;
	}),

	datatype("boolean", "scalar", function(value){
		if(value === true || value === false) return value;
		return (!value || value === "" || value === null) ? false : true;
	}, false),

	datatype("object", "data", function(value){
		if(typeof(value) === "object") return value;
	}),

	datatype("function", "data", function(value){
		if(typeof(value) === "function") return value;
	}),

	datatype("class", "function", function(value){
		if(typeof(value) === "function" && value.__class) return value;
	}),

	datatype("type", "string", function(value){
		value = cast(value, "string");
		if(value && casters[value]) return value;
	}),

	datatype("datatype", "type", function(value){
		value = cast(value, "string");
		if(value && datatypes[value]) return value;
	}),

	datatype("classtype", "type", function(value){
		value = cast(value, "string");
		if(value && classes[value]) return value;
	}),


	// --- templates --- //
	
	template("Map<string>", function(classname, type){

		declare(classname + " : Map<data>", function(keys, self){ return {

			"protected type": type,

		}});

	});

	template("List<string>", function(classname, type){

		declare(classname + " : List<data>", function(keys, self){ return {

			"protected type": type,

		}});

	});



	// --- internal --- //

	compile();
	userules = true;
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
	if(debug) declare.inspect = inspect; // internal use only
	return declare;

});