// Parsing utilities for different stuff

function isInQuotes(s) {
	return (s[0]==s[s.length - 1] && (s[0] === '"' || s[0] === '`' || s[0] === "'"))
}

function isInParentheses(s) {

	return s[0] === '(' && s[s.length - 1] === ")"
}

let closeChars = {
	"<": ">",
	"{": "}",
	"(": ")",
	"[": "]",
	"#": "#",
	"'": "'",
	"`": "`",
	'"': '"',
}

// Parse some string 
function parse({s, startContext, contextMap, onStart, onEnd, onEscape, onChar, onOpen, onClose}) {

	let root = {
		contextID: startContext,
		start: 0,
		end: s.length,
		children: [],
		depth: 0,
		s: s
	}	



	let context = root
	if (onStart)
		onStart(context)

	let isEscaped = false

	for (var i = 0; i < s.length; i++) {
		// 
		if (isEscaped) {
			isEscaped = false
			if (onEscape)
				onEscape
		}
		let c = s[i]

		if (c === "\\")
			isEscaped = true
		else {

			// Should we close the current section?
			if (context.closeChar === c) {
				context.end = i
				context.s = s.substring(context.start, context.end + 1)
				
				if (onClose)
					onClose(context, i, c)

				context = context.parent
			} 

			// Is this an open character in this context?
			
			else if (contextMap[context.contextID] && contextMap[context.contextID][c]) {
				
				
				let contextID = contextMap[context.contextID][c]
				let newContext = {
					depth: context.depth + 1,
					start: i,
					children: [],
					parent: context,
					contextID: contextID,
					openChar: c,
					closeChar: closeChars[c]
				}


				if (onOpen) {
					onOpen(newContext, i, c)
				}
				context = newContext
			} else {
				// Regular character
				if (onChar)
					onChar(context, i, c)
			}
		}
	}
	if (onEnd)
		onEnd(context)
}

// Split on some number of splitters
function splitIntoProtectedSections({s, startContext, contextMap}) {
	let sections = []
	let last = 0
	parse({
		s: s,
		startContext: startContext, 
		contextMap: contextMap, 
		onOpen: function(context, i, c) {

			if (context.depth === 1) {
				sections.push({
					text: s.substring(last, i)
				})

			}
		},
		onClose: function(context, i, c) {
			if (context.depth === 1) {
				sections.push({
					openChar: context.openChar,
					inner: s.substring(context.start + 1, context.end).trim()
				})
				last = context.end + 1
			}
		}
	})
	sections.push({
		text: s.substring(last)
	})
	sections = sections.filter(s => s.openChar !== undefined || s.text.length > 0)
	return sections
}


// Split on some number of splitters
function splitProtected({s, startContext, contextMap, splitters, saveSplitters}) {
	if (s === undefined)
		console.warn("Can't split undefined string ", s)
	let sections = []
	let last = 0
	parse({
		s: s,
		startContext: startContext, 
		contextMap: contextMap, 



		onChar: (context, index, char) => {

			if (context.depth === 0 && index >= last) {
				// Is this a splitter? Check all splitters 
				let found = undefined
				for (var i = 0; i < splitters.length; i++) {
					if (s.startsWith(splitters[i], index)) {
						// Choose the longest one at the location
						if (!found || found.length < splitters[i].length)
							found = splitters[i]
					}
				}

				if (found) {
					sections.push(s.substring(last, index))
					if (saveSplitters)
						sections.push(found)
					last = index + found.length 
				}
			}
		}
	})
	sections.push(s.substring(last))

	return sections
}


let expressionPriority = [[","],[":"],["=", "+=", "-=", "/=", "*=", "%=", "^=", "++", "--"], ["&&", "||", "!=", "==", "<=", ">=", "<", ">"], ["+", "-"], ["*", "/"], ["^", "%"], ["!"]]
let allExpressionSplitters = [].concat.apply([], expressionPriority)
let splitterMap = {}

