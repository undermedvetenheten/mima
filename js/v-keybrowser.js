
Vue.component('key-browser', {
	template: `
	<div class="section section-keybrowser">
		
		<div class="keys"  >
			<select v-if="app.languageMode.keyModes" @change="app.keyData.setKeySet(app.keyData.keySet)" v-model="app.keyData.keySet">
				<option v-for="mode in app.languageMode.keyModes">{{mode}}</option>
			</select>
			
			
		
			<div class="key-tile"
				:ref ="key"
				v-for="(key, index) in objectKeys"
				:tabIndex= "index + 4000"
				:style="app.keyData.getKeyStyle(key)" 
				@click="selectKey(key)"
				@focus="selectKey(key)"
			>
				{{key}}
			</div>
		</div>
		

	</div>`,

	
	methods: {
		selectKey(key) {
			app.keyData.setKey(key)
			
			Vue.nextTick(() => {
				this.$refs[key][0].focus()
			})
			
		}
	},



	computed: {
		objectKeys() {
			return Object.keys(app.keyData.getKeyObject())
		},
		
	},
	

	props: {
		app: {
			type: Object,
			required: true
		},
		
		
	},
})