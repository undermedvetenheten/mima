
// Reusable chat component
Vue.component('chat-window', {

	template: `
	<div class="chatwindow">
		
		<div class="chatwindow-messages" ref="messages">

			<!-- show the message, who it's from, any images, etc -->
			<div class="chatwindow-message" v-for="message in messages">

				<div class="chatwindow-message-body">
					<div v-if="message.text">
						<p class="chatwindow-text" v-for="text in message.text">{{text}}</p>
					</div>
					<div v-if="message.img">
						<img class="chatwindow-img" :src="message.img" />
					</div>
				</div>
				<div class="chatwindow-message-author">
				</div>
			</div>
		</div>
		<div class="chatwindow-controls">
			<div class="chatwindow-chips">
				<button class="ui-tile" @click="chipInput(chip)" v-for="chip in chips">{{chip}}</button>
			</div>
			<input class="chatwindow-input" v-model="input" ref="input" @keyup="typeInput"></input>
			<button>▶︎</button>
		</div>
	</div>
	`,

	methods: {
		chipInput(text) {
			this.input = text
			this.sendInput()
		
		},
		typeInput(event) {
			console.log("type")
			if(event.key == "Enter") 
			 	this.sendInput()
		},

		sendInput() {
			this.$emit("sendInput", this.input)
			this.input = ""
		}
	},
	watch: {
		messages() {
			Vue.nextTick(() => {
				var container = this.$refs.messages;
				container.scrollTop = container.scrollHeight;	
			})
			
		}
	},
	data() {
		return {
			input: ""
		}
	},
	props: {
		users: {
			type: Object
		},
		chips: {
			type: Array,
		},
		messages: {
			type: Array,
			required: true
		}
	}
	
})