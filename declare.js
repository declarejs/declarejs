



var builtins = [Array];
for(var i=0; i<builtins.length; i++){
	builtins[i] = function(){
		var obj = builtins[i].oldconstructor.apply(this, arguments);
		obj.__PUBLIC = obj;
		return obj;
	}
}




define(function(){

	// --- settings --- //
	
	
	var debug = true,
	structs = [], 				// class structures
	configs = {debug: true},
	token = {}, 				// used to pass arguments back to the constructor
	errors = [],
	//instError = 'How to instanciate self: new c.self()';
	
	
	
	// --- classes --- //
	
	baseClass = function(){},
	
	outerAttr = function(name){
		if(arguments.length === 1) return this[name] === undefined ? undefined : this[name]();
		for(var i=0; i<arguments.length; i+=2){
			if(this[arguments[i]] !== undefined) this[arguments[i]](arguments[i+1]);
			}
		return this;
	},
	
	innerAttr = function(name){
		if(arguments.length === 1) return (typeof(this[name]) === 'function') ? this[name]() : this[name];
		for(var i=0; i<arguments.length; i+=2){
			if(typeof(this[arguments[i]]) === 'function') this[arguments[i]](arguments[i+1]);
			else this[arguments[i]] = arguments[i+1];
			}
		return this;
	},
	
	structClass = function(name, abstract, singleton, parent){
		
		// append structs
		structs.push(this);
		
		// members
		this.id = structs.length - 1;
		this.name = name,
		this.abstract = abstract;
		this.singleton = singleton;
		this.parent = parent;
		this.publics = {}; 	// see main()
		this.protectNames = {};	// see main()
		this.types = {};
		
		// very first class
		if(parent === false){
			this.topClass = baseClass;
			this.topClass.__name = name;
			this.innerClass = function(){};
			this.innerClass.prototype = new baseClass;
			this.innerClass.__name = name;
			this.outerClass = function(){};
			this.outerClass.prototype = new baseClass;
			return;
		}
		
		// top class
		this.topClass = function(){}; // error(instError);
		this.topClass.__name = name;
		this.topClass.prototype = parent ? new parent.topClass : new baseClass;
		
		// outer class - see main()
		this.outerClass = false;
		
		// inner class
		var struct = this;
		this.innerClass = function(Obj){
			//if(!(Obj instanceof Object)) error('======= WHY');
			this.__public = Obj;
			for(var item in struct.types) this[item] = new struct.types[item];
		};
		
		// extend inner class
		this.innerClass.prototype = new this.topClass;
		this.innerClass.prototype.__name = name;
		this.innerClass.prototype.attr = innerAttr;
		for(var item in parent.innerClass.prototype) this.innerClass.prototype[item] = parent.innerClass.prototype[item];
		
		// copy public names
		for(var item in parent.publics) this.publics[item] = parent.publics[item];
		
		// copy public names
		for(var item in parent.protectNames) this.protectNames[item] = true;
		
		// copy public names
		for(var item in parent.types) this.types[item] = parent.types[item];
	},
	


	// --- functions --- //
	
	
	error = function(str, name, thrown){
		throw new Error(str + ' IN: ' + name); // --- TEMP
		errors.push(arguments);
		report();
	},
	
	addError = function(str, name, thrown){
		errors.push(arguments);
	},
	
	report = function(){
		if(!errors.length) return;
		var errorstr = '';
		var warningstr = '';
		for(var i=0; i<errors.length; i++){
			var error = errors[i];
			if(error[2] === false) warningstr + error[0] + "\n";
			else errorstr + error[0] + "\n";	
		}
		if(warningstr.length) show(warningstr);
		if(errorstr.length) throw new Error(error);
	},
	
	config = function(name){
		if(typeof(name) === 'object'){
			for(var item in name) config(item, name[item]);
			return;
		}
		if(arguments.length<2) return configs[name];
		//@ show('----: '+ typeof(configs));
		configs[name] = arguments[1];
	},
	
	checkObject = function(){
		
	},
	/*
	checkValues = function(){
		// --- WIP
	},
	*/
	show = function(str){
		if(configs.debug) console.log(str);
	},
	
	type = function(mixed){
		if(mixed instanceof baseClass) return mixed.__class;
		return typeof(mixed);
	},
	
	mustbe = function(mixed, type, classname){
		if(!(mixed instanceof type)) error('Must be ' + classname);
	},
	
	cast = function(mixed, type){
	
		if(mixed instanceof baseClass){
			if(type instanceof Function){
				if(mixed instanceof type) return mixed;
				return mixed['__object'] ? mixed.__object(type) : undefined;
				}
			if(mixed['__' + type]) return mixed['__' + type]();
			switch(type){
				case 'number': case 'double': return 0;
				case 'string': return '';
				case 'boolean': return false;
				// --- WIP
			}
		}
		
		
		// --- WIP
	},
	
	same = function(mixed1, mixed2, strict){
		if(mixed1 === mixed2) return true;
		if(mixed1 instanceof baseClass) return (mixed2 instanceof baseClass) ? (mixed1['__public'] === mixed2['__public']) : false;
		return strict ? false : (mixed1 == mixed2);
	},
	
	data = function(type, value){
		
		// --- WIP
		
		return value;
	},
	
	method = function(returns, params, func, required){
		if(typeof(returns) === 'function') return returns; // first param is function
		func.__method = [returns, params, required];
		return func;
	},
	
	/*
	protectProxy = function(item, method){ // this = inner
		return function(){
			return method.apply(this, arguments);
		}
	},
	*/
	
	publicProxy = function(item, method, inner){
		
		// special exception for 'on' and 'each' methods. Check for any event handler method
		if(item === 'on' || item === 'each'){
			return function(){
				for(var i=0; i<arguments.length; i++){
					if(arguments[i] instanceof Object){ // functions are objects
						for(var item in arguments[i]) error('Not allowed to pass members through functions');
						}
					}
				var r = method.apply(inner, arguments);
				return (r instanceof Object) ? r['__public'] : r;
			}
		}
		
		// non-event handler method
		return function(){
			for(var i=0; i<arguments.length; i++){
				if(arguments[i] instanceof Object){
					//show('SWITCH OUT: ' + typeof(arguments[i]['__public']) + ' IN: ' + item);
					arguments[i] = arguments[i]['__public'];
					}
				}
			var r = method.apply(inner, arguments);
			return (r === inner) ? this : r;
			//return (r instanceof Object) ? r['__public'] : r;
		}
		
	},
	
	callParent = function(obj, method, args){
		var struct = structs[obj.__classid];
		if(!struct.parent.innerClass.prototype[method]) error('No method: ' + method);
		return struct.parent.innerClass.prototype[method].apply(obj, args); // --- WIP
	},

	main = function(name, pClass, func, abstract, singleton){
		
		
		//show('--- 111: ' + name + ', ' + typeof(pClass) + ', ' + typeof(func));
		
		//return function(){};
		
		// arguments
		if(typeof(name) !== 'string'){func = pClass; pClass = name; name =  false;} // no name?
		if(func === undefined){func = pClass; pClass = false;} // no parent class?
		
		//show('--- 222: ' + name + ', ' + typeof(pClass) + ', ' + typeof(func));
		
		// parent structure
		var parent = (pClass && !isNaN(pClass['__classid'])) ? structs[pClass.__classid] : structs[0];
		
		
		// structure
		var s = new structClass(name, abstract, singleton, parent);
		
		//show('NAME: ' + s.name + ', PARENT: ' + parent.name); //  + ', ' + func
		
		// top class
		var c = s.topClass;
		c.static = {};
		c.public = {};
		c.protected = {};
		c.self = s.outerClass; // for create the defined class
		c.id = s.name;
		c.error = function(str){error(str, c.id);}
		
		// the callback
		func(c);
		
		// call parent
		c.parent = function(obj, method, args){
			return (parent.innerClass.prototype[method] === undefined) ? error('No method: ' + method) : parent.innerClass.prototype[method].apply(obj, args);
		}
		
		// protected members
		var members = c.protected;
		for(var item in members){
			if(s.parent.publics[item] !== undefined) error('Must be public: ' + item);
			if(c.public[item] !== undefined) error('Dual declaration: ' + item);
			if(typeof(members[item]) === 'object'){
				s.types[item] = (members[item] instanceof Array) ? Array : Object;
			} else {
				s.innerClass.prototype[item] = members[item];
			}
			s.protectNames[item] = true;
		}
		
		
		// public methods
		var publics = {};
		for(var item in c.public){
			//if(s.parent.innerClass.prototype[item] !== undefined) error('This member must remain protected: ' + item);
			if(s.parent.protectNames[item] !== undefined) error('Must be protected: ' + item);
			if(members[item] !== undefined) error('Dual declaration: ' + item);
			if(typeof(c.public[item]) !== 'function') error('Non-functions must be protected: ' + item);
			s.innerClass.prototype[item] = c.public[item];
			publics[item] = s.publics[item] = c.public[item];
		}
		
		// parent public methods
		for(var item in s.parent.publics){
			if(publics[item] === undefined) publics[item] = s.publics[item] = s.parent.publics[item];
		}
		
		// constructor
		if(!publics['__construct']) publics.__construct = function(){};
		
		// create outer class
		if(abstract) s.outerClass = function(){error(ERROR_ABSTRACT);}; // abstract
		else if(singleton){

			// singleton
			s.outerClass = function(mixed){
				this.__public = this; // see public proxy function
				
				var args = arguments;
				
				// used "new" to create?
				if(this instanceof s.outerClass){
					// if created from within this function, pass on params to constructor
					if(mixed === token) args = arguments[1];
					}
				else{
					
					// if singleton already exists, return it
					if(struct.singleton !== true){
						if(struct.singleton['call']) struct.singleton.call.apply(struct.singleton, args);
						return struct.singleton; 
					}
					
					// no singleton exists so creaate one
					return new s.outerClass(token, arguments);
				}

				
				// set singleton first
				struct.singleton = this;
				
				// inner object already exists?
				if(struct.innerobj){
					for(var item in publics) this[item] = publicProxy(item, publics[item], struct.innerobj);
					}
				else {
					struct.innerobj = new s.innerClass(this);
					for(var item in publics) this[item] = publicProxy(item, publics[item], struct.innerobj);
					this.construct.apply(this, args);
					}
				
				// call call?
				if(this['__call']) this.__call.apply(this, args);
					
				// check object
				if(configs.debug) checkObject(this);
			}

		} else {
			
			
			// non-singleton
			s.outerClass = function(){
				
				this.__public = this; // see public proxy function
				
				// the inner class
				var inner = new s.innerClass(this);
				for(var item in publics) this[item] = publicProxy(item, publics[item], inner);
				this.__construct.apply(this, arguments);
				
				// check object
				if(configs.debug) checkObject(this);
			}
			
		}
		
		
		// inheritance
		s.outerClass.prototype = new s.topClass;
		s.outerClass.prototype.__class = s.topClass; // see type()
		s.outerClass.prototype.attr = outerAttr;
		s.outerClass.__classid = s.id;
		
		
		// return outer class
		return s.outerClass;
	},
	
	END = 0; // END functions
	
	
	// --- globals --- //
	
	var declare = function(name, pClass, func){return main(name, pClass, func, false, false);}
	declare.abstract = function(name, pClass, func){return main(name, pClass, func, true, false);}
	declare.singleton = function(name, pClass, func){return main(name, pClass, func, false, true);}
	declare.abstract.singleton = declare.singleton.abstract = function(name, pClass, func){return main(name, pClass, func, true, true);}
	
	declare.show = show;
	declare.same = same;
	declare.type = type;
	declare.cast = cast;
	declare.mustbe = mustbe;
	declare.baseClass = baseClass;
	//declare.checkValues = checkValues;	// TEMP
	
	
	
	// --- init --- //
	
	new structClass('baseClass', true, false, false);
	
	
	// --- global classes/overrides --- //
	
	String.prototype.list = function(seperator){
		var obj = new cList();
		var arr = this.split(seperator);
		if(arr.length) obj.append.apply(obj, arr);
		return obj;
	}
	
	Array.prototype.list = function(){
		var obj = new cList();
		if(this.length) obj.append.apply(obj, this);
		return obj;
	}
	
	window.cList = declare('cList', function(c){
		
		c.protected.items = [];
		
		c.public.__construct = function(){
			for(var i=0; i<arguments.length; i++) this.append(arguments[i]);
		}
		
		c.public.count = function(){return this.length;}
		c.public.pop = function(){return this.pop();}
		c.public.join = function(separator){return this.join(separator);}
		
		c.public.split = function(str){
			var obj = new c.self();
			this.items.split(str)
			return obj.append.apply(obj, this.items.split(str));
		}
		
		c.public.prepend = function(mixed){
			this.items.unshift.apply(this, arguments);
			return this;
		}
		c.public.append = function(mixed){
			this.items.push.apply(this, arguments);
			return this;
		}
		
		c.public.get = function(key){
			return this.items[key];
		}
		
		c.public.values = function(key, mixed){
			if(key < this.length && key >= 0) this.items[key] = mixed;
			return this;
		}
		
		c.public.set = function(key, mixed){
			if(key < this.length && key >= 0) this.items[key] = mixed;
			return this;
		}
		
		
		// END OF CLASS
	});
	
	
	// --- map --- //
	
	
	window.cMap = declare('cMap', function(c){
		
		c.protected.items = {};
		
		c.public.__construct = function(){
			for(var i=0; i<arguments.length; i+=2) this.set(arguments[i], arguments[i+1]);
		}
		
		c.public.count = function(){
			var c = 0;	
			for(var item in this.items) c++;
			return c;
		}
		
		c.public.get = function(key){
			return this.items[key];
		}
		
		c.public.set = function(key, mixed){
			for(var i=0; i<arguments.length; i+=2) this.items[arguments[i]] = arguments[i+1];
			return this;
		}
		
		
		// END OF CLASS
	});
	
	
	return declare; // return globals


});




