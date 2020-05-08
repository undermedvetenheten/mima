
//=============================================================

Vue.component('tracery-action', {
	template: `
		<div class="tracery-action">
			<div class="tracery-key">{{action.target}}</div>
			<tracery-ruleset :ruleset="action.rules" />
		</div>`,
	props: ["action"]
})

Vue.component('tracery-tag', {
	template: `
		<div class="tracery-tag">

			<div class="tracery-key key-tile" @click="clickKey" :style="style">{{tag.target}}</div>

			<div class="tracery-modifier" v-for="mod in tag.modifiers">
				{{mod}}
			</div>
		</div>`,
	props: ["tag"],
	methods: {
		clickKey() {
			app.keyData.setKeySet('grammar', this.tag.target)
		}
	},
	computed: {
		style() {
			return app.keyData.getKeyStyle(this.tag.target)
		}
	}
})


Vue.component('tracery-rulesection', {
	// for each section, may be a tag or an action
	template: `
		<div v-if="typeof section === 'string'" class="tracery-text">{{section}}</div>

		<tracery-action v-else-if="section.traceryType==='action'" :action=section />

		<tracery-tag v-else-if="section.traceryType==='tag'" :tag=section />

		<div v-else class="error">UNKNOWN rule section type {{section.traceryType}}: {{section}}</div>
	`,
	props: {section:{required:true}}

	
})

Vue.component('tracery-rule', {

	// for each section
	template: `
	<div v-if="typeof rule === 'string'" class="tracery-rule tracery-text">{{rule}}</div>

	<div v-else class="tracery-rule">
		<tracery-rulesection v-for="(section,index) in rule.sections" :key="index" :section="section" />
	</div>
	`,		
	props: ["rule"]
})

Vue.component('tracery-ruleset', {
	template: `
	
	<div class="tracery-ruleset">
	
		<tracery-rule v-for="(rule,index) in ruleset" :key="index" :rule=rule />
	</div>
	`,
	props: ["ruleset"]
})

//=============================================================



Vue.component('parse-view-chancerytree', {
	template: 
	`<div v-if="tree === undefined">
	EMPTY
	</div>
	<div v-else-if="tree.op" class="chancery-parseitem chancery-tree">
		<parse-view-chancerytree :tree="tree.lhs"/>
		<div class="chancery-parseitem chancery-op ">{{tree.op}}</div>
		<parse-view-chancerytree :tree="tree.rhs"/>
	</div>
	
	<div v-else-if="typeof tree != 'object'" class="chancery-parseitem chancery-unknown">
		Unknown subtree: {{tree}}
	</div>

	
	
	<parse-view-chanceryitem  v-else :item=tree />
		
	`,
	props: ["tree"]
})

Vue.component('parse-view-chanceryitem', {
	template: `

		<div class="chancery-parseitem chancery-exit" v-if="item.chanceryType === 'exit'">
			<!-- EXIT --> 
			<div class="header">
				{{item.raw}}
			</div>
			<div class="content">
				<parse-view-chanceryitem v-for="(condition,index) in item.conditions" :key="'condition' + index" :item='condition'/>
				<div class="chancery-parseitem chancery-target">➜{{item.target.raw}}</div>
				<parse-view-chanceryitem v-for="(action,index) in item.actions" :key="'action' + index" :item='action'/>
			</div>
		</div>
			

		<div class="chancery-parseitem" :class="'chancery-' + item.chanceryType"  v-else-if="item.chanceryType === 'action' || item.chanceryType === 'condition'">
			<!-- CONDITION --> 
			<div v-if="item.subtype==='say'" class="chancery-say">{{item.output}}</div>
			
			<div v-else-if="item.subtype==='expression'" class="chancery-expression">
				<div class="header">{{item.raw}}</div>
				<parse-view-chancerytree :tree="item.tree" />
				
			</div>
			<div v-else>A/C type: {{item.subtype}}</div>

		</div>

		<div class="chancery-parseitem" :class="'chancery-' + item.chanceryType"  v-else-if="item.chanceryType === 'command'">
			{{item.command}}:<parse-view-chanceryitem :item="item.value"/>
		</div>

		<div class="chancery-parseitem" :class="'chancery-' + item.chanceryType"  v-else-if="item.chanceryType === 'path'  && !item.isFunction">
			<parse-view-chanceryitem v-for="(section, index) in item.path" :key="index" :item="section" />
		</div>


		<div class="chancery-parseitem chancery-function"  v-else-if="item.chanceryType === 'path' && item.isFunction">
			<parse-view-chanceryitem v-for="(section,index) in item.path" :key="index" :item="section" />
			<div class="chancery-parameters">
				<parse-view-chanceryitem v-for="(param,index) in item.parameters" :key="index" :item="param" />
			</div>
		</div>

		<div class="chancery-parseitem" :class="'chancery-' + item.chanceryType"  v-else-if="item.chanceryType === 'chip'">
			{{item.pattern}}
		</div>

		<div class="chancery-parseitem" :class="'chancery-' + item.chanceryType"  
			v-else-if="item.chanceryType === 'number' 
			|| item.chanceryType === 'text'
			|| item.chanceryType === 'key'">
			{{item.value}}
		</div>
	`,
	props:["item"]
})

Vue.component('parse-view-chancerystate', {
	template: `
			<div>


				<div class="data-row" v-for="propKey in showProps" :key="propKey">

					<div class="data-label">{{propKey}}:</div>
					
					<div class="data-value" v-if="typeof state[propKey] === 'object'">
						<parse-view-chanceryitem v-for="(item,index) in state[propKey]" :key="index" :item=item />
					</div>
					<div class="data-value" v-else>

						{{state[propKey]}}
					</div>
				</div>

			</div>
	`,
	computed: {
		showProps() {
			let skipKeys = ("id", "raw")
			if (this.state === undefined)
				return []
			return (Object.keys(this.state)).filter(key => !skipKeys.includes(key))
		},
	},
	props: ["state"]
})

Vue.component('parse-view-chancerybb', {
	template: `
			<div>some blackboard </div>
	`,
	props: ["bb"]
})
Vue.component('parse-view', {
	template: `
	<div class="section section-parseview">
		

		<div v-if="app.keyData.key !== undefined">
			Parsing <div class="ui-tile" :style="app.keyData.getKeyStyle(app.keyData.key)">{{app.keyData.key}}</div>:
		</div>

		<!-- what are we viewing here? -->
		<!-- One thing, or many? -->
		<!-- States or grammar rules or blackboards? -->
		
		<tracery-ruleset v-if="mode==='grammar'" :ruleset="viewObject" />
		<parse-view-chancerystate v-else-if="mode==='states'" :state="viewObject" />
		<parse-view-chancerybb v-else-if="mode==='initialBlackboard'" :bb="viewObject" />
	
		<div v-else class="error">unknown parse mode: {{mode}}</div>

	</div>`,
	computed: {
		
		viewObject() {
			return app.keyData.getKeyObject()[app.keyData.key]
		},
		
		mode() {
			return app.keyData.keySet || "grammar"
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