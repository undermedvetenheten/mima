
// Action/condition
Vue.component('chancery-expression', {
	template: `<div class="tracery-const" v-if="expression.constType">{{expression.value}}</div>

	

	<div class="chancery-expression" v-else-if="expression.op !== undefined">
		<chancery-expression v-if="expression.lhs !== undefined" :expression="expression.lhs" />
		<div class="chancery-op">{{expression.op}}</div>
		<chancery-expression v-if="expression.rhs !== undefined" :expression="expression.rhs" />
	</div>

	<chancery-item v-else-if="expression.chanceryType==='path'" :item=expression />


	<div class="chancery-expression" v-else>{{expression}}</div>
`,
	props: {
		expression: {
			type: Object,
			required: true
		}
	}
	
})



Vue.component('chancery-item', {
	template: `
	<div class="chancery-key" v-if="typeof item === 'string'">
		{{item}}
	</div>
	<div v-else-if="item.chanceryType === 'path'" class="chancery-path">
		<chancery-item v-for="(segment, index) in item.path" :key="index" :item="segment" />
	</div>
	<div v-else-if="item.chanceryType === 'key'" class="chancery-key">
		{{item.value}}
	</div>`,
	props: {
		item: {
			required: true
		}
	}
})



Vue.component('chancery-actcon', {
	template: `
	<div v-if="template.subtype === 'say'" class="chancery-say" :class="{'chancery-condition':actcon.template.isCondition}">
		{{template.raw}}
	</div>

	<div v-else class="chancery-actcon" :class="getClass">
		<chancery-clock :pct="actcon.pctFulfilled" />
		<span v-if="template.command !== undefined" >
			<chancery-item :item="template.command" />:
		</span>
		<chancery-expression :expression="template.expression" />
	</div>`,
	
	computed: {

		template() {
			return this.actcon.template 
		},
		getClass() {
			let c = {
				fulfilled: this.actcon.isFulfilled
			}
			c["chancery-actcon-" + this.actcon.template.subtype] = true
			c["chancery-actcon-" + this.actcon.template.chanceryType] = true
			
			return c
		}
	},
	props: {
		actcon: {
			required: true
		},	
	}
})

Vue.component('chancery-exit', {
	template: `
		<div class="chancery-exit" :class="{open:exit.isOpen,active:exit.isActive}">
			<header>
				<div class="ui-code">{{exit.template.raw}}</div>
			</header>
			<div class="content">
				<div v-if="exit.isOpen">
					<button @click="$emit('activateExit', exit)">➜</button>
				</div>

				<div class="chancery-exit-conditions">
					<div class="chancery-exit-actcongroup">
						<chancery-actcon v-for="(condition,index) in exit.conditionMap" :key="'condition' + index" :actcon="condition" />
					</div>
				</div>
				<div class="chancery-exit-target">➜<chancery-item :item="exit.template.target" /></div>
				<div class="chancery-exit-actions">
					<div class="chancery-exit-actcongroup">
						<chancery-actcon v-for="(action,index) in exit.actionMap" :key="'action' + index"  :actcon="action" />
						
					</div>
				</div>
			</div>
		</div>
	`,
	props: {
		exit: {
			required:true,
			type: Object
		}
	}
})

Vue.component('preview-chancery', {
	template: `


	<div class="section preview-chancery">
		<div><button @click="startInstance">start chancery instance</button></div>
		<div v-if="instance !== undefined" class="chancery-inspector section">
			<header>
				<div>Current state: 
					<div class="ui-tile" :style="app.keyData.getKeyStyle(instance.stateID)">{{instance.stateID}}</div>
				</div>
				<div class="ui-data">🕐{{instance.timeInState.toFixed(0)}}</div>
			</header>

			<div class="bbview">
				<bb-view :blackboard="instance.blackboard" />
			</div>
			
			<div class="chancery-exitview">
				<chancery-exit @activateExit="activateExit" v-for="(exit,index) in instance.exitMap" :key="index" :exit="exit" />
			</div>
		</div>
		

		<chat-window @sendInput="userInput" :messages=messages />
	</div>`,
	

	methods: {
		activateExit(exit) {
			console.log("exit", exit)
			this.instance.activateExit(exit)
		},
		userInput(data) {
			console.log(data)
			let msg = {
				owner: "user",
				text: [data]
			}
			this.messages.push(msg)

			this.instance.input(msg)
		},
		startInstance() {
			console.log("Create new chancery instance", app.bot.metadata.title)
			
			clearInterval(this.botTimer)
			this.instance = new Chancery(app.bot.parsed, app.bot.metadata, (output) => {
				this.messages.push({
					owner: "bot",
					text: [output]
				})
			})
			this.instance.start()
		
			this.botTimer = setInterval(() => {
				if (this.tickCount > this.maxTicks) {
					clearInterval(this.botTimer)
				} else {
					this.tickCount++
					this.instance.tick()
					
				}
			}, this.tickRate)
			
		}
	},

	mounted() {
		this.startInstance()
	},

	watch:{
		"app.bot": function() {
			
		},

		"app.bot.parsed": function() {
			this.startInstance()
		},
	},
		

	// 		let ui = this
	// 		this.chanceryInstance = {
	// 			input: function(message) {
	// 				console.log(`Received message: "${message.text.join(" | ")}", from ${message.owner} to ${message.target}`)
	// 				let reply = []
	// 				let count = Math.floor(3*Math.random()*Math.random() + 1)
	// 				for (var i = 0; i < count; i++) {
	// 					reply.push(	utilities.words.getRandomSentence())
	// 				}

				
	// 				this.output({
	// 					owner: "bot",
	// 					target: message.owner,
	// 					text: reply

	// 				})
	// 			}, 
	// 			output: function(message) {
	// 				ui.messages.push(message)
	// 			} 
	// 		}
			
	// 	}
	// },

	data() {
		return {
			tickCount: 0,
			maxTicks: 100000000,
			tickRate: 100,
			instance: undefined,
			messages: [{
				text: ["hello world"]
			}]
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