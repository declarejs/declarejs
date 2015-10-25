/*
* DeclareJS - Object Oriented JavaScript
* Copyright (c) 2015  http://www.declarejs.org
* Licenses: https://github.com/declarejs/declarejs/blob/master/License
* testing
*/


var declare = function(id, pid, func){declare.builder(id, pid, func, false, false);}; // global


(function(d){

	// --- settings --- //

	var version = '1.0.0',
	debug = true,
	debug_datatypes = true,
	isruntime = false,
	building = false,
	reserveds = {"protected": true, "static": true, "public": true, "final": true},
	types = {"class": true, "type": true, "scalar": true, "number": true, "boolean": true, "function": true},
	scalars = {"scalar": true, "number": true, "boolean": true},
	dataTypes = {},
	classes = {},
	classesbyid = {},
	structs = {},
	libraries = {},
	configs = {
		debug: true
	},


	// --- functions --- //

	className = function(Obj){
		return Obj.className();
	},

	on = function(event, func){
		// --- WIP
	},

	ready = function(func){
		// --- WIP
	},

	library = function(child){
		if(building) error('LIBRARY_VIOLATION');

		// it's runtime!
		if(!isruntime){
			isruntime = true;
			for(var item in dataTypes){
				dataTypes[item] = new classesbyid[dataTypes[item]];
			}
		}

		if(child === undefined) return classes;
		return libraries[child] ? libraries[child] : error('NO_LIBRARY: ' + child);
	},

	emptyFunc = function(){},


	error = function(code, str, id){
		if(str) code += ': ' + str;
		if(id) code += '     CLASS: ' + id + '';
		throw new Error(code);
	},

	outerMethod = function(){
		return this;
	},

	callMethod = function(struct){ // --- IS THIS BEING USED?
		return function(Obj, method){
			var args = [];
			for(var i=2; i<arguments.length; i++) args.push(arguments[i]);
			if(Obj instanceof struct.outer) struct.members[method].apply(Obj, args);
			else error('FORBIDDEN_CALL', method, struct.id);
		}
	},

	applyMethod = function(struct){ // --- IS THIS BEING USED?
		return function(Obj, method, args){
			if(Obj instanceof struct.outer) struct.members[method].apply(Obj, args);
			else error('FORBIDDEN_CALL', method, struct.id);
		}
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
			try {
				for(var i=0; i<arguments.length; i++) arguments[i] = (arguments[i] instanceof Object) ? arguments[i].__outer() : arguments[i];
				var r = method.apply(inner, arguments);
				return (r instanceof Object) ? r.__outer() : r;
			} catch(e){
				error('FORBIDDEN_OBJECT', 'using ' + item + '()');
			}
		}
	},

	config = function(name, value){
		if(typeof(name) === 'object'){for(var item in name) configs[item] = name[item];} 
		else if(value === undefined) return configs[name];
		else configs[name] = value;
	},

	falsy = function(mixed, type){
		return dataTypes[type] ? dataTypes[type].falsy(mixed) : dataTypes["mixed"].falsy(mixed);
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

	datatypeInner = function(id, pid, func){datatype(id, pid, func, true);},

	datatype = function(id, pid, func, inner){
		if(dataTypes[id]) error('DUPLICATE_DATATYPE: ' + id);

		// mixed is default parent
		if(func === undefined){func = pid; pid = "mixed";}

		if(inner){
			dataTypes[id] = "djs." + id + "Type";
			builder(dataTypes[id], "djs." + pid + "Type", func);
		} else {
			dataTypes[id] = id.split("_").join(".") + "Type";
			builder(dataTypes[id], pid.split("_").join(".") + "Type", func);
		}
		if(isruntime) dataTypes[id] = new classesbyid[dataTypes[id]];
	},

	outsideClass = function(classfunc){
		for(var i=0; i<arguments.length; i++){
			if(arguments[i] === Array || arguments[i] === Object) error('FORBIDDEN_CLASS', ((arguments[i] === Array) ? 'Array' : 'Object') + ' class');
			classfunc.prototype.__outer = outerMethod;
		}
	},

	builder = function(id, pid, func, single, abstract){
		building = true;

		// check arguments
		if(classesbyid[id]!==undefined) error('DUPLICATE_CLASS', id);

		// has parent?
		var parentProvided = (func !== undefined);
		if(!parentProvided){
			func = pid;
			pid = "djs.base";
		} else if(classesbyid[pid]===undefined){
			error('BAD_PARENT_CLASS', pid);
		}
		var pstruct = structs[pid];
		if(pstruct.single) single = true; // all child classes to a singleton must be singletons

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

		// add outer class to classesbyid array
		classesbyid[id] = struct.outer = outer;

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
		parentProvided ? func(struct.outer, pstruct.outer, classes) : func(struct.outer, classes);

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
		outer.call = inner.call = callMethod(struct);
		outer.apply = inner.apply = applyMethod(struct);


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

		// classes object
		var idparts = id.split('.');
		if(idparts.length < 2) error("NO_VENDOR_PREFIX: " + id);
		var arr = classes;
		var libname = "";
		for(var i=0; i<idparts.length-1; i++){
			var part = idparts[i];
			libname += libname.length ? ("." + part) : part;
			if(arr[part] === undefined){
				arr[part] = {};
				libraries[libname] = arr[part];
			}
			else if(typeof(arr[part]) !== 'object') error('BAD_CLASS_NAME', id);
			arr = arr[part];
		}
		arr[idparts[i]] = outer;

		// no more building
		building = false;

		return outer;


	},	// END BUILDER

	init = function(){

		// register native classes

		outsideClass(Date);

		// --- built in classes --- //


		d("djs.Map", function(self, classes){

			self.protected._type = false;
			self.protected.items = undefined;

			self.__construct = function(){
				this.items = {};
				for(var i=0; i<arguments.length; i+=2) this.set(arguments[i], arguments[i+1]);
			}

			self.protected.cast = function(mixed){
				return this._type ? cast(mixed, this._type) : mixed;
			}

			self.type = function(value){
				return this.__access('_type', value, 'type', false);
			}

			self.clear = function(){
				this.items = {};
				return this;
			}

			self.count = function(name, _else){
				var c = 0;
				for(var item in this.items) c++;
				return c;
			}

			self.get = function(name, _else){
				return (this.items[name] === undefined) ? _else : this.items[name];
			}

			self.set = function(name, value){
				for(var i=0; i<arguments.length; i+=2){
					name = arguments[i];
					value =  this.cast(arguments[i+1]);
					if(value !== undefined) this.items[name] = value;
					else if(this.items[name] !== undefined) delete this.items[name];
				}
				return this;
			}

			self.each = function(func){
				for(var item in this.items) func(item, this.items[item]);
				return this;
			}

			// END OF CLASS
		});

		d("djs.MapOf", "djs.Map", function(self, classes){

			self.__construct = function(type, items){
				this.items = {};
				if(type) this.type(type);
				if(items === undefined) return;
				for(var item in items) this.set(item, items[item]);
			}

			// END OF CLASS
		});


		d("djs.List", "djs.Map", function(self, parent, classes){


			self.__construct = function(){
				this.items = [];
				for(var i=0; i<arguments.length; i++) this.push(arguments[i]);
			}


			self.protected.passOn = function(method, args, setting){
				if(setting){
					for(var i=0; i<args.length; i++){
						args[i] = this.cast(args[i]);
						if(args[i] === undefined) error('BAD_TYPE', self.className());
					}
				}
				var r = Array.prototype[method].apply(this.items, args);
				if(r === this.items) return this;
				return (r instanceof Array) ? r.list() : r;
			}

			self.clear = function(){
				this.items = [];
				return this;
			}

			self.count = function(){return this.items.length; }

			self.set = function(pos, value){
				for(var i=0; i<arguments.length; i++){
					pos = arguments[i];
					value =  this.cast(arguments[i+1]);
					if(value === undefined) continue;
					if(this.items[pos] !== undefined) this.items[pos] = value;
					else if(this.items.length === name) this.push(value);
				}
				return this;
			}

			self.each = function(func){
				for(var i=0; i<this.items.length; i++) func(i, this.items[i]);
				return this;
			}

			// copy array methods

			var methods = {split: false, push: true, pop: false};
			var pass = function(method, setting){
				return function(){return this.passOn(method, arguments, setting);}
			}

			for(var item in methods) self.public[item] = pass(item, methods[item]);

			// END OF CLASS
		});
		
		d("djs.ListOf", "djs.List", function(self, classes){

			self.__construct = function(type, arr){
				this.items = [];
				if(type) this.type(type);
				if(arr === undefined) return;
				for(var i=0; i<arr.length; i++) this.push(arr[i]);
			}

			// END OF CLASS
		});




		// --- datatypes --- //


		// base datatype
		dataTypes["mixed"] = "djs.mixedType";
		builder("djs.mixedType", function(self){ // the base type

			self.cast = function(value, strict){
				return value;
			}

			self.valid = function(value, strict){
				return (this.cast(value, strict) !== undefined);
			}

			self.falsy = function(value){
				return (!value || value === "" || value === "0" || value === null);
			}

		});


		datatypeInner("scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case 'string': case 'number': case 'bool': return value; 
				}
				if(!strict && (value === undefined || value === null)) return false;
			}

		});

		datatypeInner("bool", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return strict ? undefined : (value ? true : false);
					case "string": return strict ? undefined : (value.length ? true : false);
					case "bool": return value;
				}
				if(!strict && (value === undefined || value === null)) return false;
			}

		});

		datatypeInner("number", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return value;
					case "string": return strict ? undefined : parseFloat(value);
					case "bool": return strict ? undefined : (value ? 1 : 0);
				}
				if(!strict && (value === undefined || value === null)) return 0;
			}

		});

		datatypeInner("int", "number", function(self){

			self.cast = function(value, strict){
				value = parent.cast.call(this, value, strict);
				if(value !== undefined) return parseInt(value);
			}

		});

		datatypeInner("string", "scalar", function(self){

			self.cast = function(value, strict){
				switch(typeof(value)){
					case "number": return strict ? undefined : (value + "");
					case "string": return value;
					case "bool": return strict ? undefined : (value ? "1" : "");
				}
				if(!strict && (value === undefined || value === null)) return "";
			}

		});

		datatypeInner("email", "string", function(self, parent){

			self.cast = function(str){
				str = parent.cast.call(this, str, true);
				if(str === undefined) return;
				var parts = str.split('@');
				if(parts.length === 2 && parts[0].length && parts[1].length) return str;
			}

		});

		datatypeInner("timestamp", "string", function(self, parent){

			self.cast = function(value, strict){
				value = parent.cast.call(this, value, true);
				if(value === undefined) return;
				var parts = value.split(" ");
				if(parts.length === 2 && parts[0].split("-").length === 3 && parts[1].split(":").length === 3) return value;
			}

			self.falsy = function(value){
				value = this.cast(value);
				return (value === undefined || value === "0000-00-00 00:00:00");
			}

		});

		datatypeInner("type", function(self){

			self.cast = function(value){
				if(dataTypes[value]) return true;
				return (typeof(value) === "function" && value.__outer) ? value : undefined;
			}

		});

		datatypeInner("class", function(self, parent){

			self.cast = function(value){
				return (typeof(value) === "function" && value.__outer) ? value : undefined;
			}

		});

		datatypeInner("function", function(self){

			self.cast = function(value){
				return (typeof(value) === "function") ? value : undefined;
			}

		});

		datatypeInner("object", function(self){

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

		libraries.js = {
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

	}; // END INIT / END FUNCTIONS


	// --- public functions --- //

	d.singleton = function(id, pid, func){builder(id, pid, func, true, false);}
	d.abstract = function(id, pid, func){builder(id, pid, func, false, true);}
	d.abstract.singleton = d.singleton.abstract = function(id, pid, func){builder(id, pid, func, true, true);}

	// other globals
	var globals = {
		falsy: falsy,
		is: is, 
		cast: cast, 
		castAbs: castAbs, 
		mustCast: mustCast,
		library: library, 
		config: config, 
		builder: builder, 
		className: className,
		version: function(){return version},
		outsideClass: outsideClass,
		datatype: datatype
		}
	for(var item in globals) d[item] = globals[item];


	// --- base class --- //


	var baseStruct = {
		id: "djs.base",
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
	structs[baseStruct.id] = baseStruct;
	classesbyid[baseStruct.id] = baseStruct.outer;
	classes.djs = libraries.djs = {}; // init classes and libraries
	classes.djs.base = baseStruct.outer;
	//outer.className = function(){return baseStruct.id;}

	// --- initiate --- //

	init();



})(declare); // END PLUGIN

	






// requirejs module

define(function(){

	return declare;

}); // END MODULE




