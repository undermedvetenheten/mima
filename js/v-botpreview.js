
Vue.component('bot-preview', {
	template: `
	<div class="section section-botpreview">
		<div class="controls">
			<select v-model="mode">
				<option>chancery</option>
				<option>tracery</option>
			</select>
		</div>
		
		<div v-if="app.bot.parsed === undefined" class="error">No bot loaded</div>
		<preview-tracery v-else-if="mode=='tracery'" :parsedGrammar="grammar" />
		<preview-chancery v-else-if="mode=='chancery'" :app=app :io=io />
		<div class="error" v-else>Unknown sim mode:{{language}}</div>

	</div>`,
	data() {
		return {
			mode: "chancery"
		}
	},
	mounted() {
		console.log(app.bot)
	},
	computed: {
		grammar() {
			if (app.bot.metadata.language === "chancery")
				return app.bot.parsed.grammar
			if (app.bot.metadata.language === "tracery")
				return app.bot.parsed
			console.log("Unknown bot language for bot", app.bot.metadata)
			
		},
		language() {
			return app.languageMode.language
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