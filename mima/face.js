function Particle({word, lifespan, originX = 0, originY = 0, lean = 0, target = null}) {
	this.word = word
	this.target = target
	if (target) {
		// Targeted travel — the "Hello?" opener flying from the press point to centre.
		this.p = new Vector(originX, originY)
		this.startP = new Vector(originX, originY)
		this.v = new Vector(0, 0)
	} else {
		// Emit from around Mima's face (origin passed in from setWord), floating up.
		// `lean` is the emission angle from vertical, swept like a pendulum in setWord;
		// only a touch of random spread so the direction reads as a sweep, not noise.
		this.p = new Vector(originX + (Math.random() - 0.5) * 90, originY + (Math.random() - 0.5) * 30)
		let speed = 90 + Math.random() * 90
		let a = lean + (Math.random() - 0.5) * 0.25
		this.v = new Vector(Math.sin(a) * speed, -Math.cos(a) * speed)
	}
	this.radius = 1
	this.age = 0
	this.lifespan = lifespan
	this.drag = .9

}

Particle.prototype.draw = function(g) {
	g.fill(1, 0, 1, 1 - this.age)

	if (this.word) {
		g.textSize(20*this.radius)
		g.text(this.word, this.p.x, this.p.y, this.word)
	}
}


Particle.prototype.update = function(t) {
	if (this.start === undefined) {
		this.start = t.current
	}
	this.age = (t.current - this.start)/this.lifespan

	if (this.target) {
		// Ease from the press point to the target (centre) over the lifespan.
		let k = Math.min(1, this.age)
		k = k*k*(3 - 2*k)
		this.p.x = this.startP.x + (this.target.x - this.startP.x)*k
		this.p.y = this.startP.y + (this.target.y - this.startP.y)*k
	} else {
		this.p.addMultiple(this.v, t.elapsed)
		this.v.mult(Math.pow(this.drag,t.elapsed*10))
	}
}



const FM_CELLS = 20
const FM_RANGE = 260

function FlowMap() {
	this.vx = new Float32Array(FM_CELLS * FM_CELLS)
	this.vy = new Float32Array(FM_CELLS * FM_CELLS)
}

FlowMap.prototype._toCell = function(x, y) {
	const cx = Math.round((x + FM_RANGE) / (FM_RANGE * 2) * (FM_CELLS - 1))
	const cy = Math.round((y + FM_RANGE) / (FM_RANGE * 2) * (FM_CELLS - 1))
	return [Math.max(0, Math.min(FM_CELLS - 1, cx)), Math.max(0, Math.min(FM_CELLS - 1, cy))]
}

FlowMap.prototype.paint = function(x, y, vx, vy) {
	const [cx, cy] = this._toCell(x, y)
	for (let dx = -2; dx <= 2; dx++) {
		for (let dy = -2; dy <= 2; dy++) {
			const nx = cx + dx, ny = cy + dy
			if (nx < 0 || nx >= FM_CELLS || ny < 0 || ny >= FM_CELLS) continue
			const w = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy) / 2.5)
			const i = ny * FM_CELLS + nx
			this.vx[i] = this.vx[i] * 0.7 + vx * w * 0.3
			this.vy[i] = this.vy[i] * 0.7 + vy * w * 0.3
		}
	}
}

FlowMap.prototype.sample = function(x, y) {
	const [cx, cy] = this._toCell(x, y)
	const i = cy * FM_CELLS + cx
	return [this.vx[i], this.vy[i]]
}

FlowMap.prototype.decay = function(elapsed) {
	const d = Math.pow(0.5, elapsed / 8)
	for (let i = 0; i < this.vx.length; i++) {
		this.vx[i] *= d
		this.vy[i] *= d
	}
}

function TouchParticle(x, y) {
	this.x = x
	this.y = y
	this.vx = (Math.random() - 0.5) * 30
	this.vy = (Math.random() - 0.5) * 30
	this.hue = Math.random()
	this.age = 0
}

