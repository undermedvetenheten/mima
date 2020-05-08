function getKeyStyle({key,isSelected,shade,keySet,textOnly}) {
	if (key === undefined)
		return undefined
	
	let hue = ((key.hashCode()*.001)%1 + 1)*360
	let pastel = Math.sin(key.hashCode())*.2 + .5

	if (shade)
		pastel = midLerp(pastel, shade)

	let style = {
		position: "relative",
		backgroundColor: `hsla(${hue}, ${100 - pastel*30}%, ${pastel*60 + 40}%, 1)`,
		color: `hsla(${hue}, 100%, 20%, 1)`,
		boxSizing: "border-box"
	}

	if (textOnly) {
		style.backgroundColor = "transparent"
		style.color = `hsla(${hue}, 100%, 40%, 1)`
	}

	if (isSelected)
		style.border = `2px solid hsla(${hue}, 100%, 40%, 1)`
	return style
} 


Vue.component("chancery-key", {
	template: `<div class="ery-key" :style="keyStyle">{{template.value}}</div>`,
	props: {template:{required:true}},
	computed: {
		keyStyle(){
			// return getKeyStyle({key:this.template.value,textOnly:true})
		}
	},
	
})


Vue.component("chancery-expression", {
	template: `

	<div v-if="template.constType" class="ery-const">{{template.value}}</div>
	
	<div v-else-if="template.op !== undefined" class="chancery-expression chancery-tree">
		<chancery-expression :template="template.lhs" />
		<div>{{template.op}}</div>
		<chancery-expression :template="template.rhs" />
	</div>
	
	<chancery-path v-else-if="template.chanceryType=='path'" :template="template" />
	<div v-else class="error">{{template}}</div>

	`,
	props: {template:{required:true, type:Object}}	
})

Vue.component("chancery-path", {
	template: `
	
	<div :class="{'ery-path':true,'ery-function':template.isFunction}">
		<chancery-key v-for="(item,index) in template.path" :key="index" :template="item" />
	
		<div v-if="template.isFunction" class="ery-parameters">
			<chancery-expression v-for="(param,index) in template.parameters" :key="index" :template="param"/>
		</div>
	</div>`,
	props: {template:{required:true}}	
})

Vue.component("chancery-conact", {
	template: `
		<pre class="chancery-say" v-if="template.subtype==='say'">〝{{template.output}}〞</pre>
		<div class="chancery-play" v-else-if="template.subtype==='play'">PLAY{{template}}</div>
		<div class="chancery-command" v-else-if="template.subtype==='command'" :class="getCommandClass">	
			<div class="inline-icon" v-if="template.command.raw=='wait'">🕑</div>
			<div class="inline-icon" v-else-if="template.command.raw=='play'">🎵</div>
			<chancery-path v-else :template="template.command"/>
			
			<chancery-expression :template="template.expression" />
		</div>
		<chancery-expression v-else-if="template.subtype==='expression'" :template="template.expression"/>
		<div v-else class="error">{{template}}</div>
	`,
	methods: {
		getCommandClass() {
			let c= {
				"chancery-command": true
			}
			c["chancery-command-" + template.command.raw]
			return c
		}
	},
	props: {
		template: {
			required: true,
			type: Object
		}
	}

})


// Show the exit
Vue.component("chancery-exit", {
	template: `
		<div class="chancery-exit">
			<header>

				<div class="ui-label" v-if="exit">{{exit.id}}</div>
				<div class="ui-code">{{template.raw}}</div>
			</header>
			<div class="content">
				<div class="chancery-exit-status" v-if="exit">
					<div v-if="exit.active">⭑</div>
					<div v-else-if="exit.open">⚬</div>
					<div v-else>-</div>
				</div>

				<div></div>
				<div class="chancery-conditions">
					<div class="ui-label">conditions</div>
					<chancery-conactlist :list="template.conditions" :isCondition="true"/>
			
				</div>
				<div class="chancery-exit-target ui-tile" :style="stateStyle">
					➜{{template.target}}
				</div>
				<div class="chancery-actions">
					<div class="ui-label">actions</div>
					<chancery-conactlist :list="template.actions"/>
			
				</div>
				</div>
		</div>`,

	computed: {
		stateStyle(){
			return getKeyStyle({key:this.template.target})
		}
	
	},
	props: {
		template: {required:true,type:Object},
		exit: {},
	}
})

// There's some chancery
// We want to see it moving live


// Show the current edges available
Vue.component("chancery-exitmap", {
	// Which edges are from states and which are from tags?
	template: `<div class="section section-chancery-exitmap panel">
		<h2>Exit Map for <div class="ui-tile" :style="stateStyle">{{instance.stateID}}</div></h2>

		<div class="scrollable">
			<div class="error" v-if="instance.exitMap.length === 0">No exits found</div>
			<chancery-exit v-for="(exit,index) in instance.exitMap" :key="index" :template="exit.template" :exit="exit" />
		</div>
	</div>`,
	computed: {
		stateStyle(){
			return getKeyStyle({key:this.instance.stateID})
		}
	},
	props: {instance:{required:true,type:Object}, app:{}}

})


