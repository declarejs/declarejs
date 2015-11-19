console.log("loaded declare.js");

/*
* DeclareJS - Object Oriented JavaScript
* Copyright (c) 2015  http://www.declarejs.org
* Licenses: https://github.com/declarejs/declarejs/blob/master/License
*/


var declare = function(id, pid, func){declare.builder(id, pid, func, false, false, arguments);}; // global


(function(d){

	// --- settings --- //

	var version = '1.0.0',
	debug = true,
	debug_types = true,
	isruntime = false,
	building = false,
	reserveds = {"protected": true, "static": true, "public": true, "final": true},
	types = {"class": true, "type": true, "scalar": true, "number": true, "boolean": true, "function": true},
	scalars = {"scalar": true, "number": true, "boolean": true},
	dataTypes = {},
	_classes = {},
	_classesbyid = {},
	structs = {},
	//_classes = {},
	//_classesbyid = {},
	handlers = {},
	configs = {
		debug: true
	},


	// --- functions --- //

	toFunction = function(obj, method){
		return function(){return obj[method].apply(obj, arguments);}
	}

	on = function(event, func){ 
		func = mustCast(func, 'function');
		if(handlers[event]){

			// is triggered once?
			if(handlers[event]["triggered"]) func.apply({}, handlers[event]);
			else handlers[event].push(func);
		}
		else handlers[event] = [func];
	},

	trigger = function(event){
		if(!handlers[event]) return;
		for(var i=0; i<handlers[event].length; i++) handlers[event][i].apply({}, arguments);
	},

	triggerOnce = function(event){
		if(handlers[event]) {
			for(var i=0; i<handlers[event].length; i++) handlers[event][i].apply({}, arguments);
		}
		// save arguments and set indicator
		handlers[event] = arguments;
		handlers[event].triggered = true;
	},

	same = function(mixed1, mixed2){
		if(mixed1 === mixed2) return true;
		if(!(mixed1 instanceof _classes.djs.Base) || !(mixed2 instanceof _classes.djs.Base)) return false;
		var classname = mixed1.className();
		return structs[classname].single ? classname === mixed2.className() : false;
	},

	className = function(Obj){
		return (Obj instanceof _classes.djs.Base) ? Obj.className() : false;
	},

	runtime = function(){

		// it's runtime!
		if(isruntime) return;
		isruntime = true;


		for(var item in dataTypes){
			dataTypes[item] = new _classesbyid[dataTypes[item]];
		}
	
	},

	loadLibrary = function(name){
		if(_classesbyid[name]) return _classesbyid[name];

		console.log("**** loadLibrary(): " + name);

		
			
		var parts = name.split("."),
			libname = "";
			lib = _classes; // start with base library

		for(var i=0; i<parts.length; i++){
			var part = parts[i];
			libname += libname.length ? ("." + part) : parts[i];

			// if library exists, continue
			if(!_classesbyid[libname]) lib[part] = _classesbyid[libname] = {};

			// keep it going
			lib = lib[part];

		}

		
		return lib;
		
	},

	library = function(id, func){
		classes();

		// check name
		if(debug && id.toLowerCase() !== id) error("MALFORMED_LIBRARY_NAME: " + id);

		// vars
		var lib = loadLibrary(id),
			innerClass = function(){},
			data = {protected: {}, public: {}}; // no static members for classes!

		// libraries
		var params = [data];
		if(arguments.length == 2) params.push(_classes); // no specified libraries
		else {
			for(var i=2; i<arguments.length; i++) params.push(loadLibrary(arguments[i]));
		}

		// load members
		func.apply(window, params);

		// parse implied members
		for(var item in data){
			if(item === "protected" || item === "public") continue;
			if(typeof(data[item]) === "function") data.public[item] = data[item]; // functions are implied public
			else data.protected[item] = data[item]; // non-functions are implied protected
		}

		// protected members
		for(var item in data.public) innerClass.prototype[item] = data.public[item];
		
		// create protected object - keep here!
		var inner = new innerClass();

		// public members
		for(var item in data.public){
			if(typeof(data.public[item]) !== "function") error('PUBLIC_DATA_MEMBER', item, id);
			lib[item] = publicMethod(item, data.public[item], inner);
		}

	},

	classes = function(id){

		// still building?
		if(building) error('LIBRARY_VIOLATION');

		// it's runtime!
		runtime();

		if(id === undefined) return _classes;
		return _classesbyid[id] ? _classesbyid[id] : false;
	},

	emptyFunc = function(){},


	error = function(code, str, id){
		if(str instanceof Object) console.log(str);
		else if(str) code += ': ' + str;
		if(id) code += '     CLASS: ' + id + '';
		throw new Error(code);
	},

	outerMethod = function(){
		return this;
	},
	
	staticMethod = function(func, StaticObj){
		return function(){
			func.apply(StaticObj, arguments);
		}
	},

	accessMethod = function(member, value, type, _else){
		if(value === undefined) return this;
		this[member] = cast(value, type, _else);
		return this;
	},

	publicMethod = function(item, method, inner){

		return function(){
			for(var i=0; i<arguments.length; i++){
				if(typeof(arguments[i]) === "object"){ 
					arguments[i] = (arguments[i].__outer === undefined) ? error("FORBIDDEN_PARAM", arguments[i]) : arguments[i].__outer();
				}
			}
			
			var r = method.apply(inner, arguments);
			if(typeof(r) === "object") return r.__outer === undefined ? error("FORBIDDEN_RETURN") : r.__outer();
			return r;
		}

		/*
		return function(){
			try {
				for(var i=0; i<arguments.length; i++) arguments[i] = (arguments[i] instanceof Object) ? arguments[i].__outer() : arguments[i];
				var r = method.apply(inner, arguments);
				if(r instanceof Object) return r.__outer === undefined ? error("FORBIDDEN_OBJECT222") : r.__outer();
				return r;
				//return (r instanceof Object) ? r.__outer() : r;
			} catch(e){
				error('FORBIDDEN_OBJECT', 'using ' + item + '()');
			}
		}
		*/
	},

	typeInner = function(id, pid, func){type(id, pid, func, true);},

	// --- public functions --- //

	type = function(id, pid, func, inner){
		if(dataTypes[id]) error('DUPLICATE_DATATYPE: ' + id);

		// mixed is default parent
		if(func === undefined){func = pid; pid = "mixed";}

		// check for malformed names
		if(debug && id.toLowerCase() !== id) error('BAD_TYPE_NAME: ' + id + " must be " + id.toLowerCase());

		// internal or public type
		if(inner){
			dataTypes[id] = "djs." + id + "Type";
			builder(dataTypes[id], "djs." + pid + "Type", func);
		} else {
			dataTypes[id] = id + "Type";
			builder(dataTypes[id], pid + "Type", func);
		}


		// is runtime?
		if(isruntime) dataTypes[id] = new _classesbyid[dataTypes[id]];
	},

	register2 = function(name, mixed, obj){

		switch(typeof(mixed)){
			case 'object':
				for(var item in mixed){
					obj[item] = {};
					register2(item, mixed[item], obj[item]);
				}
			return;
			case 'function':
				obj[item] = lib[item];
			return;
		}

	},

	register = function(mixed){

		// library
		if(typeof(mixed) === "string"){
			_classes[mixed] = {};
			for(var item in arguments[1]) register2(item, arguments[1][item], _classes[mixed]);
			return;
		}

		// _classes
		/*
		for(var i=0; i<arguments.length; i++){
			if(arguments[i] === Array || arguments[i] === Object) error('FORBIDDEN_CLASS', ((arguments[i] === Array) ? 'Array' : 'Object') + ' class');
			classfunc.prototype.__outer = outerMethod;
		}
		*/
	},

	getType = function(mixed){
		var t = typeof(mixed);
		if(t === "object") return t.__outer === undefined ? t : t.className();
		return r;
	},

	config = function(name, value){
		if(typeof(name) === 'object'){for(var item in name) configs[item] = name[item];} 
		else if(value === undefined) return configs[name];
		else configs[name] = value;
	},

	falseLike = function(mixed, type){
		return dataTypes[type] ? dataTypes[type].falseLike(mixed) : dataTypes["mixed"].falseLike(mixed);
	},

	is = function(mixed, type, strict){
		return dataTypes[type] ? dataTypes[type].valid(mixed, strict) : (mixed instanceof type);
	},

	cast = function(mixed, type, _else){
		if(dataTypes[type]){
			mixed = dataTypes[type].cast(mixed);
			return (mixed === undefined) ? _else : mixed;
		}
		return (mixed instanceof type) ? mixed : _else;
	},

	castAbs = function(mixed, type){
		switch(type){
			case 'number': return cast(mixed, type, 0);
			case 'boolean': return cast(mixed, type, false);
			case 'scalar': return cast(mixed, type, '');
			case 'string': return cast(mixed, type, '');
		}
	},

	mustCast = function(mixed, type, _else){
		mixed = cast(mixed, type, _else);
		return (mixed === undefined) ? error('BAD_TYPE: ' + type) : mixed;
	},

	// --- builder --- //

	builder = function(id, pid, func, single, abstract, args){
		building = true;

		// check arguments
		if(_classesbyid[id]!==undefined) error('DUPLICATE_CLASS', id);

		// has parent?
		var parentProvided = (typeof(pid) === "string");
		if(!parentProvided){ // no parent
			func = pid;
			pid = "djs.Base";
		} else {
			if(func === undefined) func = function(){};
			if(_classesbyid[pid]===undefined) error('BAD_PARENT_CLASS', pid);
		}
		var pstruct = structs[pid];
		if(pstruct.single) single = true; // all child _classes to a singleton must be singletons

		// has libraries
		var libs = [];
		if(args !== undefined){
			var afterfunc = false;
			for(var i=0; i<args.length; i++){
				if(afterfunc) libs.push(loadLibrary(args[i]));
				else if(typeof(args[i]) === "function") afterfunc = true;
			}
		}
		if(!libs.length) libs = _classes;


		// setting
		var publics = {},
			protecteds = {},
			statics = {},
			members = {},
			StaticObj = {},
			struct = {
				id: id, 
				InnerSingle: false, 
				StaticObj: StaticObj, 
				finals: {}, 
				protecteds: protecteds, 
				statics: statics, 
				publics: publics, 
				members: members, 
				single: single, 
				abstract: abstract
			};

		// add to structures array
		structs[id] = struct;

		// copy parent finals
		for(var item in pstruct) struct.finals[item] = true;

		// create inner class
		var inner = struct.inner = function(){}

		// create outer class
		if(abstract){
			var outer = function(){
				if(!building) error('ABSTRACT_CLASS', id);
			}
		} else if(single){ // this MUST come after abstract conditional
			var outer = function(){
				if(building) return;
				if(struct.InnerSingle) var Inner = struct.InnerSingle;
				else var Inner = struct.InnerSingle = new inner();

				// dup from below
				var that = this;
				Inner.__outer = this.__outer = function(){return that;};
				for(var item in struct.publics) this[item] = publicMethod(item, struct.publics[item], Inner);
				members.__construct.apply(Inner, arguments);
			}
		} else {
			var outer = function(){
				if(building) return;
				var Inner = new struct.inner();
				var that = this;
				Inner.__outer = this.__outer = function(){return that;};
				for(var item in struct.publics) this[item] = publicMethod(item, struct.publics[item], Inner);
				members.__construct.apply(Inner, arguments);
			}
		}

		// add outer class to _classesbyid array

		var idparts = id.split('.');
		var basename = idparts.pop();
		var libname = idparts.join(".");
		//console.log("=== testing: " + libname + ", " + basename);
		var lib = loadLibrary(libname);

		lib[basename] = _classesbyid[id] = struct.outer = outer;
		//struct.outer = outer;

		// extends
		outer.prototype = new pstruct.outer;
		inner.prototype = new outer();


		// methods
		outer.public = {};
		outer.protected = {};
		outer.static = {};
		outer.final = {
			public: {},
			protected: {}
		}

		// call class definition function
		// --- OLD: parentProvided ? func(struct.outer, pstruct.outer, _classes) : func(struct.outer, _classes);
		var params = parentProvided ? [struct.outer, pstruct.outer] : [struct.outer];
		for(var i=0; i<libs.length; i++) params.push(libs[i]);
		func.apply(window, params);

		// check for reserved word usage
		for(var item in reserveds){
			if(typeof(struct.outer[item]) !== 'object') error('RESERVED_WORD', item, id);
		}

		// implied members - KEEP BEFORE "call / apply" BUT AFTER FUNC CALL
		for(var item in outer){
			if(reserveds[item]) continue;
			if(typeof(outer[item]) === 'function') outer.public[item] = outer[item]; // methods are implied as public
			else outer.protected[item] = outer[item]; // data members are implied as protected
			delete outer[item];
		}

		// call / apply - KEEP AFTER FUNC CALL
		//outer.call = inner.call = callMethod(struct);
		//outer.apply = inner.apply = applyMethod(struct);


		// forced public method
		outer.public.className = function(){return id;}
		outer.public.parentClass = function(){return pstruct.outer;};

		// finals
		for(var item in outer.final){ // implied finals
			
			if(!reserveds[item]) outer.final.public[item] = outer.final[item];
		}
		for(var item in outer.final.protected){
			outer.protected[item] = outer.final.protected[item];
			struct.finals[item] = true;
		}
		for(var item in outer.final.public){
			outer.public[item] = outer.final.public[item];
			struct.finals[item] = true;
		}

		// check for non-scalars and non-functions
		var arr = [outer.protected, outer.public];
		for(var i=0; i<arr.length; i++){
			for(var item in arr[i]){
				var member = arr[i][item];
				var t = typeof(arr[i][item]);
				if(t === 'object' || (t === 'function' && arr[i][item].className)) error('OBJECT_AS_MEMBER', item, id);
			}
		}

		// copy parent members
		for(var item in pstruct.protecteds) members[item] = protecteds[item] = pstruct.protecteds[item];
		for(var item in pstruct.publics) members[item] = publics[item] = pstruct.publics[item];

		// protected members
		for(var item in outer.protected){
			if(pstruct.finals[item]) error('FINAL_METHOD', item+'()', id);
			if(publics[item] !== undefined) error('MUST_BE_PUBLIC', item+'()', id);
			members[item] = protecteds[item] = outer.protected[item];
		}

		// public members
		for(var item in outer.public){
			if(pstruct.finals[item]) error('FINAL_METHOD', item+'()', id);
			if(protecteds[item] !== undefined) error('MUST_BE_PROTECTED', item+'()', id);
			var method = outer.public[item];
			if(typeof(method)!=='function') error('PUBLIC_DATA_MEMBER', item, id);
			members[item] = publics[item] = method;
		}

		// assign all members to inner prototype
		for(var item in members){
			inner.prototype[item] = members[item];
			outer[item] = members[item]; // --- WIP
		}

		// static methods
		inner.prototype.static = StaticObj;
		StaticObj.static = StaticObj; // just in case the developer references this.static inside a static method
		for(var item in outer.static){

			// check
			if(members[item] !== undefined) error('STATIC_ALREADY_DEFINED', id + '::' + item);
			if(reserveds[item]) error('RESERVED_WORD', id + '::' + item);

			// assign
			var member = outer.static[item];
			StaticObj[item] = member;
			if(typeof(member)==='function') outer[item] = staticMethod(member, StaticObj);
		}

		// forced static member
		outer.className = function(){return id;};
		outer.parentClass = function(){return pstruct.outer;};

		// remove
		delete outer.public;
		delete outer.protected;
		delete outer.static;
		delete outer.final;

		// no more building
		building = false;

		return outer;


	},	// END BUILDER

	init = function(){



		// --- types --- //


		// base type
		dataTypes["mixed"] = "djs.mixedType";
		builder("djs.mixedType", function(self){ // the base type

			self.cast = function(value, strict){
				return value;
			}

			self.valid = function(value, strict){
				return (this.cast(value, strict) !== undefined);
			}

			self.falseLike = function(value){
				return (!value || value === "" || value === "0" || value === null);
			}

		});


		typeInner("scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case 'string': case 'number': case 'bool': return value; 
				}
				if(!strict && (value === undefined || value === null)) return false;
			}

		});

		typeInner("bool", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return strict ? undefined : (value ? true : false);
					case "string": return strict ? undefined : (value.length ? true : false);
					case "bool": return value;
				}
				if(!strict && (value === undefined || value === null)) return false;
			}

		});

		typeInner("number", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return value;
					case "string": return strict ? undefined : parseFloat(value);
					case "bool": return strict ? undefined : (value ? 1 : 0);
				}
				if(!strict && (value === undefined || value === null)) return 0;
			}

		});

		typeInner("int", "number", function(self){

			self.cast = function(value, strict){
				value = parent.cast.call(this, value, strict);
				if(value !== undefined) return parseInt(value);
			}

		});

		typeInner("string", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return strict ? undefined : (value + "");
					case "string": return value;
					case "bool": return strict ? undefined : (value ? "1" : "");
				}
				if(!strict && (value === undefined || value === null)) return "";
			}

		});

		typeInner("email", "string", function(self, parent){

			self.cast = function(str){
				str = parent.cast.call(this, str, true);
				if(str === undefined) return;
				var parts = str.split('@');
				if(parts.length === 2 && parts[0].length && parts[1].length) return str;
			}

		});

		typeInner("timestamp", "string", function(self, parent){

			self.cast = function(value, strict){
				value = parent.cast.call(this, value, true);
				if(value === undefined) return;
				var parts = value.split(" ");
				if(parts.length === 2 && parts[0].split("-").length === 3 && parts[1].split(":").length === 3) return value;
			}

			self.falseLike = function(value){
				value = this.cast(value);
				return (value === undefined || value === "0000-00-00 00:00:00");
			}

		});

		typeInner("type", function(self){

			self.cast = function(value){
				if(dataTypes[value]) return true;
				return (typeof(value) === "function" && value.__outer) ? value : undefined;
			}

		});

		typeInner("class", function(self, parent){

			self.cast = function(value){
				return (typeof(value) === "function" && value.__outer) ? value : undefined;
			}

		});

		typeInner("function", function(self){

			self.cast = function(value){
				return (typeof(value) === "function") ? value : undefined;
			}

		});

		typeInner("object", function(self){

			self.cast = function(value){
				return (typeof(value) === "object") ? value : undefined;
			}

		});


		// --- array overrides --- //

		Array.prototype.clear = function(Obj){
			while(this.length) this.pop();
			if(Obj) this.copyFrom(Obj);
			return this;
		}

		Array.prototype.list = function(){
			var Obj = new d.list();
			for(var i=0; i<this.length; i++) Obj.push(this[i]);
			return Obj;
		}

		Array.prototype.copyTo = function(Obj){
			if(Obj instanceof Array) Obj.copyFrom(this);
			else if(Obj instanceof d.list){
				for(var i=0; i<this.length; i++) Obj.push(this[i]);
			}
			return this;
		}

		Array.prototype.copyFrom = function(Obj){
			if(Obj instanceof d.list){
				for(var i=0; i<Obj.count(); i++) this.push(Obj.get(i));
			} else if(Obj instanceof Array){
				for(var i=0; i<Obj.length; i++) this.push(Obj[i]);
			}
			return this;
		}

		// --- js library --- //

		_classes.js = {
			Object: Object, 
			Array: Array, 
			Date: Date, 
			RegExp: RegExp, 
			Number: Number, 
			Boolean: Boolean, 
			String: String,

			// can't instantiate
			Math: Math, 
			Document: Document, 
			Window: Window
		};

		_classesbyid.js = _classes.js; // add classes by id

	}; // END INIT / END FUNCTIONS


	// --- public functions --- //

	d.singleton = function(id, pid, func){builder(id, pid, func, true, false, arguments);}
	d.abstract = function(id, pid, func){builder(id, pid, func, false, true, arguments);}
	d.abstract.singleton = d.singleton.abstract = function(id, pid, func){builder(id, pid, func, true, true, arguments);}

	// other globals
	var globals = {
		falseLike: falseLike,
		error: error,
		toFunction: toFunction,
		on: on,
		is: is, 
		cast: cast, 
		castAbs: castAbs, 
		mustCast: mustCast,
		classes: classes, 
		library: library, 
		config: config, 
		builder: builder, 
		className: className,
		version: function(){return version},
		register: register,
		type: type
		}
	for(var item in globals) d[item] = globals[item];


	// --- base class --- //

	var baseid = "djs.Base";
	var baseStruct = {
		id: baseid,
		statics: {}, 
		protecteds: {__access: accessMethod},
		publics: {__construct: emptyFunc},
		members: {__construct: emptyFunc, __access: accessMethod}, 
		InnerSingle: false,
		single: false, 
		abstract: true,
		finals: {},
		outer: function(){},
		inner: function(){}
	}

	d._class = baseStruct.outer;
	structs[baseid] = baseStruct;

	// add base class
	_classes[baseid] = _classesbyid[baseid] = baseStruct.outer;

	// add djs library
	_classes.djs = _classesbyid.djs = {}; // init _classes
	_classes.djs.Base = baseStruct.outer;

	// --- initiate --- //

	init();



})(declare); // END PLUGIN

	






// requirejs module

define(function(){

	return declare;

}); // END MODULE




