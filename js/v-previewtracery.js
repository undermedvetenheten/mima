Vue.component('preview-tracerypath', {
	template: `
		<div class="ui-tile" @click="selectPath" :style="style">{{path[0]}}</div>
	`,
	computed: {
		style() {
			return app.keyData.getKeyStyle(this.path[0])

		},
	},
	methods: {
		selectPath() {
			if (this.path.length === 1)
				app.keyData.setKeySet("grammar", this.path[0])
			else  {
				// Must be in....a world object?

				app.keyData.setPath(this.path[0])
			}
		}
	},
	props: ["path"]

})

Vue.component('preview-tracerynode', {
	template: `

	<div v-if="node === undefined" class="error">
		EMPTY NODE
	</div>

	<div v-else-if="type === 'array'"  class="tracery-array">
		<preview-tracerynode v-for="(subnode,index) in node" :key=index :node="subnode" />
	</div>
	


	<div v-else-if="type === 'const'" class="tracery-const">
		{{node.finished}}
	</div>


	<div v-else-if="type === 'rule'" class="tracery-node tracery-rule">
		<header>
			<div class="ui-code">{{node.template.raw}}</div>
			<div  class="ui-label">{{node.finished}}</div>
		</header>
		<div class="content">
			<preview-tracerynode v-for="(section,index) in node.sections" :key=index  :node="section"/>
		</div>
	</div>

	<div v-else-if="type === 'tag'" class="tracery-node tracery-tag">
		<header>
			<preview-tracerypath :path="node.targetPath" />
		</header>
		<div class="content">
			<preview-tracerynode :node="node.ruleNode"/>
		</div>
	</div>
	

	<div v-else-if="type !== undefined" class="tracery-node" >
		todo:{{node.template.traceryType}}
	</div>

	<div v-else class="error">
		{{node}}
	</div>`,

	computed: {
		type(){
			if ( Array.isArray(this.node))
				return "array"
			if (this.node.constType) {
				return "const"
			}
			return this.node.template.traceryType
		}
		
	},

	props: {
		label: {
			type: String
		},
		node: {
			required: true
		}
	}
})

Vue.component('preview-trace', {
	template: `
	<div>
		
		<preview-tracerynode :node="trace.root" />
		<div>{{trace.root.finished}}</div>
	</div>`,

	props: {
		trace: {
			required: true
		}
	}
})

Vue.component('preview-tracery', {
	template: `
	<div class="section">
		
		<header><div class="controls">
			<input v-model="seed">
			<select v-model='count'><option v-for="num in counts">{{num}}</option></select>

			<button class="svg-button" @click="randomize"><img src="/css/icon/randomize.svg"></button>
			
			<button class="toggle-button svg-button" @click="showNested=!showNested" :class="{active:showNested}"><img src="/css/icon/nested.svg"></button>
			<button class="toggle-button svg-button" @click="showCode=!showCode" :class="{active:showCode}"><img src="/css/icon/code.svg"></button>
		</div></header>

		<div class="content">
			<div v-if="parsedGrammar === undefined" class="error">no grammar found in bot</div>
			<div v-else class="tracery-traces">

				<div v-for="(trace,index) in traces" :key="index" class="tracery-trace" >
					<preview-trace v-if="showNested" :trace="trace" />
					<div v-else v-html="trace.finished"></div>

					
				</div>

			</div>

		</div>
	</div>`,

	methods: {
		randomize() {
			this.seed = utilities.words.getRandomSeed()
		}
	},
	computed: {

		traces() {
			// Todo: set random as part of context
			Math.seedrandom(this.seed);
			let traces = []
			for (var i = 0; i < this.count; i++) {
				let seed = utilities.words.getRandomSeed(4)
				let trace = tracery.expand({
					grammar: this.parsedGrammar, 
					originRule: `#${this.origin}#`})
				traces.push({
					seed: seed,
					root:trace
				})
			}

			return traces
		}
	},
	data() {
		return {
			seed: utilities.words.getRandomSeed(),
			counts: [1, 5, 15, 25],
			showCode: true,
			showNested: true,
			count: 1,
			origin: "origin"
		}
	},
	props: {
		parsedGrammar: {
			type: Object
		}
	},
})