Vue.component("chancery-conactlist", {
	template: `<div class="chancery-conactlist">
		<div :class="getClass" v-for="(conact,index) in list">
			<chancery-conact :template="conact"/>
		</div>
	</div>`,
	computed: {
		getClass() {
	
			if (this.isCondition)
				return {"chancery-condition":true}
			return {"chancery-action":true}
		}
	},

	props: ["list", "isCondition"],

})

Vue.component("chancery-actionstatus", {
	template: `<div v-if="action.type === 'finished'"><b>{{action.direction}}</b> {{action.sourceType}}:{{action.sourceID}}</div>
		<chancery-conact v-else :template="action.template" />
	`,
	props: ["action"]
})

// Whats in the queue of actions?
Vue.component("chancery-actionqueue", {
	// Which edges are from states and which are from tags?
	template: `<div class="section section-chancery-actionqueue panel">
		<h2>Action Queue</h2>
		<button @click="instance.clearQueue">clear</button>

		<div v-if="instance.currentAction" class="data-row chancery-activeaction">
			Current action:
			<chancery-clock mode="conical" :status="instance.currentAction.progress" />
			<chancery-actionstatus :action="instance.currentAction" />
		</div>
		<div v-else class="error">No active action</div>

		<div class="scrollable">
			<div class="error" v-if="instance.actionQueue.length === 0">Action queue empty!</div>
			<chancery-actionstatus v-for="(action,index) in instance.actionQueue" :key="index" :action="action" />
		</div>
			
	</div>`,
	props: {instance:{required:true,type:Object}, app:{}}

})


// List all the exits
Vue.component("chancery-exitbrowser", {
	// Where are we in the state map? Click to jump to a state
	template: `<div class="section section-chancery-exitbrowser panel">
		<h2>Exit Browser</h2>
			
	</div>`,
	props: {instance:{required:true,type:Object}, app:{}}
})

Vue.component("chancery-state", {
	template: `<div class="chancery-state"> 
		<header :style="stateStyle(.5)">
			<div class="ui-tile" @click="$emit('selectState', id)" :style="stateStyle(0)">{{id}}</div>
		</header>
		<div :style='stateStyle(.8)'>
			<div class="data-row" v-for="label in showProperties" :key=label >
				
				<div class="data-label">{{label}}</div>: 

				<div v-if="label==='exits'">
					<chancery-exit 
						v-for="(exitTemplate,index) in state.exits"
						:key="index" 
						:template="exitTemplate" />
				</div>
				<chancery-conactlist v-else :list="state[label]" />
			</div> 
		</div>
	</div>`,
	methods: {
		stateStyle(shade){
			return getKeyStyle({key:this.id, shade:shade})
		}
	},

	computed: {
		showProperties() {
			let props = []
			if (this.showData.exits)
				props.push("exits")
			if (this.showData.onEnterExit) {
				let directions = ["onEnter", "onExit", "onTick"]

				directions.map(s => [s, s + "Say", s + "Play", s + "Wait"])
					.forEach(group => props = props.concat(group))
		
			}
			
			props = props.filter((prop) => this.state[prop] !== undefined && this.state[prop].length > 0)


			return props
		}
	},

	props: {state:{required:true,type: Object}, id:{}, showData:{}}
})

// Whats in the queue of actions?
Vue.component("chancery-statemap", {
	// Where are we in the state map? Click to jump to a state
	template: `<div class="section section-chancery-statemap panel">
		<header>
			<h2>State map</h2>
			<div><button 
				v-for="(val,mode) in showData"
				class="toggle-button" 
				:key=mode
				:class="{active:showData[mode]}" 
				@click="showData[mode]=!showData[mode]">
					{{mode}}
				</button></div>
		<div class="controls">
	
		</div>
		</header>

		<div class="scrollable">
			<chancery-state v-for="(state,stateID) in instance.map.states" :key="stateID" 
				:state=state
				:id=stateID
				:showData=showData
				@selectState=selectState
			/>
		</div>
	</div>`,
			
	methods: {
		selectState(id) {
			console.warn(id)
			app.instance.enterState(id)
		}
	},
	data() {
		return {

			showData: {
				exits: true,
				onEnterExit: true,
			}
		}
	},
	props: {instance:{required:true,type:Object}, app:{}}
})


//========================================================================
// A little clock-circle that can fill up or down as needed
// OR a little pill-bar to fill
Vue.component('chancery-clock', {
	template: `<div class="chancery-clock" 
					:style="style" ></div>`,
	computed: {
		style() {
			let c0 = this.colorBG
			let c1 = this.color

			let pct = this.status.pct*100
			let style = {}
				if (this.direction == "conical") 
					style.background = `conic-gradient(${c1} 0%, ${c1} ${pct}%,${c0} ${pct}%, ${c0} 100%)`
				else if (this.direction == "horizontal") 
					style.background = `linear-gradient(to right,${c1} 0%, ${c1} ${pct}%,${c0} ${pct}%, ${c0} 100%)`
				else 
					style.background = `linear-gradient(to top,${c1} 0%, ${c1} ${pct}%,${c0} ${pct}%, ${c0} 100%)`
				
			return style
				
		}
	},
	props: {
		direction: {
			default: "conical"
		},
		status: {
			type: Object,
			required: true
		},
		colorBG: {
			type: String,
			default: "#222"
		},
		color: {
			type: String,
			default: "#19F"
		}
	}
})