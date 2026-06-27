
let valueNames = ["blink","perspective", "mouth", "mouthWidth", "eyeFuzz", "agitation", "speed", "volume", "rainbow", "opacity", "hue", "planet", "firefly"]

let settings = {
	volume: 0.7,
	speed:1,
	transitionSpeed: .7,
	// Chance (0..1) that any given spoken word triggers a voice chirp. Chirping
	// every word was too chaotic — keep it occasional. Tune to taste.
	chirpChance: 0.25,
}

// --- Conversation memory (2026-06-27) ----------------------------------------
// The Chancery engine keeps no history: it stores only the last matched input
// (robe.blab) and wipes activeInput on every transition. To make Mima feel like
// she's tracking where the conversation is at, we record a small mem.* namespace
// on the blackboard each time she enters a *topic* state. Grammar reads it back
// via #/mem/.../# (e.g. #/mem/echoes/1#) and value-gated exits branch on it
// (e.g. "mem.visits.cwhere > 1 ->cwhereReturn").
//
// Counts are stored NUMERIC — they're only ever used in exit comparisons; a
// number thrown into Tracery text breaks path resolution (see the robe.tries
// note in userInput). Echoes (the player's own words) are STRINGS, safe to weave
// into lines.
let mimaMemory = {
	// Hub / transition / beat-continuation states that shouldn't count as topics.
	structural: new Set(["origin", "rest", "muse", "hear", "invite", "selfaware",
		"driftidle", "idle", "cryo", "pause", "lull", "discombobulate"]),

	// Collapse multi-beat chains onto one topic label, so a whole exchange counts
	// once and a return is detected on the entry state's name. Extend as chains grow.
	topicOf: {
		cwhereDeep: "cwhere", chowlongDeep: "chowlong", cnowDeep: "cnow",
		// Return states count as their base topic, so a comeback keeps climbing
		// the same visit counter rather than spawning a parallel one.
		cwhereReturn: "cwhere", klostReturn: "klost", kmatterReturn: "kmatter",
		klostDeep: "klost", kmatterDeep: "kmatter", kpurposeDeep: "kpurpose",
	},

	record(bb, stateID) {
		if (!bb || this.structural.has(stateID)) return
		let topic = this.topicOf[stateID] || stateID
		let get = (path, dflt) => { try { return bb.getAtPath(path) } catch (e) { return dflt } }

		// Length of the topical conversation so far.
		bb.setAtPath(["mem", "turn"], (get(["mem", "turn"], 0) || 0) + 1)

		// Per-topic visit count (numeric — drives "mem.visits.<topic> > 1" exits).
		bb.setAtPath(["mem", "visits", topic], (get(["mem", "visits", topic], 0) || 0) + 1)

		// Topic trail.
		let last = get(["mem", "lastTopic"], undefined)
		if (last !== undefined && last !== topic)
			bb.setAtPath(["mem", "priorTopic"], last)
		bb.setAtPath(["mem", "lastTopic"], topic)

		// Rolling ring of the last few player phrases, so she can reference
		// something said earlier, not just the immediately-prior robe.blab. Only
		// push a genuinely new phrase (dedupe against the most recent echo).
		let blab = get(["robe", "blab"], undefined)
		if (typeof blab === "string" && blab.length && blab !== get(["mem", "echoes", "0"], undefined)) {
			bb.setAtPath(["mem", "echoes", "2"], get(["mem", "echoes", "1"], ""))
			bb.setAtPath(["mem", "echoes", "1"], get(["mem", "echoes", "0"], ""))
			bb.setAtPath(["mem", "echoes", "0"], blab)
		}
	}
}

