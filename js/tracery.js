// https://github.com/umdjs/umd/blob/master/templates/amdWeb.js


(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['b'], factory);
	} else {
		// Browser globals
		root.tracery = factory(root.b);
	}
}(typeof self !== 'undefined' ? self : this, function () {


	//========================================================


	function Node(template) {

		this.template = template
		this.finished = ""


		// Create subnodes, as much as we can without expanding
		switch(template.traceryType) {

			case "tag": 
			
				this.target = this.template.target.map(path => this.createNode(path))
				this.modifiers = this.template.modifiers.map(mod => this.createNode(mod))
				

				this.targetPath = ""
				this.modifiedValues = []
				break;
			case "rule": 
				// Create nodes for each section
				this.sections = this.template.sections.map((section) => {
					return this.createNode(section)
					
				})
				break;

			default: console.warn("Creating unknown node", template)
		}
	}
	Node.prototype.createNode = function(template) {
		if (typeof template === "string")
			return {
				constType: typeof template,
				finished: template,
				expand: () => {}
			}

		return new Node(template)
	}

	Node.prototype.expand = function(context) {
		if (context === undefined)
			console.warn("Expansion of ", this.template.traceryType, "requires context!")
		// Expand all subnodes in the required order
		switch(this.template.traceryType) {
			case "rule":  
				this.finishedChildren = this.sections.map(child => {
					child.expand(context)
					return child.finished
				})
				this.finished = this.finishedChildren.join("")
				break;
			case "tag": {
				this.target.forEach(path => path.expand())
				this.targetPath = this.target.map(s => s.finished)
				this.ruleset = context.getRuleset(this.targetPath)
				if (this.ruleset === undefined) {
					console.warn("Could not find ruleset for ", this.targetPath, "in", context.grammar)
					this.ruleNode = this.createNode(`((${this.targetPath.join("/")}))`)
				} else {
					this.rule = context.selectRule(this.ruleset)
					this.ruleNode = this.createNode(this.rule)
					this.ruleNode.expand(context)
				}
				this.finishedRule = this.ruleNode.finished
				this.modResults = []
				let s = this.finishedRule
				for (var i = 0; i < this.modifiers.length; i++) {
					let mod = this.modifiers[i]
					mod.expand()
					let fxn = context.getModifier(mod.finished)
					if (fxn === undefined)
						s = s + `.${mod.finished}`
					s = fxn(s)
					this.modResults[i] = {
						s: s,
						modPath: mod.finished,
						fxn: fxn
					}
				}
				this.finished = s
	
				break;
			}  
			default: console.warn("Expanding unknown node", this.template)
		}
		return this
	}

	//========================================================

	function Context({grammar, worldObject}) {
		if (grammar === undefined)
			console.warn("No grammar!")
		if (worldObject === undefined)
			console.warn("No worldObject!")
		this.grammar = grammar
		this.worldObject = worldObject
		this.modifiers = baseEngModifiers
	
	}
	Context.prototype.getModifier = function(path) {
		if (Array.isArray(path))
			console.warn("Path not implemented yet!")
		return this.modifiers[path]
	}

	Context.prototype.getRuleset = function(path) {
		if (path.length === 1) {
			let key = path[0]
			return this.grammar[key]
		} else {
			if (path[0] !== "") {
				console.warn("Relative path not yet implemented!", path)
			} else if (this.worldObject === undefined) {
				console.warn("worldObject not defined for path", path)
			} else {
				try {
					let val = this.worldObject.getAtPath(path.slice(1)) 
					return [parseTraceryRule(val)]
				
				} catch(err) {
					return undefined
				}
			}
		}
		
	}

	Context.prototype.selectRule = function(ruleset) {
		if (Array.isArray(ruleset)) {
			let index = Math.floor(Math.random()*ruleset.length)
			return ruleset[index]
		}
		console.warn("Non-array rulest", ruleset)
	}

	Context.prototype.flatten = function(rule) {
		return this.expand(rule).finished
	}

	Context.prototype.expand = function(rule) {
		if (typeof rule === "string")
			rule = parseTraceryRule(rule)

		// Still a string?
		if (typeof rule === "string") {
			return {
				constType: "string",
				finished: rule,
				expand: () => {}
			}
		}
		
		// Create a root node and expand out
		let root = new Node(rule)
		root.expand(this)

		return root
	}




//============================================
// Tracery regex

// Create a regex from a tracery rule
function traceryToRegex(rule, grammar) {


	let regRaw = traceryRuleToRegex(rule, grammar);
	return new RegExp(regRaw, "g");



}

function traceryRuleToRegex(rule, grammar) {
	let rawRule = rule.raw || rule;

	let sections = rawRule.split("#");

	let r = sections.map((s, index) => {
		if (index % 2 == 0) {

			// Allow any spaces or punctuation?
			// s = s.replace(" ", "\\s*");
			// s = s.replace("?", "\\?");
			// s = s.replace(".", "\\.");
			// s = s.replace("!", "\\!");
			s = s.replace("VAR", "(.*)");

			return s

		} else {

			return traceryTagToRegex(s, grammar);
		}
	}).join("");

	return r;

}

// Create a regular expression from a tracery symbol
function traceryTagToRegex(key, grammar) {
	let tagReg = grammar[key].map(r => {
		return traceryRuleToRegex(r, grammar);
	}).sort((a, b) => {
		return b.length - a.length
	}).join("|")
	return "(" + tagReg + ")";
}


	function calculateMatch(grammar, queryRule, sample) {
		let reg = traceryToRegex(queryRule, grammar);

		// Specificity: how rarely does this match the sample?
		let match = reg.exec(sample);
		
		if (match === null)
			return undefined
	
		return match
	}


	return {
		calculateMatch: calculateMatch,
		createContext(settings) {
			return new Context(settings)
		},
		flatten(grammar, s) {

		},
		expand({originRule,grammar,context}) {

			if (context === undefined)
				if (grammar === undefined)
					console.warn("No grammar or context provided!")
				context = new Context({grammar:grammar})
			return context.expand(originRule)
		},
	};
}));


