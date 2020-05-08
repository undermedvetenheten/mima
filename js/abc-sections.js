// Define a new component called button-counter
Vue.component('page-section0', {
	template: `
	<div class="column">
		<div class="sectionset">
			<div class="controls header">

				<button 
					v-for="id in ['keybrowser','parser','preview']"
					class="toggle-button"
					@click="show[id] =! show[id]" 
					:class="{disabled:!show[id]}">{{id}}</button>
			</div>
			<key-browser v-if="show.keybrowser" :app=app />
			<parse-view v-if="show.parser" :app=app :io=io />
			<bot-preview v-if="show.preview" :app=app :io=io />
		</div>
	</div>`,

	mounted: function() {
		
	},

	data: function() {

		return {
			show: {
				keybrowser: false,
				preview: true,
				parser: false
			}
		
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



Vue.component('page-section1', {
	template: `
	<div class="column">
		<div class="sectionset">
			<bot-editor :app=app :io=io />
			
		</div>
	</div>`,
	
	methods:  {
	
	},	

	watch: {

	},


	computed: {

	
	},

	mounted: function() {
		// console.log(this.allApps)

	},

	data: function() {
		return {
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