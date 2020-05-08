function parseTracery(raw) {
	// Map the grammar
	return mapObject(raw, (val, key) => {
		if (!Array.isArray(val)) {
			val = [val]
		}
		let ruleset = val.map(parseTraceryRule)
		return ruleset
	})
}

function parseTraceryRule(rule) {
	let sections = splitIntoProtectedSections({s:rule, startContext:"outerRule", contextMap:traceryMap}) 
	if (sections.length === 1 && sections[0].openChar === undefined)
		return sections[0].text
		
	let ruleNode = {
		raw: rule,
		traceryType: "rule",
		sections: sections.map(section => {
			if (section.openChar === "#")
				return parseTraceryTag(section.inner)
			if (section.openChar === "[")
				return parseTraceryAction(section.inner)

			return section.text
		})
	} 

	

	return ruleNode
}

function parseTraceryTag(tag) {
	let sections = splitProtected({s:tag, startContext:"tag", contextMap:traceryMap, splitters:"."})
	
	let target = splitProtected({s:sections[0], startContext:"tag", contextMap: traceryMap, splitters:"/"})
	
	let tagNode = {
		traceryType: "tag",
		target: target,
		preActions: [],
		modifiers: sections.slice(1),
		raw: tag
	}
	return tagNode
}

function parseTraceryAction(action) {
	console.warn("parse action", action)
	let sections = splitProtected({s:action, startContext:"tag", contextMap:traceryMap, splitters:":"})
	let target = sections[0]
	let rules = splitProtected({s:sections[1], startContext:"tag", contextMap:traceryMap, splitters:","})
	
	let actionNode = {
		target: target,
		traceryType: "action",
		raw: action,
	}
	return actionNode
}




let traceryMap = {
	
	outerRule: {
		'#': "tag",
		'[': "tag",
	},	
	innerRule: {
		'#': "tag",
		'{': "tag",
		'[': "tag",
	},	
	tag: {
		'"': "innerRule",
		'\'': "innerRule",
		"{": "tag",
		"(": "tag",
		"[": "tag"
	},
}