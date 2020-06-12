function parseChancery(raw) {
	
	let parsed = {
		isParsed: true,
		errors:[],
		raw: raw
	}

	if (raw.states === undefined) {
		parsed.errors.push("No 'states' field in your chancery map")
		parsed.states = {}
	} else {
		parsed.states = mapObject(raw.states, parseChanceryState)
	}

	if (raw.grammar === undefined) {
		parsed.errors.push("No 'grammar' field in your chancery map")
		parsed.grammar = {}
	} else {
		parsed.grammar = parseTracery(raw.grammar)
	}

	if (raw.initialBlackboard === undefined) {
		parsed.errors.push("No 'initialBlackboard' field in your chancery map")
		parsed.initialBlackboard = {}
	} else {
		parsed.initialBlackboard = raw.initialBlackboard
	}


	// console.log(parsed)
	// console.log(JSON.stringify(parsed.states, null, 2))
	return parsed
}


function parseChanceryState(raw, stateID) {
	let state = {
		id: stateID,
		raw: raw,
		onEnter: [],
		onExit: [],
		onTick: [],
		onEnterSay: [],
		onExitSay: [],
		onTickSay: [],
		onEnterPlay: [],
		onExitPlay: [],
		onTickPlay: []
	}

	let modes = ["onEnter", "onExit", "onTick"]
	

	function addActions(key,actions) {
		// console.log("add actions", key, actions)
		if (Array.isArray(actions))
			state[key] = state[key].concat(actions)
		else 
			state[key].push(actions)
	}

	mapObject(raw, (val, key) => {

		
		// Is this one of the known array properties?
		if (modes.includes(key)) {
			
			if (typeof val === "string")
				val = [val]

			// Parse the actions for this
			if (Array.isArray(val)) {
				val.forEach(item => {
					let actions = parseChanceryConActMulti(item)
					addActions(key, actions)
				})
			}
			else
				throw(`Weird non-string value for '${key}' in state ${stateID}:`, val)
			return
		} 

		val = (typeof val === "string")?[val]:val
			
		// Speech/text syntactic sugar
		if (key.substring(key.length - 3) === "Say") {
			let mode = key.substring(0, key.length - 3)
			addActions(key, val.map(s => parseChancerySay(s)))
		} 

		// Music/sound syntactic sugar
		else if (key.substring(key.length - 4) === "Play") {
			let mode = key.substring(0, key.length - 4)

			// Fluff into regular syntax
			addActions(key, val.map(s => {
				let exp = `"${s}"`
		
				return {
					subtype: "command",
					command: "play",
					raw: `play:` + exp,
					expression: parseChanceryExpression(exp)
				}
			}))
		} 

		// Exits
		else if (key === "exits") {
			
			state.exits = val.map(exitRaw => parseChanceryExit(exitRaw))
		}  

		// chips
		else if (key === "chips") {
			
			state.chips = val.map(chipRaw => parseChanceryChip(chipRaw))
		} 

		// ???
		else {
			console.warn("Unknown key", key)
		}
	})

	

	return state
}

let chanceryMap = {
		exit: {
			'"': "rule",
			'\'': "rule",
			"{": "exit",
			"(": "exit",
			"[": "exit"
		}, 
		rule: {}	
	}


// Chips can be simple, a string, 
//  or complex, e.g. an object with 
//   - output pattern
//   - 
function parseChanceryChip(raw) {
	
	let chip =  {
		chanceryType: "chip",
		raw: raw,
	}

	if (typeof raw === "string")
		chip.pattern = raw

	return chip

}


// Split 
function parseChanceryExit(raw) {
	
	let exit =  {
		chanceryType: "exit",
		raw: raw,
		conditions: [],
		target: undefined,
		actions: []
	}


	let sections = splitProtected({
			s:raw, 
			startContext:"exit", 
			contextMap:chanceryMap, 
			saveSplitters: true,
			splitters:["->", " "]}).map(s => s.trim())
	
	let mode = 0
	for (var i = 0; i < sections.length; i++) {
		let section = sections[i]
		if (section === "->") {
			if (mode === 0)
				mode = 1
			else 
				console.warn("multiple arrows!")
		} else if (section !== "") {

			if (mode === 0)
				exit.conditions.push(parseChanceryConAct(section, true))
			else if (mode === 1) {

				exit.target = section
				mode = 2
			} else if (mode === 2) {
				exit.actions.push(parseChanceryConAct(section))
			} else {
				console.warn("Unknown mode ", raw)
			}
		}
	}

	
	return exit
}

