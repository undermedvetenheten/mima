// Create a chancery instance from a parsed map

function Chancery({map, metadata, handlers, transitionSpeed=0}) {
	// Is this map parsed?
	if (!map.isParsed) {
		map = parseChancery(map)
	}

	this.functions = {
		getRandom: (a) => {
			if (!Array.isArray(a)) 
				a = arguments
			if (a.length === 0)
				return undefined
			return a[Math.floor(Math.random()*a.length)]
		},
		randomInt: (a, b) => {
			if (b !== undefined)
				return Math.floor(Math.random()*(b-a) + a)
			if (a === undefined) {
				console.warn("No parameters passed to randomInt")
				return 0
			}

			return Math.floor(Math.random()*a)
		},
		random: (a, b) => {
			if (b !== undefined)
				return (Math.random()*(b-a) + a)
			if (a === undefined) {
				console.warn("No paramaters passed to randomInt")
				return 0
			}

			return (Math.random()*a)
		},		
	}



	this.map = map
	this.metadata = metadata
	
	this.handlers = {
		onOutput: [],
		onChips: [],
		onEnterState: [],
		onExitState: [],
		onActivateExit: []
	}

	for (var key in handlers) {
		this.handlers[key].push(handlers[key])
	}

	this.id = utilities.words.getRandomSeed(6)
	this.errorLog = []

	console.log(`Created Chancery \n\tstates: [${Object.keys(map.states)}]\n\tgrammar: [${Object.keys(map.grammar)}]`)
	this.stateID = undefined
	this.exitMap = []

	// Keep the currently active input
	// We can only match inputs that were sent since the last exit happened
	// (ie, don't re-match on old stuff)
	this.activeInput = []
	
	// Tracking actions
	this.actionQueue = []
	this.completedActions = []

	this.fxns = {
		doThing: (s) => {
			this.output(getRandom(utilities.words.objAdj) + " " + s)
		}
	}

	this.timeEnteredState = Date.now()*.001
	this.timeInState = 0
	this.currentTime = 0
	this.currentAction = undefined
	this.tuning = {
		transitionTime: {
			state: transitionSpeed,
			exit: transitionSpeed,
			expression: transitionSpeed
		}
	}

	this.blackboard = new Blackboard(map.initialBlackboard)
	this.context = tracery.createContext({
		grammar: this.map.grammar,
		worldObject: this.blackboard,
	})
	

}

Chancery.prototype.start = function() {

	this.tick()
	this.enterState("origin")
}

Chancery.prototype.error = function(error) {
	this.errorLog.push(error)
}

Chancery.prototype.toString = function() {
	return `${this.metadata.title} (${this.id})`
}


Chancery.prototype.setAtPath = function(path, val) {
	return this.blackboard.setAtPath(path, val)
}

Chancery.prototype.getAtPath = function(path) {
	
	return this.blackboard.getAtPath(path)
	
}


Chancery.prototype.input = function(msg) {
	let text = msg.text.join("\n")
	
	this.activeInput.push(text)
	console.warn(`${this}: msg received '${text}'`)

	this.updateExitMap()	
}


