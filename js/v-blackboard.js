Vue.component('bb-viewitem', {
	template: `
		<div v-if="item===undefined" class="error">EMPTY</div>
		<div v-else class="blackboard-item">
			<header v-show="selected"><div class="ui-label">{{item.type}}</div><div v-for="key in path" class="ui-minikey">{{key}}</div></header>
			
			<div class="content blackboard-obj" v-if="item.type === 'array'">

				<bb-viewitem v-for="(child,index) in item.value" :item="child" :key="index" :path="path.concat([index])" :blackboard=blackboard /> 
			</div>
			<div class="content blackboard-obj" v-else-if="item.type === 'object'">
				<div class="data-row" v-for="(child,index) in item.value" :key="index" >
					<div class="data-label">{{index}}</div>
					<div class="data-value">	
						<bb-viewitem :item="child"  :path="path.concat([index])" :blackboard=blackboard /> 
					</div>
				</div>
			</div>

			<div v-else class="tracery-const">
				{{item.value}}
			</div>
		</div>
	`,
	data() {
		return {
			selected: false
		}
	},
	props: ["blackboard", "item", "path"]
})

Vue.component('blackboard-view', {
	template: `
		<div class="blackboard panel">
			<h2>blackboard</h2>
			<bb-viewitem :blackboard="blackboard" :item="blackboard.board" :path="[]" />
		</div>
	`,
	props: ["blackboard"]
})