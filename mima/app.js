
let valueNames = ["blink","perspective", "mouth", "mouthWidth", "eyeFuzz", "agitation", "speed", "volume", "rainbow", "opacity", "hue"]

let settings = {
	volume: 0.7,
	speed:1,
	transitionSpeed: .7,
	// Chance (0..1) that any given spoken word triggers a voice chirp. Chirping
	// every word was too chaotic — keep it occasional. Tune to taste.
	chirpChance: 0.25,
}

let app = {
	devMode: false,
	time: {},
	blackboard: undefined,
	face: new Face(),

	isActive: false,
	valueTracker: {},
	values: {
	},

	// --- Live agitation (2026-06-21) ------------------------------------------
	// The per-state `agitation=` authored in the mimamap is a *resting floor*.
	// On top of it we run transient "energy" that spikes on events (input flare,
	// speaking, discombobulation, being ignored) and decays back to calm. The
	// renderer (face.js) reads the combined value as app.values.agitation and uses
	// it to introduce colour + drift her near/far. Tuned by half-life below.
	liveAgitation: 0,    // fast — drives face colour + transparency
	swellAgitation: 0,   // slow — gentle swell for the roaming particles
	agitEnergy: 0,
	flarePending: 0,     // energy waiting to be released gradually (ambient flare)
	ignoredCount: 0,

	// Inject a burst of agitation energy immediately (speaking, discombobulation).
	bumpAgitation(amount) {
		app.agitEnergy += amount
	},

	// Inject energy that swells in over ~0.45s rather than snapping on — used for
	// user input, so Mima flares up ambiently instead of flashing on.
	flareAgitation(amount) {
		app.flarePending += amount
	},

	// Ease the live value toward (state floor + decaying energy). Called per frame.
	// Exponential (frame-rate independent) smoothing — no hard snap when a frame
	// hitches, which is what made the transparency jump. Short half-life keeps her
	// facial transparency snappy; the particles ride a much slower swell.
	updateAgitation(t) {
		let dt = t.elapsed || 0.016
		let floor = app.values.agitation || 0          // authored per-state resting level

		// Bleed any pending flare into energy gradually (~0.45s rise) so input swells
		// in ambiently rather than flashing on.
		let release = app.flarePending * (1 - Math.pow(0.5, dt / 0.45))
		app.agitEnergy += release
		app.flarePending -= release

		app.agitEnergy *= Math.pow(0.5, dt / 0.8)       // ~0.8s half-life — quick fade-out
		let target = floor + app.agitEnergy
		app.liveAgitation  += (target - app.liveAgitation)  * (1 - Math.pow(0.5, dt / 0.10))  // ~0.1s
		app.swellAgitation += (target - app.swellAgitation) * (1 - Math.pow(0.5, dt / 1.20))  // ~1.2s
		app.values.agitation = app.liveAgitation        // what the face renders from
	},

	blink() {
		app.animateValueTo("blink", 1, .1)
			setTimeout(() => {

			app.animateValueTo("blink", 0, .3)
		}, Math.random()*400 + 100)
	},

	// Animate the face speaking and play sounds
	speakWords(output, progress) {


		let words = output.split(" ")

		// Guarantee at least one chirp per utterance (it's eerie when Mima speaks
		// in silence) by forcing a chirp on one random word, while the rest stay
		// occasional. So: always at least one, never every word.
		let guaranteedChirp = Math.floor(Math.random() * words.length)

		let start = new Promise((resolve) => {
			setTimeout(() => {
				resolve()
			}, 0)
		})
		words.forEach((word,index) => {
			start = start.then(() => {
				return new Promise((resolve) => {
					let wordLength = word.length*40 + 100

					// Elongate the last word a bit
					if (index === words.length - 1)
						wordLength *= 1.8


					// Resolve when the word is done
					setTimeout(() => {
						// At least one chirp per line (the guaranteed word), plus the
						// occasional extra — but never every word (too chaotic).
						if (index === guaranteedChirp || Math.random() < settings.chirpChance)
							randomChirp(wordLength)
						app.face.setWord(word, wordLength)
						resolve()
					}, wordLength)

				})
			})
		})
		return start

	},

	instance: new Chancery({
		map:testMimaMap,
		metadata:{title:"mima"},
		handlers: {
			onEnterState: (stateID, lastStateID) => {
				console.log("ENTER STATE HANDLER:" + stateID)
				// One fade sound per state change, so every transition has an
				// audible whoosh (see playFade in sound.js).
				playFade()

				// "origin" is the first state Chancery enters (see Chancery.start);
				// the old "welcome" state was removed in the mimamap rewrite.
				// startSoundtrack() guards against double-play, so re-entering origin is safe.
				if (stateID === "origin")
					startSoundtrack()

				// Discombobulation is her most agitated act — big colour flare.
				if (stateID === "discombobulate")
					app.bumpAgitation(3)

				// Calling into the void and being ignored escalates her agitation;
				// each idle utterance pushes harder until the player engages.
				const idleStates = ["driftidle", "idle", "cryo", "pause"]
				if (idleStates.includes(stateID)) {
					app.ignoredCount++
					app.bumpAgitation(Math.min(3, 0.6 * app.ignoredCount))
				}
			},
			onOutput: ({output, progress}) => {

				// A beat before a question — so after a string of statements Mima
				// pauses, then asks. Applies to any line ending in '?'.
				let pre = /\?\s*$/.test(output) ? 700 : 0

				return new Promise((resolve) => {
					setTimeout(() => {
						app.messages.push({
							owner: "bot",
							text: [output]
						})
						app.speakWords(output, progress).then(resolve)
					}, pre)
				})

			},
			onChips: (chips) => {
				app.chips = chips
			},
		},
		transitionSpeed: settings.transitionSpeed
	}),

	messages: [],
	chips: [],
	initUI() {

		new Vue({
			template: `<div class="main-section" v-if="app.devMode">
				DEV TOOLS
				<button @click="app.start()">RESTART</button>
				<chancery-statemap :instance="app.instance" :app="app" />
				<chancery-exitmap :instance="app.instance" :app="app" />
			</div>`,
			el: '#dev0',
			data: {app:app}
		})

		new Vue({
			template: `<div class="main-section" v-if="app.devMode">
				DEV TOOLS
				<chancery-actionqueue :instance="app.instance" :app="app" />
				<blackboard-view :blackboard="app.blackboard" />
			</div>`,
			el: '#dev1',
			data: {app:app}
		})
	},

	start(e) {
		app.isActive = true
		initSounds()
		// Immediate audible feedback that the press landed: a fade (not a chirp),
		// fired as soon as the fades are loaded — see fadeWhenReady in sound.js.
		fadeWhenReady()
		// Start the generative drone bed (see synthbed.js).
		synthBed.start()
		// Clear any existing loop
		clearInterval(app.tickInterval)

		// Send the "Hello?" press as a word particle that shoots up from the press
		// point into the centre where Mima arrives (instead of a chat bubble). Mima's
		// scripted "Mima is present" comes from entering origin once the arrival ends.
		let f = app.face
		let from = (e && f._canvas) ? f.clientToCanvas(e.clientX, e.clientY) : { x: 0, y: f._canvasH * 0.4 }
		f.particles.push(new Particle({
			word: "Hello?",
			lifespan: 2.6,
			originX: from.x,
			originY: from.y,
			target: { x: 0, y: -f._canvasH * 0.09 }
		}))

		// Replay the arrival sequence (particles gather, then the face fades up).
		app.face.arrivalStart = undefined
		app.blinkCount = 0

		// Hold the conversation until the face has arrived, so her first words land
		// with the moment of arrival rather than over an empty frame.
		setTimeout(() => {
			app.instance.start()
			app.tickInterval = setInterval(() => {
				app.instance.tick()
				app.blinkCount++
				if (app.blinkCount > 50 + 60*Math.random()) {
					app.blink()
					app.blinkCount = 0
				}
			}, 100)
		}, app.face.arrivalDur * 1000)
	},

	userInput(data) {
		let msg = {
			owner: "user",
			text: [data]
		}

		// Send it to the chat
		app.messages.push(msg)

		// Ambient flare while she prepares her answer (swells in, doesn't snap on);
		// engaging cools the "being ignored" spiral.
		app.flareAgitation(3)
		app.ignoredCount = 0

		// Send it to the chancery instance
		app.instance.input(msg)
	},

	animateValueTo(name, val, dt) {
		if (app.valueTracker[name] === undefined)
			console.warn("No value", name)

		app.valueTracker[name].set(val, app.time.current, dt)
	},



	init() {

		valueNames.forEach((name) => {
			app.valueTracker[name] = new LerpValue()
			app.values[name] = 0
		})





		app.blackboard = app.instance.blackboard
		app.blackboard.onModify((path, value) => {

			let key = path[0]
			if (app.valueTracker[key] !== undefined) {
				app.valueTracker[key].set(value, app.time.current, .5)
			}

		})

		function createProcessing() {
			document.getElementById("bot").innerHTML = '';

			utilities.createProcessing({
				element:"bot",
				onUpdate: t => {
					valueNames.forEach(key => {
						app.values[key] = app.valueTracker[key].get(t.current)
						// console.log(key, app.values[key])
					})

					// Override the lerped agitation with the live event-driven value.
					app.updateAgitation(t)

					app.face.update(t)

				},
				onDraw: (g, t) => {

					// Keep the canvas black until the player presses Start; only then
					// does Mima's face (eyes/features now, coloured plane as agitation
					// rises) appear.
					// Cap the per-frame black fade so there's always a bit of particle
					// trailing (a gentle blur over everything), even at low speed.
					g.fill(0, 0, 0, app.isActive ? Math.min(0.15, 0.3/(app.values.speed + 1)) : 1)
					g.rect(-g.width/2, -g.height/2, g.width, g.height)
					if (app.isActive)
						app.face.draw(g, t)
				},
				onStart: (g, t) => {
					app.processing = g
					app.time = t

					console.log("Create processing", g.width, g.height)
					app.valueTracker.perspective.set(2, t.current, .1)
					app.valueTracker.opacity.set(10, t.current, .1)

					const canvas = document.querySelector('#bot canvas')
					if (canvas) app.face.registerCanvas(canvas, document.getElementById('mima-app'))
				}
			});
		}

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', () => {
				const kbHeight = Math.max(0, window.innerHeight - window.visualViewport.height - 30)
				const bot = document.getElementById('bot')
				bot.style.transition = 'transform 0.35s ease-out'
				bot.style.transform = kbHeight > 0 ? `translateY(${Math.min(kbHeight * 0.45, 200)}px)` : ''
			})
		}

		window.addEventListener("resize", () => {
			// TODO: can't get resizing to work
			// if (app.time.frame > 10) {
			// 	let botDiv = document.getElementById("bot")
			// 	console.log(botDiv)
			// 	console.log("resize", botDiv.clientWidth, botDiv.clientHeight)

			// 	app.processing.size(botDiv.width, botDiv.height);
			// }
		});


		createProcessing()

		// Live face-box tweak panel — flip app.devMode to true to bring it back.
		if (app.devMode) createFaceTweakPanel()

		app.initUI()

		// if (app.devMode)
		// 	app.start()

	}
}