Chancery.prototype.evaluateExpression = function(expression) {
	if (expression === undefined)
		return undefined

	if (expression.constType) {
		if (expression.constType === "string")
			return this.context.flatten(expression.value)
		return expression.value
	}
	
	if (expression.chanceryType === "key")
		return expression.value

	if (expression.chanceryType === "path") {
		let finishedPath = expression.path.map(segment => this.evaluateExpression(segment))
		
		if (expression.isFunction) {
			if (finishedPath.length > 1)
				console.warn("Deep function paths not yet implemented")
			let fxnName = finishedPath[0]
			let fxn = this.functions[fxnName] || Math[fxnName]
			let parameters = expression.parameters.map(p => this.evaluateExpression(p))
			
			if (!fxn) {
				console.warn(`No function named '${finishedPath}' is avaiable on this bot (or in Math)`)
			} else {
				return fxn.apply(this, parameters)
			}
		}
		else {
			try {
				return this.getAtPath(finishedPath)
			} catch(err) {
				console.log(expression)
				console.warn(`No value at path '${expression.raw}'`, expression.raw)
				console.warn(err)
				return undefined
			}
		
		}
	}

	if (expression.op !== undefined) {
		let lhs = this.evaluateExpression(expression.lhs)
		let rhs = this.evaluateExpression(expression.rhs)
		// if (lhs === undefined) {
		// 	console.log("LEFT UNARY", expression)
		// }

		// if (rhs === undefined) {
		// 	console.log("RIGHT UNARY", expression)
		// }

		switch(expression.op) {
			case "*":
				return lhs*rhs
			case "/":
				return lhs/rhs
			case "+":
				return lhs+rhs
			case "-":
				return lhs-rhs
			case "%":
				return lhs%rhs
			case "^":
				return lhs^rhs
			case "<=":
				return lhs<=rhs
			case ">=":
				return lhs>=rhs
			case "<":
				return lhs<rhs
			case "==":
				return lhs==hs
			case "!=":
				return lhs!=rhs


			default: console.warn("Unknown operator", expression.op)
		}
	}
	
	console.warn("Unknown expression type", expression)
}

Chancery.prototype.setBid = function(condition) {
	if (!condition.inputBid) {
		let template = condition.template.raw
		// console.log(`Check conditions bid for template '${template}', \nwith current text${this.activeInput.map(s => "\n\t'" + s + "'").join("")}`)
		
		this.activeInput.forEach(input => {
			// Deal with empty string, match-any
			if (template === "") {
				console.log(`Matched any input ('${input}')`)
				condition.isFulfilled = true
				condition.pctFulfilled = 1
				condition.inputBid = {
					input: input,
					value: .01
				}
			} else {
				let traceryMatch = tracery.calculateMatch(this.map.grammar, template, input)
				if (traceryMatch) {
					// We have a match!
					console.log(`Matched an input template '${template}' with '${input}'`)
			
					condition.isFulfilled = true
					condition.pctFulfilled = 1
					condition.inputBid = {
						input: input,
						match: traceryMatch,
						// save the longest template, 
						// in case we want to prioritize "#color# #colothing#" over "#clothing#"
						value: template.length 
					}
				}
			}
		})
	}
	
}


// Don't check exits until we've finished entering the state
Chancery.prototype.updateExitMap = function() {


	// Update the current exit map
	this.exitMap.forEach(exit => {


		exit.pctOpen = 1
		exit.conditionMap.forEach(condition => {
			

			switch(condition.template.subtype) {
				case "say": 
					if (this.activeInput.length > 0) {
						// calculate the maximum current bit for any available input
						this.setBid(condition)
					}
					

					break
				case "expression": 
					let result = this.evaluateExpression(condition.template.expression)

					break
				case "command": 
					if (condition.template.command.raw === "wait")  {
						let time = this.evaluateExpression(condition.template.expression)
						let pct = this.timeInState/time
						condition.pctFulfilled = Math.max(Math.min(pct, 1), 0)
						condition.isFulfilled = pct >= this.tuning.timeToChangeState
					}	
					break;
				default: 

					console.warn("unknown exit conditionType ", condition.template)
			}

			exit.pctOpen *= condition.pctFulfilled
			
		})

		exit.isOpen = exit.pctOpen > .999

	})

	let openExits = this.exitMap.filter(ex => ex.isOpen)

	if (openExits.length > 0 && !this.activeExit) {
		console.log("Active exits:")
		console.log(openExits.map(ex => ex.template.raw).join("\n\t"))
		this.activateExit(openExits[0])
	}
	

	if (this.activeExit) {
		let time =  this.currentTime - this.activeExit.activatedOn
		if (time > 1)
			this.enterState(this.activeExit.template.target)
	}

}