function Face() {
	this.width  = 400
	this.height = 400
	this.rows = 16       // 400/16 = 25 → square grid cells
	this.columns = 16
	// Facial features keep their ORIGINAL size, independent of the box/grid — the
	// box can grow without warping the eyes/nose/mouth. (Was 300/13 × 400/16.)
	this.pixelW = 300/13   // ≈ 23.08 — original feature unit (do NOT derive from width)
	this.pixelH = 400/16   // = 25     — original feature unit

	// Coloured box placement/size — live-tweakable (see createFaceTweakPanel in
	// app.js). Independent of the feature units; offset nudges the box around her
	// face. Bake the values you like back into boxW/boxH/boxOffX/boxOffY here.
	this.boxW    = 420   // tuned via the live panel (Ctrl+Shift+M)
	this.boxH    = 440
	this.boxOffX = 0
	this.boxOffY = 28


	this.detailColor = new KColor(.5, .6, .6)
	// Start colour: #f1dddc / rgb(241,221,220) ≈ HSL(0.01, 0.43, 0.90) — a pale blush.
	// h is overridden each frame by the state's `hue`; s + alpha by agitation in
	// drawFaceBG; l (lightness) persists from here.
	this.faceColor = new KColor(0.01, 0.43, 0.90)

	// --- Agitation-driven presence (2026-06-21) -------------------------------
	// Mima is a serene, near-transparent presence at rest. Colour and the rainbow
	// shimmer are *introduced by agitation*, not by the per-state `opacity`/`rainbow`
	// any more — those still vary the palette/flavour, but agitation governs how much
	// of it actually shows. Transparency stays low throughout: agitation flares
	// colour, not solidity. Live agitation is driven in app.js (input flare, speaking,
	// discombobulation, ignored-loop) and read here as app.values.agitation.
	this.agitFull   = 2.5    // agitation value treated as "fully flared"
	this.baseAlpha  = 0.0    // resting face opacity — fully transparent (only features show)
	this.flareAlpha = 0.22   // extra opacity added at full agitation
	this.baseSat    = 0.0    // resting saturation — colourless serenity
	this.flareSat   = 1.0    // saturation introduced at full agitation
	this.shimmer    = 0.18   // rainbow hue-jiggle amplitude at full agitation
	this.wobbleAmp  = 0.16   // how far agitation drifts her near/far ("at a loss")

	// --- Arrival sequence (2026-06-21) ----------------------------------------
	// On Start, the particles sweep in from off-frame and gather; then Mima's face
	// fades up — a moment of arrival. Progress is driven from arrivalStart (set on
	// the first drawn frame after Start, reset by app.start()).
	this.arrivalDur = 3.2          // seconds for the whole arrival
	this.arrivalStart = undefined  // set on first active frame
	this._arrFace = 0              // face fade-in (0..1)
	this._arrParticleA = 0         // particle fade-in (0..1)
	this._arrRadius = 1            // particle radius multiplier (>1 = off-frame)

	this.particles = []

	this.touch = null
	this.blinkL = 0
	this.blinkR = 0
	this._z2 = 1
	this._canvasH = 600
	this.touchParticles = []
	this.typeParticles = []   // particles rising from the chat caret as the user types (see app.userTyping)
	this._touchSpawnTimer = 0
	this.flowmap = new FlowMap()
	this._prevTouchSpace = null
	this._pointerId = null
}

// Say s, and return a promise
Face.prototype.say = function(s) {
	let count = 0
	let loop = setInterval( () => {
		let sound = getRandom(app.sounds)
		sound.play()
		count++
		if (count > 5)
			clearInterval(loop)
	}, 200)


	
	// Add this to the queue
	return new Promise((resolve, reject) => {

	})
}

