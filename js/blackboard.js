

function Blackboard(initialValues) {

	this.listeners = {
		modify: []
	}
	
	// For each item, create the value sets

	function subBoard(values) {
		if (typeof values === "object") {
			if (Array.isArray(values)) {
				return {
					type: "array",
					value: values.map(v => subBoard(v))
				}
			} else {
				return {
					type: "object",
					value: mapObject(values, v => subBoard(v))
				}
			}
		}
		if (typeof values === "string" || typeof values === "number" || typeof values === "boolean")
			return {
				type: typeof values,
				value: values
			}
		console.warn("Unknown blackboard template", values)
	}

	this.board = subBoard(initialValues)
}

Blackboard.prototype.onModify = function(fxn) {
	this.listeners.modify.push(fxn)
}

Blackboard.prototype.addKey = function(root, key) {
	if (typeof key === "string") {
		if (root.type === undefined) {
			Vue.set(root, "type", "object")
			Vue.set(root, "value", {})
			// root.type = "object"
			// root.value = {}
		}
		if (root.type === "object") {
			Vue.set(root.value, key, {})
		}
		else {
			console.warn(`can't add a string key '${key}' to non-object `, root)
		}
		return true
	
	} else if (typeof key === "number") {

		if (root.type === undefined) {
			Vue.set(root, "type", "array")
			Vue.set(root, "value", [])
			
		}
		if (root.type === "array") {
			Vue.set(root.value, key, {})
			// root.value[key] = {}
		}
		
		else {
			console.warn(`can't add a number key '${key}' to non-array `, root)
		}

		return true
	} else {
		return false;
		console.warn(`can't add a key to non-objarray `, root)
	}
}

Blackboard.prototype.getHolder = function(path, createKeys) {
	let bb = this
	
	function getHolder(root, path, index) {
		let key = path[index]
		if (key === undefined)
			return root

		
		// is there nothing here?
		if (root.value === undefined || root.value[key] === undefined) {
			if (createKeys) {
				// Not found!
				// Create this key?
				let success = bb.addKey(root, key)
				if (success)
					return getHolder(root.value[key], path, index + 1)
				return undefined
			}
			else {
				return undefined
			}
		} else {
			return getHolder(root.value[key], path, index + 1)
		}
	}

	return getHolder(this.board, path, 0)
}


Blackboard.prototype.getAtPath = function(path) {
	let holder = this.getHolder(path)
	if (!holder)
		throw(`[${path}] not found on blackboard`)
	return holder.value
}


Blackboard.prototype.setAtPath = function(path, val) {
	if (typeof path === "string")
		path = [path]
	let holder = this.getHolder(path, true)
	

	Vue.set(holder, "value", val)
	
	this.listeners.modify.forEach(fxn => fxn(path, val))

	if (!holder)
		throw(`[${path}] could not be created on blackboard`)
	return holder.value
}

