

let app = {

	// What key is selected, and from the grammar, or the chancery states (etc)?
	languageMode: {
		language: "chancery",
		keyModes: ["states", "grammar", "initialBlackboard"],
	},

	keyData: {
		keySet: "--",
		key: "---",
		getKeyObject() {
			// Get the grammar for tracery

			if (app.bot.metadata.language === "tracery") {
				return app.bot.parsed 
			}
			else if (app.bot.metadata.language === "chancery") {
				if (app.bot.parsed[this.keySet] === undefined)
					console.warn(`${app.bot.metadata.language} bot does not have keyset '${this.keySet}'`, app.bot) 
				return app.bot.parsed[this.keySet]
			}
			else return {}
		},
		setKeySet(keySet, initialKey) {
			console.log("Set keyset", keySet, initialKey)
		
			this.keySet = keySet
			if (!initialKey) {

				let keys = Object.keys(this.getKeyObject())
				this.setKey(keys[0])
			} else {
				this.setKey(initialKey)
			}
		},
		setKey(key) {
			this.key = key
		},
		getKeyStyle(key) {
			if (key === undefined)
				return undefined
			
			let isSelected = key === this.key
			let hue = ((key.hashCode()*.001)%1 + 1)*360
			let pastel = Math.sin(key.hashCode())*.5 + .5

			let style = {
				position: "relative",
				backgroundColor: `hsla(${hue}, ${90 - pastel*0}%, ${pastel*20 + 60}%, 1)`,
				color: `hsla(${hue}, 100%, 20%, 1)`,
				boxSizing: "border-box"
			}
			if (isSelected)
			style.border = `2px solid hsla(${hue}, 100%, 40%, 1)`
			return style
		},
	},

	
	// the currently selected bot
	// Bots contain metadata and data (ie, the grammar or map data)
	loadBot(rawBot) {

		if (rawBot === undefined || rawBot.data === undefined) {
			console.warn("No bot provided")
			return 
		}

		// Set bot data
		Vue.set(app.bot, "metadata", rawBot.metadata)
		Vue.set(app.bot, "data", rawBot.data)
		Vue.set(app.bot, "language", languageData[rawBot.metadata.language])
	
		console.log(`Loading '${app.bot.metadata.title}'`)
		if (app.bot.language.dictionaries) {
			app.bot.language.dictionaries.forEach((key) => {
				if (app.bot.data[key])
					console.log(`\t${key}:\t ${Object.keys(app.bot.data[key])}`)
			})
		}


		
		console.log("\tparsing....")

		this.parseBot()
		
		if (app.bot.metadata.language === "tracery")
			app.keyData.setKeySet("grammar")
		else
			app.keyData.setKeySet("grammar")
		
	},

	parseBot() {
		localStorage.setItem("lastbot", JSON.stringify(app.bot.data))

		console.log(`Reparsing ${app.bot.metadata.language} bot`)
		switch(app.bot.metadata.language) {
			case "chancery": 
				Vue.set(app.bot, "parsed", parseChancery(app.bot.data))
				console.log(app.bot.parsed)
				
				break;
			case "tracery": 
				Vue.set(app.bot, "parsed", parseTracery(app.bot.data))
				
				break;
		}
		

	},

	bot: {
		metadata: {},
		data: {},
		parsed: undefined
	},


	modes: ["edit", "browse", "user"],
	mode: "edit",
	searchFilter: {}
}

window.onload = () => {
	

	console.log("Hello ABC!")
	
	// Be sure to do all initialization before creating the app, 
	// otherwise vue might not watch stuff
	io.init(app)
	// io.initFirebase()

	createApp(app, io)

	let id = "testBot"
	
	let data = localStorage.getItem("lastbot")
	if (data)
		data = JSON.parse(data)
	else {
		data = referenceBots[id]
	}

	app.loadBot({
		data: data,
		metadata: {
			title: id,
			language: "chancery"
		}
	})


}