Face.prototype.update = function(t) {
	this.particles.forEach(p => p.update(t))
	this.particles = this.particles.filter(p => p.age === undefined || p.age < 1)

	let blinkLTarget = 0, blinkRTarget = 0
	if (this.touch) {
		const zs = 1 / (app.values.perspective * 0.7 + 0.3)
		const tx = this.touch.x / zs
		const planetAmt = Math.max(0, Math.min(1, app.values.planet || 0))
		const ty = (this.touch.y + this._canvasH * 0.09 - this._canvasH * 0.12 * planetAmt) / zs
		const hitR = this.pixelW * 3
		const eyeY = this.pixelH * -2.5
		if (Math.abs(ty - eyeY) < hitR) {
			if (tx > 0 && Math.abs(tx - this.pixelW * 2.5) < hitR) blinkRTarget = 1
			if (tx < 0 && Math.abs(tx + this.pixelW * 2.5) < hitR) blinkLTarget = 1
		}
	}
	this.blinkL += (blinkLTarget - this.blinkL) * 0.15
	this.blinkR += (blinkRTarget - this.blinkR) * 0.15

	this.flowmap.decay(t.elapsed || 0.016)

	const z2 = this._z2 || 1
	if (this.touch) {
		const tx = this.touch.x / z2
		const ty = this.touch.y / z2

		// Paint flowmap from finger velocity
		if (this._prevTouchSpace) {
			const dt = t.elapsed || 0.016
			this.flowmap.paint(tx, ty,
				(tx - this._prevTouchSpace.x) / dt * 0.1,
				(ty - this._prevTouchSpace.y) / dt * 0.1)
		}
		this._prevTouchSpace = {x: tx, y: ty}

		// Spawn touch particles — but not once the field has settled into a planet
		// constellation or firefly storytime; touch shouldn't scatter new particles
		// across those calm formations.
		let formMode = app.particleMode && app.particleMode !== 'chaos'
		this._touchSpawnTimer += t.elapsed
		if (!formMode && this._touchSpawnTimer > 0.12) {
			this._touchSpawnTimer = 0
			this.touchParticles.push(new TouchParticle(
				tx + (Math.random() - 0.5) * 70,
				ty + (Math.random() - 0.5) * 70
			))
		}
	} else {
		this._prevTouchSpace = null
	}

	// Update all touch particles (flowmap carries them after finger lifts)
	this.touchParticles.forEach(p => {
		const dt = t.elapsed
		if (this.touch) {
			const z2 = this._z2 || 1
			const tx = this.touch.x / z2, ty = this.touch.y / z2
			const dx = tx - p.x, dy = ty - p.y
			const dist = Math.sqrt(dx*dx + dy*dy) + 5
			const nAngle = utilities.noise(p.x * 0.008, p.y * 0.008) * Math.PI * 4
			// Attraction to touch + gentle vortex + noise + center gravity (all in units/s²)
			p.vx += (dx/dist * 300 - dy/dist * 25 + Math.cos(nAngle) * 50 - p.x * 1.0) * dt
			p.vy += (dy/dist * 300 + dx/dist * 25 + Math.sin(nAngle) * 50 - p.y * 1.0) * dt
			// Drag: half-life 0.35s — keeps orbits tight, prevents escape
			p.vx *= Math.pow(0.5, dt / 0.35)
			p.vy *= Math.pow(0.5, dt / 0.35)
			p.age += dt * 0.15
		} else {
			// Cruise on flowmap; only steer toward it when there's actual signal
			const [fvx, fvy] = this.flowmap.sample(p.x, p.y)
			if (Math.sqrt(fvx*fvx + fvy*fvy) > 2) {
				p.vx += (fvx - p.vx) * 0.03
				p.vy += (fvy - p.vy) * 0.03
			}
			// Gentle pull toward center so they don't drift off forever
			p.vx -= p.x * 0.3 * dt
			p.vy -= p.y * 0.3 * dt
			// Very light drag (half-life 25s) — coasting, not stopping
			p.vx *= Math.pow(0.5, dt / 25)
			p.vy *= Math.pow(0.5, dt / 25)
			p.age += dt * 0.033
		}
		p.x += p.vx * dt
		p.y += p.vy * dt
	})
	this.touchParticles = this.touchParticles.filter(p => p.age < 1)

	// Typing particles: float upward from the input caret toward the face, with
	// horizontal spread and gentle drag. No flowmap or touch attraction — they
	// just drift up and fade.
	this.typeParticles.forEach(p => {
		const dt = t.elapsed || 0.016
		p.vx *= Math.pow(0.5, dt / 2.0)
		p.vy *= Math.pow(0.5, dt / 3.5)
		p.x  += p.vx * dt
		p.y  += p.vy * dt
		p.age += dt * 0.18
	})
	this.typeParticles = this.typeParticles.filter(p => p.age < 1)
}

// Convert a client (screen) coordinate into the centred canvas space the
// particles live in. Returns {x,y} (origin = canvas centre).
Face.prototype.clientToCanvas = function(clientX, clientY) {
	let canvas = this._canvas
	if (!canvas) return { x: 0, y: 0 }
	const r = canvas.getBoundingClientRect()
	return {
		x: (clientX - r.left) * (canvas.width / r.width) - canvas.width / 2,
		y: (clientY - r.top) * (canvas.height / r.height) - canvas.height / 2
	}
}

