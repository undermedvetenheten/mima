
Vue.component('json-editor', {
	template: `
	<div class="section section-jsoneditor">
	<div class="header"></div>

	<div class="content" ref="jsoneditor">
	
	</div>
	
	</div>`,

	methods: {
		setCurrentPath() {
			let key = undefined
			// Get the last key that this is before the cursor
			for (var i = 0; i < this.keyIndex.length; i++) {
				if (this.keyIndex[i].index <= this.cursor)
					key = this.keyIndex[i]
			}

			
			let path = key!==undefined?key.path:[]
			
			if (path.join("") !== this.path.join("")) {
				this.path = path
				this.$emit("pathChanged", path)
			}
		},

		rebuildIndex() {
			
			this.keyIndex = diagramJSON(this.text).keys
		},

			// Set this location to the key 
			setCaretToCurrentPath() {
				let keyEntry = this.keyIndex.filter(entry => entry.path.join(".") === this.keyPath.join("."))[0]
			// Get the index of this key, and scroll to it
			
			if (keyEntry) {
				if (this.textField.is(":focus")) {
					// console.log("Already has focus!")
				} else {
					let caretPos = keyEntry.index + 1
					
					// Magic to do the scroll
					this.textField.focus()
					this.textField[0].setSelectionRange(caretPos, caretPos)
					this.textField.blur()
					this.textField.focus()
				}
			} else {

			}
		},
		
	},



	mounted() {



		let options = {
			modes: ["text", "code", "tree"],
			
			onChange: () => {
				let newJSON = this.editor.get()
				this.$emit("jsonChanged", newJSON)
				this.rebuildIndex()
				// rebuild the 
			}
		}
		this.editor = new JSONEditor(this.$refs.jsoneditor, options)
		this.editor.set(this.script)

		this.textField = $(".jsoneditor-text")
		this.text = this.textField.val()
		
		// Allow users to type tab
		// TODO: does this mess with accessibility?
		// https://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
		this.textField.on("keydown", function(e) {
			var keyCode = e.keyCode || e.which;
			
			if (keyCode == 9) {
   				e.preventDefault();
    			var start = this.selectionStart;
				var end = this.selectionEnd;

				// set textarea value to: text before caret + tab + text after caret
				$(this).val($(this).val().substring(0, start)
					+ "\t"
					+ $(this).val().substring(end));

				// put caret at right position again
				this.selectionStart =
				this.selectionEnd = start + 1;
			}
		})
		
		this.textField.on("mouseup keyup", (e) => {
			this.text = this.textField.val()
			this.cursor = this.textField[0].selectionStart
			this.setCurrentPath()
		})

		this.rebuildIndex()
		this.setCaretToCurrentPath()

	},



	watch: {
		keyPath() {
			this.setCaretToCurrentPath()
		},
		script() {
			if (this.textField.is(":focus")) {
				// console.log("Already has focus!")
			} else {
				console.log("NEW SCRIPT")

				// Receive a new script
				this.editor.set(this.script)
				this.text = this.textField.val()
				this.rebuildIndex()
				this.setCaretToCurrentPath()
			}
			
		}
	},
	data() {
		return {
			cursor: 0,
			path: [],
			keyIndex: [],
			activeScript: {}
		}
	},
	
	props: {
		
		script: {
			type: Object,
			required: true
		},
		keyPath: {
			type: Array,
		},
	},
})