Chancery.prototype.tick = function() {
	this.currentTime = Date.now()*.001
	this.timeInState = this.currentTime - this.timeEnteredState
	
	
	
	// Check the current action
	if (this.currentAction) {
		this.currentAction.progress.update(this.currentTime)
	} else {
		this.updateExitMap()

	}
}
Chancery.prototype.doExpression = function(expression) {
	switch(expression.chanceryType) {
		case "path": 
			let finishedPath = expression.path.map(segment => this.evaluateExpression(segment))
			let fxn = this.fxns[finishedPath[0]]
			let parameters = expression.parameters.map(param => this.evaluateExpression(param))
			fxn.apply(this, parameters)
			break;

		case "expression":
			console.log("do expression")
			break;

		default: 
			if (expression.op !== undefined) {
				// Left hand side should just be a path
				let path = expression.lhs.path.map(s => this.evaluateExpression(s))
				let rhs = this.evaluateExpression(expression.rhs)
				if (expression.op === "=") {
					this.setAtPath(path, rhs)
					// set!
				} else {
					try {
						console.warn("+=, etc not yet implemented")
 						let lhs = evaluateExpression(expression.lhs)
 						console.log(lhs)
					} catch(err) {
						console.warn(err)
					}
				}
				
				
				break;
			}
			console.warn(expression)
			break;
	}
	
}

Chancery.prototype.on = function(eventID, fxn) {
	this.handlers[eventID].push(fxn)
}

Chancery.prototype.enqueueActions = function(actions, {sourceID, sourceType, type, direction}) {
	if (actions === undefined) {
		// console.log(`No actions for ${direction} ${sourceType}:${sourceID} (type:${type})`)
		return
	}
	// console.log(`Add actions for ${direction} ${sourceType}:${sourceID} (type:${type})`)
	actions.forEach(template => {
		
		// What do we need to know about this action? When was it started?
		let action = {
			type: "action",
			template: template,
			progress:undefined
		}
		this.actionQueue.push(action)
	})

	this.checkActions()
}

Chancery.prototype.clearQueue = function() {
	while (this.actionQueue.length > 0)
		this.actionQueue.pop()
}

Chancery.prototype.performAction = function(action, allowAsync) {

}

// Do we have any actions to execute?
Chancery.prototype.checkActions = function() {
	if (this.currentAction === undefined && this.actionQueue.length > 0) {
		this.currentAction = this.actionQueue.shift()

		console.log(`Start action: '${this.currentAction.template.raw}' (${this.currentAction.template.subtype})` )
		// DO ACTIONS
		switch(this.currentAction.template.subtype) {

			case "say": 
				this.currentAction.progress = new StatusTimer({
					key:"activeAction",
					startTime:this.currentTime,
				})

				let rawOutput = this.currentAction.template.output

				let expanded = this.context.flatten(rawOutput)	
				
				// Send this to be said 
				// Saying things will return a promise
				
				if (this.handlers.onOutput.length > 0) {
					let outputData = {
						output: expanded,
						progress:this.currentAction.progress
					}
					this.handlers.onOutput[0](outputData).then(() => {
						this.currentAction = undefined
						this.checkActions()
					})

					this.handlers.onOutput.slice(1).forEach(fxn => fxn(outputData))
				}
				break;


			default: 
				if (this.currentAction.template.subtype === "expression") {
					this.doExpression(this.currentAction.template.expression)		
				}
				else if (this.currentAction.template.subtype === "stateCompleteEnter") {
					let chipTemplate = this.map.states[this.stateID].chips
					

					if (chipTemplate) {
						this.chips = chipTemplate.map(template => this.context.flatten(template.pattern))
					}

					this.callHandlers("onChips", this.chips)
				}



				// Do this action, but take a while about it
				this.currentAction.progress = new StatusTimer({
					key:"active",
					startTime:this.currentTime,
					duration:this.tuning.transitionTime.expression, 
					onTimeout:() => {
						this.completedActions.push(this.currentAction)
						this.currentAction = undefined
						this.checkActions()
					}
				})
				break;
		}	
	}
}

Chancery.prototype.createExitMap = function() {
	let state = this.map.states[this.stateID]

	if (!state.exits) {
		this.exitMap = []
		console.warn("No exits for state:", this.stateID)
		return;
	}

	// Initialize the exit map
	this.exitMap = state.exits.map((exitTemplate,index) => {
		return {
			id: exitTemplate.id || this.stateID + "_" + index,
			index: index,
			template: exitTemplate,
			active: undefined,
			open: undefined,
			conditionMap: exitTemplate.conditions.map(conditionTemplate => {
				return {
					template: conditionTemplate,
					startedOn: undefined,
					isFulfilled: false,
					pctFulfilled: Math.random()
				}
			}),
			actionMap: exitTemplate.actions.map(actionTemplate => {
				return {
					template: actionTemplate,
					startedOn: undefined,
					isFulfilled: false,
					pctFulfilled: Math.random()
				}
			}),
				
		}
	})
}