for (var i = 0; i < expressionPriority.length; i++) {
	for (var j = 0; j < expressionPriority[i].length; j++) {
		let splitter = expressionPriority[i][j]
		splitterMap[splitter] = i
	}
}
function parseExpression({s, startContext, contextMap, parseLeaves}) {
	
	sections = splitProtected({
		s: s,
		contextMap: contextMap,
		startContext: startContext || "expression",
		splitters: allExpressionSplitters,
		saveSplitters: true
	})

	tokens = sections.map(s => s.trim())


	tokens = tokens.map((s,index) => {
		// deal with unary operators


		if (splitterMap[s] !== undefined) {
			if (index === 0 || tokens[index - 1] === "") {
				console.log("UNARY", s)
				if (!(s === "!" || s === "-"))
					console.warn("Unknown unary operator", s)
				return op = {
					op: s,
					unary: true,
					priority: 999,
					index: index
				}
				
			}

			return {
				op: s,
				priority: splitterMap[s],
				index: index
			}
		}
	
		return s
	})

	
	// Build the tree

	function buildTree(tokens, start, end) {
		// Get the highest priority 
		let topToken = undefined
		for (let i = start; i < end; i++) {
		
			let token = tokens[i]
			
			if (token.priority !== undefined && (!topToken || (token.priority < topToken.priority))) {
				topToken = token
			}
		}

		if (topToken) {
			return {
				lhs: buildTree(tokens, start, topToken.index),
				op: topToken.op,
				rhs: buildTree(tokens, topToken.index + 1, end)
			}
		}
		else {
			// No token, we're in a leaf!
			let sub = tokens.slice(start, end)
			
			if (sub.length !== 1)
				console.warn(sub)

			if (parseLeaves) {
				let parsed = parseLeaves(sub[0])
				return parsed
			}
			return sub[0]
		}
	}

	return buildTree(tokens, 0, tokens.length)
}



function diagramJSON(json) {

	let root = {
		depth: 0,
		id: 0,
		path: []
	}

	let current = root
	let lastIndex = 0
	let lastKey = undefined
	let keys = []

	let nodeCount = 1

	function createChild(index) {
		let spacer = utilities.getTabSpacer(current.depth)
		let child = {
			parent: current,
			depth: current.depth + 1,
			start: index,
			path: current.path.slice(),
			id: nodeCount++
		}

		if (current.type === "array") {
			child.index = current.children.length
			child.path = child.path.concat([child.index])
		}
		
		current.children.push(child)
		current = child
	}

	function closeChild(index) {
		let spacer = utilities.getTabSpacer(current.depth)
		
		current.end = index
		if (current.type === undefined) {
			current.type = "text"

			current.value = json.substring(lastIndex, index).trim()
		} 
		
		current = current.parent
		
	}


	parse({
		s: json,
		startContext: "json",
		contextMap: {
			json: {
				'"': "string",
			},

		},



		onChar: (context, index, char) => {
		
			if (context.depth === 0) {
				let spacer = utilities.getTabSpacer(current.depth)

				// In JSON syntax
				switch(char) {
					case "{": 
						if (current.type)
							console.warn(current.type)
						current.type = "obj",
						


						lastIndex = index + 1

						// Create a new current inside
						current.children = []
						
						createChild(index)

						break
					case "}": 
						
						// Close out the last child
						closeChild(index)
						
						lastIndex = index + 1
						break
					case "[": 
						
						current.type = "array"
					

						lastIndex = index + 1
						current.children = []
						
						createChild(index)
						
						break
					case "]": 
						closeChild(index)
						lastIndex = index + 1
						break

					case ",": 


						
						closeChild(index)

						lastIndex = index + 1
						createChild(index)
						
						break;
					case ":": 
						// Everything before this is the key?
						let key = json.substring(lastIndex, index).trim()
						if (key[0] !=='"' || key[key.length - 1] !== '"') {
							console.warn("Missing quotations around key", key)
						}
						key = key.substring(1, key.length - 1)


						current.key = key
						current.path = current.parent.path.concat([key])

						lastKey = key
						keys.push({
							path: current.path,
							depth: current.depth,
							key: key,
							index: lastIndex
							// path: keyStack.slice()
						})
						lastIndex = index + 1
						break
				}
			}
		},
		onOpen: (context, index, char) => {
			// console.log(`${utilities.getTabSpacer(context.depth)}Open context ${char}:{context.contextID}`)
		},
		onClose: (context, index, char) => {
			// console.log(`${utilities.getTabSpacer(context.depth)}Close context ${char}:'${context.s}'`)
		},
		onStart: (context) => {

		},
		onEnd: (context) => {

		}
	})

	return {
		keys: keys,
		root: root
	}
	
}