function parseChanceryConActMulti(s) {
	let sections = splitProtected({
			s:s, 
			startContext:"exit", 
			contextMap:chanceryMap, 
			splitters:[" "]}).map(s => s.trim())

	return sections.map(section => parseChanceryConAct(section))

}


function parseChanceryExpression(s) {
	return  parseExpression({s:s, contextMap:chanceryMap,startContext:"exit", parseLeaves: (leaf) => {
		leaf = leaf.trim()
		if (isInParentheses(leaf)) {
			
			leaf = leaf.substring(1, leaf.length - 1)
			let leafNode = parseChanceryExpression(leaf)
			return leafNode
		}

		if (isInQuotes(leaf)) {
			return {
				constType: "string",
				value: leaf.substring(1, leaf.length - 1)
			}
		}

		if (!isNaN(leaf)) {
			return {
				constType: "number",
				value: parseFloat(leaf)
			}
		}



		let pathNode = {
			chanceryType: "path",
			raw: leaf
		}
		// Must be a path
		let path = splitProtected({
			s:leaf, 
			startContext:"exit", 
			contextMap:chanceryMap, 
			splitters:["."]}).map(s => s.trim()).map(key => parseChanceryKey(key))
		let last = path[path.length - 1]

		if (last.isFunction) {
			pathNode.isFunction = true
			pathNode.parameters = last.parameters
			last.parameters = undefined
			last.isFunction = false
		}

		pathNode.path = path
		return pathNode

		

		console.warn("unidentified leaf", leaf)

		return leaf
	}})
}

function parseChanceryKey(s) {
	// A function? A dynamic key?
	if (!isNaN(s))
		return {
			chanceryType: "number",
			value: parseFloat(s)
		}

	let node = {
		chanceryType: "key",
	}

	// Split into protected sections
	let sections = splitIntoProtectedSections({s,contextMap: chanceryMap, startContext: "exit"})
	
	// Deal with parameters
	if (sections[sections.length - 1].openChar === "(") {
		// Split apart parameters and reparse them as expressions
		let parametersRaw = sections.pop().inner
		let parameters = splitProtected({
			s: parametersRaw,
			contextMap: chanceryMap, 
			startContext: "exit", 
			splitters: [","]
		}).map(parseChanceryExpression)
		
		node.isFunction = true
		node.parameters = parameters
	}

	if (sections.length === 1 && sections[0].text !== "") {
		node.value = sections[0].text
	} else {
		node.isDynamic = true
		node.value = sections
	}

	return node
	
}


// Evaluate to same as 
function parseChancerySay(s, isCondition) {
	return {
		isCondition: isCondition,
		subtype: "say",
		output: s,
		raw: s,
	}
}


function parseChanceryTarget(s) {
	return {
		chanceryType: "target",
		subtype: "unknown",
		raw: s,
	}
}

function parseChanceryConAct(s, isCondition) {

	if (isInQuotes(s)) {
		return parseChancerySay(s.substring(1, s.length - 1), isCondition)
	}

	if (isInParentheses(s)) {
		let sections = splitProtected({
			s:s, 
			startContext:"exit", 
			contextMap:chanceryMap, 
			saveSplitters: true,
			splitters:[" or ", " and "]}).map(s => s.trim())
		
		if (sections.lenth > 2) {
			console.log(sections)			
		}
	}

	let actcon = {
		subtype: "unknown",
		raw: s,
		isCondition: isCondition
	}

	// Must be an expression!
	let tree = parseChanceryExpression(s)

	if (tree.op === ":") {
		actcon.subtype = "command"
		actcon.command = tree.lhs
		// Is this a normal, non-weird path? Like..."wait"
		actcon.expression = tree.rhs
		return actcon
	} else {
		actcon.subtype = "expression"
		actcon.expression = tree
		return actcon
	} 



	
	
}