app.init()


// --- Quick-and-dirty live tweak panel for the face box (2026-06-21) -----------
// Sliders nudge the coloured box around her face and resize it live; the readout
// prints values to paste back into the Face constructor (boxW/boxH/boxOffX/boxOffY).
// Remove this call in init() to drop it.
function createFaceTweakPanel() {
	let f = app.face
	let panel = document.createElement("div")
	panel.style.cssText = "position:fixed;top:8px;right:8px;z-index:99999;background:rgba(0,0,0,.72);" +
		"color:#fff;font:11px monospace;padding:8px 10px;border-radius:6px;width:190px;user-select:none"
	panel.innerHTML = "<b>face box</b>"

	let readout = document.createElement("div")
	readout.style.cssText = "margin-top:6px;cursor:pointer;opacity:.8"
	readout.title = "click to copy"
	let refresh = () => {
		readout.textContent = `boxW:${f.boxW|0} boxH:${f.boxH|0} boxOffX:${f.boxOffX|0} boxOffY:${f.boxOffY|0}`
	}
	readout.onclick = () => navigator.clipboard && navigator.clipboard.writeText(readout.textContent)

	;[["boxOffX",-300,300],["boxOffY",-300,300],["boxW",50,900],["boxH",50,900]].forEach(([key,min,max]) => {
		let row = document.createElement("label")
		row.style.cssText = "display:block;margin:5px 0 0"
		row.textContent = key
		let input = document.createElement("input")
		input.type = "range"; input.min = min; input.max = max; input.step = 1; input.value = f[key]
		input.style.cssText = "width:100%;margin-top:2px"
		input.addEventListener("input", () => { f[key] = parseFloat(input.value); refresh() })
		row.appendChild(input)
		panel.appendChild(row)
	})

	panel.appendChild(readout)
	refresh()
	document.body.appendChild(panel)
	app._tweakPanel = panel
}

// Secret debug toggle: Ctrl+Shift+M flips devMode (face tweak panel + chancery
// dev tools). Unlikely to fire while typing in the chat.
function toggleDevMode() {
	app.devMode = !app.devMode
	if (app.devMode) {
		if (!app._tweakPanel) createFaceTweakPanel()
		else app._tweakPanel.style.display = ""
	} else if (app._tweakPanel) {
		app._tweakPanel.style.display = "none"
	}
	console.log("devMode:", app.devMode)
}

window.addEventListener("keydown", e => {
	if (e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
		e.preventDefault()
		toggleDevMode()
	}
})


new Vue({
	template: `
	<div id="mima-controls">
		<chat-window v-if="app.isActive" :messages="app.messages" :chips="app.chips" @sendInput='app.userInput' />

		<div v-else id="start-controls">
		<button @click="app.start">Hello?</button>
		</div>
	</div>

	`,
	el: '#chat',
	methods: {

	},
	data: {
		app:app
	}

})