let app = {
	devMode: false,
	time: {},
	blackboard: undefined,
	face: new Face(),

	isActive: false,
	isThinking: false,       // true while Mima formulates a reply -> chat shows the listening dots
	particleMode: "chaos",   // which background formation drawSpace shows (chaos|planet|firefly)
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

	// Called on each keypress from the chat input (see chat-window @typing). Spawns
	// a small burst of particles that rise from the caret's screen position toward
	// the face, and pulses micro-agitation so Mima visibly reacts to the user
	// composing. Suppressed while a calm formation is showing (planet/firefly), so
	// typing doesn't scatter particles across the constellation or fireflies.
	userTyping({ clientX, clientY } = {}) {
		const now = Date.now()
		if (now - (app._lastTypingPulse || 0) >= 350) {
			app._lastTypingPulse = now
			app.flareAgitation(0.35)
		}
		const f = app.face
		if (!f || !f._canvas || !clientX) return
		// Match the touch-spawn gate (face.update): no new particles once the field
		// has settled into a planet constellation or firefly storytime.
		if (app.particleMode && app.particleMode !== 'chaos') return
		const pos = f.clientToCanvas(clientX, clientY)
		const z2  = f._z2 || 1
		const tx  = pos.x / z2
		const ty  = pos.y / z2
		for (let i = 0; i < 2; i++) {
			let p     = new TouchParticle(tx + (Math.random() - 0.5) * 28, ty + (Math.random() - 0.5) * 12)
			p.vx      = (Math.random() - 0.5) * 70
			p.vy      = -140 - Math.random() * 90
			p.age     = 0
			f.typeParticles.push(p)
		}
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

				// Record the conversation arc (turn count, per-topic visits, topic
				// trail, recent player phrases) so Mima can notice returns and refer
				// back to earlier moments. See mimaMemory above.
				mimaMemory.record(app.instance.blackboard, stateID)
				// One fade sound per state change, so every transition has an
				// audible whoosh (see playFade in sound.js).
				playFade()

				// "origin" is the first state Chancery enters (see Chancery.start);
				// the old "welcome" state was removed in the mimamap rewrite.
				// startSoundtrack() guards against double-play, so re-entering origin is safe.
				if (stateID === "origin")
					startSoundtrack()

				// Discombobulation is her most agitated act — big colour flare, plus
				// a really low sine that swells in underneath (see playDiscombobulate).
				if (stateID === "discombobulate") {
					app.bumpAgitation(3)
					playDiscombobulate()
				}

				// worldgaze summons a fresh procedural planet (see planet.js); its
				// onEnter raises planet=1 so the facebox fades fully out. Any other
				// state eases the planet back down so it never lingers.
				if (stateID === "worldgaze" || stateID === "worldgaze2") {
					if (typeof planet !== "undefined") planet.summon()
				} else if (app.valueTracker.planet) {
					app.valueTracker.planet.set(0, app.time.current, 2.0)
				}

				// The number game (numberGame.js) lives in JS: entering its state rolls
				// a fresh secret; entering anything else deactivates it so input routing
				// (see userInput) returns to normal Chancery handling.
				if (typeof numberGame !== "undefined") {
					if (stateID === "numbergame") numberGame.start(50)
					else numberGame.active = false
				}

				// Background particle formation: planet mode -> a still star constellation,
				// storytime (reverie) -> drifting fireflies, anything else -> roaming chaos.
				// drawSpace (face.js) crossfades between them — the old formation fades out
				// and the new one fades in, so there's no frantic in-between movement.
				if (stateID === "worldgaze" || stateID === "worldgaze2") app.particleMode = "planet"
				else if (stateID === "reverie" || stateID === "reverie2") app.particleMode = "firefly"
				else app.particleMode = "chaos"

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
						app.isThinking = false   // her reply has arrived -> hide the listening dots
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

		const startChat = () => {
			clearInterval(app.tickInterval)
			// Immediate audible feedback that the press landed: a fade (not a chirp),
			// fired once the fades are loaded — see fadeWhenReady in sound.js.
			fadeWhenReady()
			app.instance.start()
			synthBed.start()

			let blinkCount = 0
			let idlePulseCount = 0
			let nextIdlePulse = 150 + Math.floor(Math.random() * 200)
			app.tickInterval = setInterval(() => {
				app.instance.tick()
				blinkCount++
				idlePulseCount++

				if (blinkCount > 50 + 60*Math.random()) {
					app.blink()
					blinkCount = 0
				}

				// During quiet listening states, occasionally pulse the face so she
				// feels present even when nothing is being said. NOTE: the Chancery
				// instance exposes the current state as `stateID` (not `currentState`).
				if (idlePulseCount >= nextIdlePulse) {
					const listeningStates = ["rest", "hear", "origin"]
					if (listeningStates.includes(app.instance.stateID)) {
						app.flareAgitation(0.5 + Math.random() * 0.4)
					}
					idlePulseCount = 0
					nextIdlePulse = 150 + Math.floor(Math.random() * 250)
				}
			}, 100)
		}

		if (Pizzicato.context.state === 'running') {
			startChat()
		} else {
			Pizzicato.context.resume().then(startChat)
		}
	},

	userInput(data) {
		let msg = {
			owner: "user",
			text: [data]
		}

		// Send it to the chat
		app.messages.push(msg)

		// Show the listening indicator while Mima formulates her response (cleared
		// when her line arrives via onOutput / say).
		app.isThinking = true

		// Ambient flare while she prepares her answer (swells in, doesn't snap on);
		// engaging cools the "being ignored" spiral.
		app.flareAgitation(3)
		app.ignoredCount = 0

		// Number game: while Mima is holding a number (see numberGame.js), numeric
		// guesses are answered here in JS — the Chancery engine can't compare values.
		// Reset the `numbergame` state's dwell timer on each guess (its wait: exit is
		// an idle timeout, not a play timeout). A win hands control back to Chancery
		// via a sentinel input the state matches (#numdone# -> numberwon). Non-numeric
		// input (e.g. "i give up") falls through to Chancery's exits below.
		if (typeof numberGame !== "undefined" && numberGame.active) {
			let m = String(data).match(/\d+/)
			if (m) {
				let r = numberGame.guess(parseInt(m[0], 10))
				// Store as a STRING: grammar path resolution (#/robe/tries#) runs the
				// value through parseTraceryRule, which throws on a raw number and would
				// leak the literal token "((/robe/tries))" into Mima's line.
				if (r.status === "found")
					app.blackboard.setAtPath(["robe", "tries"], String(numberGame.attempts))
				app.say(r.text)
				app.chips = r.chips
				app.instance.timeEnteredState = app.instance.currentTime
				if (r.status === "found")
					app.instance.input({ owner: "user", text: ["numberfound"] })
				return
			}
		}

		// Send it to the chancery instance
		app.instance.input(msg)
	},

	// Push a bot line and speak it OUTSIDE the Chancery flow — used by JS minigames
	// (numberGame) that answer the player directly. Mirrors the onOutput handler;
	// flattens Tracery tokens (#smek# etc.) through the chancery grammar context so
	// Mima's voice stays consistent.
	say(raw) {
		app.isThinking = false   // a direct line is being spoken -> hide the listening dots
		let output = app.instance.context.flatten(raw)
		app.messages.push({ owner: "bot", text: [output] })
		return app.speakWords(output)
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
		<chat-window v-if="app.isActive" :messages="app.messages" :chips="app.chips" :showListening="app.isThinking" @sendInput='app.userInput' @typing='app.userTyping' />

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