/**
 * @author Kate
 */

function isVowel(c) {
	var c2 = c.toLowerCase();
	return (c2 === 'a') || (c2 === 'e') || (c2 === 'i') || (c2 === 'o') || (c2 === 'u');
};

function isAlphaNum(c) {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
};
function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

var baseEngModifiers = {

	replace : function(s, params) {
		//http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
		return s.replace(new RegExp(escapeRegExp(params[0]), 'g'), params[1]);
	},

	capitalizeAll : function(s) {
		var s2 = "";
		var capNext = true;
		for (var i = 0; i < s.length; i++) {

			if (!isAlphaNum(s.charAt(i))) {
				capNext = true;
				s2 += s.charAt(i);
			} else {
				if (!capNext) {
					s2 += s.charAt(i);
				} else {
					s2 += s.charAt(i).toUpperCase();
					capNext = false;
				}

			}
		}
		return s2;
	},

	capitalize : function(s) {
		return s.charAt(0).toUpperCase() + s.substring(1);
	},

	a : function(s) {
		if (s.length > 0) {
			if (s.charAt(0).toLowerCase() === 'u') {
				if (s.length > 2) {
					if (s.charAt(2).toLowerCase() === 'i')
						return "a " + s;
				}
			}

			if (isVowel(s.charAt(0))) {
				return "an " + s;
			}
		}

		return "a " + s;

	},

	firstS : function(s) {
		console.log(s);
		var s2 = s.split(" ");

		var finished = baseEngModifiers.s(s2[0]) + " " + s2.slice(1).join(" ");
		console.log(finished);
		return finished;
	},

	s : function(s) {
		switch (s.charAt(s.length -1)) {
		case 's':
			return s + "es";
			break;
		case 'h':
			return s + "es";
			break;
		case 'x':
			return s + "es";
			break;
		case 'y':
			if (!isVowel(s.charAt(s.length - 2)))
				return s.substring(0, s.length - 1) + "ies";
			else
				return s + "s";
			break;
		default:
			return s + "s";
		}
	},
	ed : function(s) {
		switch (s.charAt(s.length -1)) {
		case 's':
			return s + "ed";
			break;
		case 'e':
			return s + "d";
			break;
		case 'h':
			return s + "ed";
			break;
		case 'x':
			return s + "ed";
			break;
		case 'y':
			if (!isVowel(s.charAt(s.length - 2)))
				return s.substring(0, s.length - 1) + "ied";
			else
				return s + "d";
			break;
		default:
			return s + "ed";
		}
	}
};

