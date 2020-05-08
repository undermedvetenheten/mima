
Vue.component('bot-editor', {
	template: `
	<div class="section section-boteditor">
		<div class="header">editor title:{{app.bot.metadata.title}}</div>
		
		<div class="content">
		

			<json-editor 
				:bot="app.bot"
				:jsonKey="jsonKey"
				:script="app.bot.data"  
				:keyPath="[app.keyData.keySet,app.keyData.key]" 
				@jsonChanged="jsonChanged"
				@pathChanged="pathChanged"
			/>

		</div>
		
	</div>`,

	watch: {
		"app.bot.data": function() {
			console.log("Bot data changed:\n\tstate ids:", Object.keys(app.bot.data.states))
			this.jsonKey = Math.floor(Math.random()*100000)
		}
	},

	mounted() {
		console.log("")
	},

	methods: {

		jsonChanged(newJSON) {
			console.log("JSON changed!", Object.keys(newJSON))
			app.bot.data = newJSON
			app.parseBot()
			
		},
		pathChanged(newPath) {
		
			// Are we browsing 
			//  chancery: state keys or grammar keys
			//  tracery: grammar keys

			// given some path, what key object are we in?
			let availableDictionaries = app.bot.language.dictionaries
			if (availableDictionaries) {
				if (availableDictionaries.includes(newPath[0])) {
					app.keyData.setKeySet(newPath[0], newPath[1])
				}
				else {
					app.keyData.setKeySet("")
				}

			} else {
				// We're in tracery (or something without multiple keysets)
				// So just clear the keyset
				app.keyData.setKeySet()
			}
			
		}
	},
	data() {
		return {
			jsonKey: 0
		}
	},
	props: {
		app: {
			type: Object,
			required: true
		},
		io: {
			type: Object,
			required: true
		},
	},
})