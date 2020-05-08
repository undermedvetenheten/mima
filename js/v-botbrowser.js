
Vue.component('bot-browser', {
	template: `
	<div class="section">
		

	</div>`,
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