Face.prototype.registerCanvas = function(canvas, touchTarget) {
	this._canvas = canvas
	this._canvasH = canvas.height
	touchTarget = touchTarget || canvas
	const toCenter = (clientX, clientY) => {
		const r = canvas.getBoundingClientRect()
		const sx = canvas.width / r.width
		const sy = canvas.height / r.height
		return {
			x: (clientX - r.left) * sx - canvas.width / 2,
			y: (clientY - r.top) * sy - canvas.height / 2
		}
	}
	const release = () => {
		this._pointerId = null
		this.touch = null
		this.blinkL = 0
		this.blinkR = 0
	}
	touchTarget.addEventListener('pointerdown', e => {
		if (this._pointerId !== null) return
		this._pointerId = e.pointerId
		this.touch = toCenter(e.clientX, e.clientY)
	})
	touchTarget.addEventListener('pointermove', e => {
		if (e.pointerId !== this._pointerId) return
		this.touch = toCenter(e.clientX, e.clientY)
	})
	touchTarget.addEventListener('pointerup', e => {
		if (e.pointerId !== this._pointerId) return
		release()
	})
	touchTarget.addEventListener('pointercancel', e => {
		if (e.pointerId !== this._pointerId) return
		release()
	})
}

Face.prototype.setWord = function(word, length) {

	// Speaking agitates her — colour flares while she talks. (See app.bumpAgitation.)
	if (app.bumpAgitation) app.bumpAgitation(0.45)

	let dt = length*.001
	app.valueTracker.mouth.set(Math.random()*.3 + .3, this.lastTime, dt*.3)

	setTimeout(() => {
		app.valueTracker.mouth.set(Math.random(),this.lastTime,dt*.2)
	},  dt*.4*1000)

	setTimeout(() => {
		app.valueTracker.mouth.set(Math.random(),this.lastTime,dt*.2)
	},  dt*.6*1000)

	setTimeout(() => {
		app.valueTracker.mouth.set(0,this.lastTime,dt*.1)
	},  dt*.8*1000)

	// A floating word for EVERY spoken word turns a sentence into illegible confetti.
	// Only let the meaningful words drift up — skip the short connective/function words
	// (stripped of punctuation) — so the evocative ones read clearly on their own.
	let bare = word.toLowerCase().replace(/[^a-z']/g, '')
	if (bare.length >= 4 && !FLOAT_STOPWORDS.has(bare)) {
		// Float the word without its punctuation (drop commas/ellipses/quotes etc.,
		// keep internal apostrophes + hyphens) so the drifting text reads clean.
		let display = word.replace(/[^a-zA-Z'-]/g, '')
		// Emit from around her face (matches the draw translate of -canvasH*0.09),
		// down toward her mouth, so words rise off her face — not the chat bubble.
		// Sweep the emission angle left↔right like a pendulum over time.
		let faceCenterY = -this._canvasH * 0.09
		let lean = 1.0 * Math.sin((this.lastTime || 0) * 1.5)
		this.particles.push(new Particle({
			word: display,
			lifespan: length*.007,
			originY: faceCenterY + 45,
			lean: lean
		}))
	}
}

// Function/connective words that shouldn't float up as drifting particles (only
// words >= 4 chars are considered at all, so very short words are already excluded).
const FLOAT_STOPWORDS = new Set([
	"this","that","these","those","then","than","with","without","from","into","onto",
	"your","yours","you're","they","them","their","there","they're","here","have","having",
	"will","would","could","should","were","what","when","where","which","while","whom",
	"just","only","even","also","very","much","many","more","most","some","such","each",
	"every","been","being","does","done","didn't","don't","cannot","can't","won't","about",
	"like","over","under","again","still","because","though","through","upon","unto","shall",
	"must","might","ever","never","always","perhaps","maybe"
])

// Fixed pseudo-random scatter (0..1) from an integer seed — stable per particle
// so stars/firefly anchors stay put frame to frame (unlike Perlin, well spread).
function _hash(n) { let s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

Face.prototype.drawSpace = function(g, t) {
	// Particles ride the slow "swell" (not the per-word spikes) so they bloom gently
	// when she's worked up rather than darting in sync with every spoken word.
	let stress = app.swellAgitation || 0

	// One formation is shown at a time: chaos (the roaming ring), planet mode (a still
	// white-star constellation) or storytime (drifting fireflies). Rather than morph
	// positions between them (which looks frantic), we crossfade: when the desired mode
	// changes, the current formation fades OUT, then the new one fades IN already in
	// place — a brief dark beat between, no particles seen flying across the frame.
	let desired = app.particleMode || 'chaos'
	let dt = (this._lastSpaceT !== undefined) ? Math.min(0.1, Math.max(0, t - this._lastSpaceT)) : 0.016
	this._lastSpaceT = t
	if (this._partMode === undefined) { this._partMode = desired; this._partFade = 1 }
	const FADE = 0.7                                          // seconds for each half (out / in)
	if (desired !== this._partMode) {
		this._partFade -= dt / FADE                          // fade the old formation out
		if (this._partFade <= 0) { this._partFade = 0; this._partMode = desired }  // swap while dark
	} else {
		this._partFade = Math.min(1, this._partFade + dt / FADE)  // fade the new one in
	}
	let mode = this._partMode
	let fade = this._partFade * this._partFade * (3 - 2 * this._partFade)   // smoothstep
	if (fade <= 0.001) return                                 // fully dark mid-transition — nothing to draw

	let W = g.width, H = g.height
	// drawSpace is rendered inside a g.scale(z2) zoom, so raw canvas coords only fill
	// the centre. Spread the star/firefly formations by 1/z2 so they reach the actual
	// screen edges regardless of the current perspective zoom.
	let z2 = this._z2 || 1
	let coverX = W / (2 * z2), coverY = H / (2 * z2)

	let p = new Vector()
	let count = 100
	for (var i = 0; i < count; i++) {
		let pct = i/count
		let r = 1 + Math.sin(pct*100 + t*.4)
		let pa = this._arrParticleA * fade
		g.noStroke()

		if (mode === 'chaos') {
			// Roaming lissajous ring (+ flowmap drift) — rainbow halo + white core.
			p.setToPolar(200*(1.2 + Math.sin(4*pct*(2 + stress*.08 + .7*Math.sin(t*.2)) + t*.1)), 20*Math.sin(20*(2 + 1*Math.sin(t*.001))*pct))
			// Arrival: start far off-frame and sweep inward to gather around her.
			p.x *= this._arrRadius
			p.y *= this._arrRadius
			const [fvx, fvy] = this.flowmap.sample(p.x, p.y)
			p.x += fvx * 0.5
			p.y += fvy * 0.5
			g.fill((i*.01 + t*3)%1, .9, .6, .2*pa)
			p.drawCircle(g, 3*r)
			g.fill(1, 0, 1, pa)
			p.drawCircle(g, 1*r + .1)

		} else if (mode === 'planet') {
			// Still white stars filling the screen, twinkling with a tad of red/blue,
			// plus a fast, low-amplitude scintillation — light wavering as if through
			// atmosphere.
			p.x = (_hash(i) * 2 - 1) * coverX * 0.98
			p.y = (_hash(i + 57.3) * 2 - 1) * coverY * 0.98
			let tw = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7)            // slow brightness twinkle
			let scint = 0.82 + 0.18 * Math.sin(t * (5 + _hash(i + 21.3) * 5) + i * 4.1)  // atmospheric flicker
			let bright = (0.4 + 0.6 * tw) * scint
			let chroma = Math.sin(t * 0.5 + i * 2.3)                   // drifts red <-> blue
			let hue = chroma >= 0 ? 0.02 : 0.60                        // a touch of red / blue
			let sat = 0.45 * Math.abs(chroma)                         // mostly white
			g.fill(hue, sat, 1, 0.10 * pa * bright)
			p.drawCircle(g, 2.3)
			g.fill(hue, sat * 0.6, 1, pa * bright)
			p.drawCircle(g, 1.0)

		} else if (mode === 'firefly') {
			// Warm gold-green glow spread over the whole screen, drifting slowly around a
			// fixed anchor (hashed rates/phases). OPACITY blinks (sharp, out-of-unison);
			// size stays steady — no rapid scaling.
			let ax = (_hash(i + 11.1) * 2 - 1) * coverX * 0.95
			let ay = (_hash(i + 71.9) * 2 - 1) * coverY * 0.95
			let wr1 = 0.16 + _hash(i + 5.5) * 0.12, wr2 = 0.14 + _hash(i + 8.2) * 0.12
			p.x = ax + Math.sin(t * wr1 + i * 2.1) * 13
			p.y = ay + Math.cos(t * wr2 + i * 1.3) * 10
			let glow = Math.pow(Math.max(0, Math.sin(t * (0.5 + _hash(i + 3.3)) + _hash(i + 9.7) * 6.283)), 4)
			let sz = 2.0
			g.fill(0.17, 0.80, 0.95, (0.03 + 0.34 * glow) * pa)
			p.drawCircle(g, sz * 1.7)
			g.fill(0.13, 0.50, 1, (0.05 + 0.92 * glow) * pa)
			p.drawCircle(g, sz * 0.55)
		}
	}

	this.touchParticles.forEach(p => {
		g.noStroke()
		let a = 1 - p.age
		// Coloured halo + emissive white core, matching the space-ring particles.
		g.fill(p.hue, 0.55, 0.95, a * 0.35)
		g.ellipse(p.x, p.y, 3.5, 3.5)
		g.fill(1, 0, 1, a * 0.7)
		g.ellipse(p.x, p.y, 1.5, 1.5)
	})

	// Typing particles: same visual language as the touch particles but slightly
	// smaller and dimmer — they rise from the caret position and fade as they climb.
	this.typeParticles.forEach(p => {
		g.noStroke()
		let a = 1 - p.age
		g.fill(p.hue, 0.55, 0.95, a * 0.28)
		g.ellipse(p.x, p.y, 2.8, 2.8)
		g.fill(1, 0, 1, a * 0.6)
		g.ellipse(p.x, p.y, 1.2, 1.2)
	})
}

Face.prototype.drawFaceDetails = function(g, t) {
	let pw = this.pixelW
	let ph = this.pixelH


	let fuzz = app.values.eyeFuzz
	let mouth = app.values.mouth
	let mouthWidth = app.values.mouthWidth
	let blink = app.values.blink
	// let detailShade = app.values.detailShade
	let detailShade  = 1 - app.values.opacity

	let offset = new Vector()
	for (var i = 0; i < 4; i++) {

		// 

		let hueShift = .1*fuzz*Math.sin(i + t)
		this.detailColor.hueShift(hueShift).fill(g, Math.sin(i) + detailShade - .5, .6 * this._arrFace)
		offset.setToPolar(fuzz*i*utilities.noise(t), 20*utilities.noise(t*.02, i))
		g.pushMatrix()
		g.translate(offset.x, offset.y)

		let sides = [-1,1]

		// Draw the eyes
		sides.forEach(scaleX => {
			g.pushMatrix()
			g.scale(scaleX,1)
			g.translate(pw*1.5, ph*-3)
			// eyebrows — static, do not move when blinking
			g.rect(0, -ph, pw*4, ph*1)

			// eye — blinks (per-eye when touching an eye directly)
			let eyeBlink = scaleX > 0 ? Math.max(blink, this.blinkR) : Math.max(blink, this.blinkL)
			g.scale(1, 1 - .9*eyeBlink)
			g.rect(0, 0, pw*2, ph*1)

			g.popMatrix()

		})

		// Nose
		g.rect(-pw*1.5, ph*-4, pw*1, ph*7)
		g.rect(-pw*.5, ph*2, pw*2, ph*1)
		
		// Mouth
		g.pushMatrix()
		g.translate(0, pw*5)
		g.scale((1 + mouth*.4)*(1 - mouthWidth*.5), 1 - mouth*.2)
		g.rect(-pw*3.5, -ph, pw*7, ph*1)
		
		g.scale(1, mouth*2.8 + .2)
		g.rect(-pw*1.5, 0, pw*3, ph*1)

		g.popMatrix()		

		g.popMatrix()
	}
}

Face.prototype.drawFaceBG = function(g, t) {
	let rainbow = app.values.rainbow
	let hue = app.values.hue
	// Normalised agitation 0..1 — the single driver of colour + presence.
	let agit = Math.max(0, Math.min(1, app.values.agitation / this.agitFull))
	let stress = app.values.agitation*.1

	let w = this.boxW
	let h = this.boxH
	// Grid cells fill the box (independent of the feature units) so the shimmer
	// squares stay square no matter the box size.
	let pw = w/this.columns
	let ph = h/this.rows

	// Live-tweakable offset — nudge the whole box (plane + grid) around her face.
	g.pushMatrix()
	g.translate(this.boxOffX, this.boxOffY)

	// Transparent serene base; agitation flares colour (saturation) + a little presence.
	// Saturation uses a sqrt curve so colour reads vivid quickly instead of sitting
	// grey through the mid-range (HSB: brightness stays high, only sat was low).
	// _arrFace fades the whole plane up during the arrival sequence.
	let alpha = (this.baseAlpha + this.flareAlpha * agit) * this._arrFace
	this.faceColor.h = hue
	this.faceColor.s = this.baseSat + this.flareSat * Math.sqrt(agit)

	// Draw the static rectangle (softer than the squares so she reads as a ghost)
	this.faceColor.fill(g, undefined, 0.5*alpha)
	g.rect(-w/2, -h/2, w, h)

	// Rainbow shimmer only emerges with agitation; per-state `rainbow` adds flavour.
	let shimmerAmp = this.shimmer * agit * (0.6 + 0.1*rainbow)

	// Draw the face squares
	for (var i = 0; i < this.columns; i++) {
		for (var j = 0; j < this.rows; j++) {
			let jiggle = stress*9
			g.noFill()
			g.noStroke()
			let rainbowJiggle = shimmerAmp*utilities.noise(i + 4*t*jiggle , 100 + j + 4*t*jiggle, t )

			// Per-cell opacity twinkle — each square has its own stable phase + rate
				// (from _hash) so they breathe out of unison instead of all together.
				let twSeed = i*16 + j
				let twRate = 0.5 + _hash(twSeed + 3.1)*0.9
				let twinkle = 0.45 + 0.55*(0.5 + 0.5*Math.sin(t*twRate + _hash(twSeed)*6.283))
				this.faceColor.hueShift(rainbowJiggle).fill(g, .2 + (.2*stress + .3)*utilities.noise(i, j, t), alpha*twinkle)

			let r = Math.pow(stress, 3)*5*pw
			// console.log(r)
			let theta =i + j + .3*utilities.noise(i + t*jiggle , j + t*jiggle )
			let x = -w/2 + i*pw 
			let y = -h/2 + j*ph 

			g.rect(x + r*Math.sin(theta), y + r*Math.cos(theta), pw + 1, ph + 1)
		}
	}

	g.popMatrix()
}

Face.prototype.draw = function(g, time) {
	let t = time.current
	this.lastTime = t

	// Arrival: particles sweep in (first ~65%), then the face fades up (last ~45%).
	if (this.arrivalStart === undefined) this.arrivalStart = t
	let A = Math.max(0, Math.min(1, (t - this.arrivalStart) / this.arrivalDur))
	let ss = x => x*x*(3 - 2*x)                              // smoothstep
	let pPhase = Math.min(1, A / 0.65)
	this._arrRadius = 1 + Math.pow(1 - pPhase, 2) * 4        // 5x → 1x ease-out (fly in)
	this._arrParticleA = ss(Math.min(1, A / 0.45))
	// _arrFace fades the whole face (box + details). When a planet is summoned it
	// also multiplies the face out, so the facebox goes fully transparent and only
	// the world floats (see app.values.planet / planet.js).
	let planetAmt = Math.max(0, Math.min(1, app.values.planet || 0))
	this._arrFace = ss(Math.max(0, (A - 0.55) / 0.45))      // appears after the gather (face stays under the planet)

	let zoomScale = 1/(app.values.perspective*.7 + .3)

	// Agitation drifts her closer/further, as if a bit at a loss. Slow sine + a
	// little noise so it never settles into a clean breath.
	let agit = Math.max(0, Math.min(1, app.values.agitation / this.agitFull))
	zoomScale *= 1 + this.wobbleAmp*agit*(Math.sin(t*0.6) + 0.4*(utilities.noise(t*0.25) - 0.5)*2)

	// Draw spacey particles
	if (app.values.perspective > -1) {
		let z2 = utilities.lerp(zoomScale, 1, .8)
		this._z2 = z2
		g.pushMatrix()
		g.scale(z2, z2)
		this.drawSpace(g, t)
		g.popMatrix()
	}

	g.pushMatrix()
	// Ease her down as a world rises above her head (and back up when it recedes).
	g.translate(0, -g.height*.09 + g.height*0.12*planetAmt)
	g.scale(zoomScale, zoomScale)


	this.drawFaceBG(g, t)
	this.drawFaceDetails(g, t)

	g.popMatrix()

	// Draw the summoned world over the (now-faded) face, under the speech.
	if (planetAmt > 0.01 && typeof planet !== "undefined") planet.draw(g, t, planetAmt)


	// Draw speech particles
	this.particles.forEach(p => p.draw(g))


	// app.valueTracker.mouthWidth.draw(g, t)
}