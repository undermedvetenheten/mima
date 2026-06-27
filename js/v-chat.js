
// Reusable chat component
Vue.component('chat-window', {

	template: `
	<div class="chatwindow">

		<div class="chatwindow-messages" ref="messages">

			<!-- show the message, who it's from, any images, etc -->
			<br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br>
			<div class="chatwindow-message" v-for="(message,msgIndex) in visibleMessages" :class="{['chatwindow-message-' + message.owner]:true}">

				<div class="chatwindow-message-body" :style="msgStyle(message, msgIndex)">
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
			<div class="chatwindow-message chatwindow-message-bot listening-indicator" v-if="showListening">
				<div class="listening-dots">
					<span></span><span></span><span></span>
				</div>
			</div>
		</div>
		<div class="chatwindow-controls">
			<div class="chatwindow-chips">
				<button class="chat-chip" @click="chipInput(chip)" v-for="chip in chips">{{chip}}</button>
			</div>
			<input class="chatwindow-input" v-model="input" ref="input" @keyup="typeInput" @input="onTyping"></input>
			<button v-if="sendButton">▶︎</button>
		</div>
	</div>
	`,

	computed: {
		// Only the most recent messages are ever visible — older ones fade to
		// opacity 0 (see msgStyle) and the box doesn't scroll. Rendering the whole
		// history meant every new bubble re-laid-out an ever-growing list; on Android
		// that main-thread reflow spike starved the audio thread and produced a sharp
		// tick/pop exactly as the bubble appeared. Capping the rendered list keeps
		// the per-bubble cost small and constant. 12 > the ~5 that are ever visible.
		visibleMessages() {
			return this.messages.slice(-12)
		}
	},

	methods: {

		msgStyle(msg, index) {
			// index is within visibleMessages; fade older bubbles out by recency. Using
			// the visible-list length keeps the most-recent opacities identical to before.
			let nth = 1.4 - (this.visibleMessages.length - index)/3
			let opacity = Math.min(Math.max(nth*1,0), 1)
			return {
				opacity:opacity
			}
		},

		chipInput(text) {
			this.input = text
			this.sendInput()
		},
		typeInput(event) {
			if(event.key == "Enter")
			 	this.sendInput()
		},
		onTyping() {
			const input = this.$refs.input
			const rect  = input.getBoundingClientRect()
			// Estimate the cursor's screen X by measuring text width up to the caret.
			let clientX = rect.left + rect.width * 0.25
			try {
				if (!window._mimaMeasCtx)
					window._mimaMeasCtx = document.createElement('canvas').getContext('2d')
				const ctx = window._mimaMeasCtx
				ctx.font = getComputedStyle(input).font
				const cur  = input.selectionStart != null ? input.selectionStart : input.value.length
				const tw   = ctx.measureText(input.value.slice(0, cur)).width
				const pl   = parseFloat(getComputedStyle(input).paddingLeft) || 8
				clientX    = Math.min(rect.right - 4, rect.left + pl + tw)
			} catch (e) {}
			this.$emit('typing', { clientX, clientY: rect.top + rect.height * 0.45 })
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
		},
		showListening() {
			Vue.nextTick(() => {
				var container = this.$refs.messages;
				container.scrollTop = container.scrollHeight;
			})
		}
	},
	data() {
		return {
			sendButton: false,
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
		},
		showListening: {
			type: Boolean,
			default: false
		}
	}
	
})