Chancery.prototype.activateExit = function(exit) {

	// Activate this exit!  
	// This is the one we'll take so store any matched strings as input,
	// and erase the current input
	this.activeInput = []
	this.chips = []
	this.callHandlers("onChips", this.chips)

	// Store current matched text
	exit.conditionMap.forEach(condition => {
		if (condition.inputBid) {
			this.blackboard.setAtPath("INPUT", condition.inputBid.input)

			let match = condition.inputBid.match
			// Store!
			// Clear all existing inputs
			// this.blackboard.clearPath("MATCH_0")
			// this.blackboard.clearPath("MATCH_1")
			// this.blackboard.clearPath("MATCH_2")
			// this.blackboard.clearPath("MATCH_3")
			// this.blackboard.clearPath("MATCH_BEFORE")
			// this.blackboard.clearPath("MATCH_AFTER")
			
			if (match) {
				let pre = match.input.substring(0, match.index)
				let post = match.input.substring(match.index + match[0].length)

				match.slice(1).forEach((matchText, index) => {
					this.blackboard.setAtPath("MATCH_" + index, matchText)
				})

				this.blackboard.setAtPath("MATCH_BEFORE", pre)
				this.blackboard.setAtPath("MATCH_AFTER", post)
			}
		
		}
	})
	
	this.enqueueActions(exit.template.actions, {sourceType:'exit',sourceID:exit.id,direction:"useExit", type:"action"})


	exit.isActive = true
	exit.activatedOn = this.currentTime
	this.activeExit = exit
}

Chancery.prototype.enterState = function(stateID) {
	if (stateID === "@") {
		// Stay here
		return
	}

	let lastID = this.stateID
	let lastState = this.map.states[lastID]

	this.activeExit = undefined
	this.timeEnteredState = this.currentTime

	if (stateID === "*") {
		// Loop back to this state
		stateID = this.stateID
	}


	this.stateID = stateID
	console.log(`----- ENTER '${stateID}' ----------`)


	let state = this.map.states[this.stateID]
	if (state === undefined) {
		console.warn(`No state called '${this.stateID}'`)
		this.error(`No state named '${this.stateID}'` )
		this.exitMap = []
		return
	}

	// Call the event handler
	this.callHandlers("onEnterState", this.stateID, lastID)

	// Clear the chips
	this.chips = []
	this.callHandlers("onChips", this.chips)


	this.createExitMap()


	// Do all the state's actions
	if (lastState) {
		this.enqueueActions(lastState.onExit, {sourceType:"state",sourceID:stateID,direction:"exit",type:"action"})
		this.enqueueActions(lastState.onExitPlay, {sourceType:"state",sourceID:stateID,direction:"exit",type:"play"})
		this.enqueueActions(lastState.onExitSay, {sourceType:"state",sourceID:stateID,direction:"exit",type:"say"})
	}
	this.enqueueActions([{
		raw: "TRANSITION START",
		subtype: "stateStartEnter",
	}], {sourceType:"state",sourceID:stateID,direction:"enter",type:"startTransition"})
	this.enqueueActions(state.onEnter, {sourceType:"state",sourceID:stateID,direction:"enter",type:"action"})
	this.enqueueActions(state.onEnterPlay, {sourceType:"state",sourceID:stateID,direction:"enter",type:"play"})
	this.enqueueActions(state.onEnterSay, {sourceType:"state",sourceID:stateID,direction:"enter",type:"say"})
	
	this.enqueueActions([{
		subtype: "stateCompleteEnter",
		raw: "TRANSITION"
	}], {sourceType:"state",sourceID:stateID,direction:"enter",type:"completeTransition"})
	

}

Chancery.prototype.callHandlers = function(type, ...args) {
	this.handlers[type].forEach(fxn => fxn(...args))
}
