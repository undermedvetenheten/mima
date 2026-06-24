// --- synthBed (2026-06-21) ---------------------------------------------------
// A generative, extremely-minimal drone bed built from Pizzicato sine waves.
//
// How it works:
//  - SCALE-FIRST: every chord is two notes drawn from a chosen scale, so it is
//    always in-key and always consonant with the chord before it. The lower
//    note (root) walks by a small number of scale steps each chord; the upper
//    note sits a few scale steps above it (a third / fifth / sixth).
//  - HARMONIC-SERIES SHIMMER: each note is then nudged TOWARD the nearest
//    just-intonation partial of the chord's root — but only by the natural
//    just-vs-equal-temperament difference, hard-capped under a quarter tone.
//    So it reads as the scale AND the harmonic series at once, microtonally.
//  - Voices are sine waves with long attack/release, so each chord change is a
//    slow, clickless crossfade.

let synthBed = {
	// --- composition config (tweak to taste) ---
	root: 65.41,                 // C2-ish reference for scale-degree 0
	scale: [0, 2, 4, 7, 9],      // semitone offsets — major pentatonic (always consonant)
	rootSteps: [-2, -1, 0, 1, 2],// how far the root walks (in scale steps) per chord
	dyadSteps: [2, 3, 4],        // upper note this many scale steps above the root
	// just-intonation partials a note can be pulled toward (within an octave).
	jiRatios: [1/1, 9/8, 6/5, 5/4, 4/3, 3/2, 8/5, 5/3, 9/5, 15/8, 2/1],
	fMin: 98, fMax: 330,         // keep the bed in a calm low-mid register
	holdMin: 7, holdMax: 13,     // seconds each chord sustains
	attack: 4, release: 6,       // long fades = smooth crossfade between chords
	voiceVolume: 0.08,           // subtle — it's a bed, not a melody
	maxDetuneCents: 35,          // hard ceiling on the microtonal shift (< quarter tone)
	bendCents: 10,               // touch interaction: screen edges bend the sines ±this
	bendEase: 0.08,              // how quickly the bend follows the finger / releases

	// --- runtime state ---
	ri: null,                    // current root scale-degree index
	iLo: 0, iHi: 0, iHiRoot: 0,  // index bounds (computed in start)
	voices: [],
	timer: null,
	running: false,
	detune: 0, targetDetune: 0,  // live touch-bend, in cents (eased toward target)
	pointerActive: false, raf: null, inputAttached: false,

	pick(a) { return a[Math.floor(Math.random() * a.length)] },
	cents(ratio) { return 1200 * Math.log2(ratio) },
	ratio(cents) { return Math.pow(2, cents / 1200) },

	// Frequency of scale-degree index i (i can span octaves, +/-).
	freqAt(i) {
		let S = this.scale.length
		let oct = Math.floor(i / S)
		let pos = ((i % S) + S) % S
		return this.root * Math.pow(2, oct + this.scale[pos] / 12)
	},

	// Nudge a scale note toward the nearest just partial of the chord root,
	// capped under a quarter tone — the subtle microtonality.
	nudgeToJI(freq, rootFreq) {
		let r = freq / rootFreq
		while (r >= 2) r /= 2          // fold the interval into one octave
		while (r < 1) r *= 2
		let rc = this.cents(r)
		let best = 0, bestDist = Infinity
		for (let j of this.jiRatios) {
			let d = Math.abs(this.cents(j) - rc)
			if (d < bestDist) { bestDist = d; best = j }
		}
		let shift = this.cents(best) - rc
		shift = Math.max(-this.maxDetuneCents, Math.min(this.maxDetuneCents, shift))
		return freq * this.ratio(shift)
	},

	// Advance to the next chord and crossfade the voices to it.
	step() {
		// Walk the root by a few scale steps, kept within the register (with room
		// for the dyad above it).
		this.ri = Math.max(this.iLo, Math.min(this.iHiRoot, this.ri + this.pick(this.rootSteps)))
		let ui = Math.min(this.iHi, this.ri + this.pick(this.dyadSteps))
		let rootF = this.freqAt(this.ri)
		let upperF = this.freqAt(ui)
		let freqs = [rootF, this.nudgeToJI(upperF, rootF)]

		let old = this.voices
		this.voices = freqs.map(fr => {
			let v = new Pizzicato.Sound({
				source: 'wave',
				options: { type: 'sine', frequency: fr, attack: this.attack, release: this.release, volume: this.voiceVolume }
			})
			// Send every voice into the one shared room reverb (see sound.js) so the
			// whole soundscape sits in a single space — one reverb, not one per note.
			// It's an aux send (dry path stays intact), added once per fresh voice.
			if (typeof sendToReverb === 'function') sendToReverb(v)
			v._baseFreq = fr
			v.play()
			return v
		})
		this.applyDetune()   // adopt the current touch-bend immediately
		// Release the previous chord (its long release overlaps the new attack),
		// then disconnect it fully so stopped voices don't accumulate in the graph.
		old.forEach(v => {
			try { v.stop() } catch (e) {}
			let cleanupMs = (v.release || 0) * 1000 + 300
			setTimeout(() => {
				try { v.masterVolume.disconnect(Pizzicato.masterGainNode) } catch (e) {}
				try { v.masterVolume.disconnect(reverbBus) } catch (e) {}
				try { v.masterVolume.disconnect(dubDelay.send) } catch (e) {}
			}, cleanupMs)
		})
	},

	// --- touch interaction: drag/touch across the screen to gently bend pitch ---
	// Apply the current bend to every live voice (relative to its base pitch).
	// Use setTargetAtTime rather than direct .value assignment so the Web Audio
	// scheduler interpolates smoothly — no zipper noise if a frame is skipped.
	applyDetune() {
		let r = this.ratio(this.detune)
		let now = Pizzicato.context.currentTime
		for (let v of this.voices) {
			if (v._baseFreq && v.sourceNode && v.sourceNode.frequency) {
				try { v.sourceNode.frequency.setTargetAtTime(v._baseFreq * r, now, 0.016) } catch (e) {}
			}
		}
	},
	// Per-frame ease of the bend toward its target, then apply it. Skip the audio
	// work entirely when there's nothing to bend (no finger down and the bend has
	// already settled to centre) — otherwise we scheduled a setTargetAtTime on every
	// voice on every single frame, including the frame a chat bubble lays out, adding
	// needless main-thread contention. Idle is the common case, so this is mostly free.
	tick() {
		this.detune += (this.targetDetune - this.detune) * this.bendEase
		if (this.pointerActive || Math.abs(this.detune - this.targetDetune) > 0.01 || Math.abs(this.detune) > 0.01)
			this.applyDetune()
		if (this.running) this.raf = requestAnimationFrame(() => this.tick())
	},
	// Listen for touch/pointer — the dub delay (sound.js) is the instrument:
	//  - x-position warps the dub repeat time + sweeps its lowpass. Centre = the
	//    baseline settings; drag LEFT for slower repeats (longer delay) filtered
	//    dark (highs rolled off), drag RIGHT for faster repeats filtered bright
	//    (open to the high end). Sliding the delay time resamples the buffer, so
	//    the drag itself pitch-warps the tail.
	//  - y-position gates the dub: silent in the top half, fading in from the
	//    midline to max loudness at the very bottom (more feedback + wetter there).
	// Releasing settles the whole dub back to its baseline (dubDelay.reset()).
	attachInput() {
		if (this.inputAttached) return
		this.inputAttached = true
		let setFromXY = (x, y) => {
			if (typeof dubDelay === 'undefined') return
			let w = window.innerWidth || 1, h = window.innerHeight || 1
			// X: warp around the centred baseline. nx = -1 (left) .. 0 .. +1 (right).
			let nx = (x / w) * 2 - 1
			dubDelay.setTime(dubDelay.baseTime * Math.pow(1.3, -nx))  // gentle nudge: ~0.49s left .. 0.29s right
			dubDelay.setTone(dubDelay.baseTone * Math.pow(2.5,  nx))  // left darker (~880Hz), right brighter (~5.5kHz)
			// Y: the dub is silent in the top half; it fades in from the midline and
			// reaches max loudness at the very bottom of the screen.
			let n = Math.max(0, Math.min(1, y / h))                   // 0 top .. 1 bottom
			let m = Math.max(0, (n - 0.5) * 2)                        // 0 above halfway .. 1 at the bottom
			dubDelay.setFeedback(dubDelay.baseFeedback + m * 0.28)    // up to ~0.70 — always clearly decays
			dubDelay.setWet(m * 0.38)                                 // 0 above halfway, max at the very bottom
		}
		window.addEventListener('pointerdown', e => { this.pointerActive = true; setFromXY(e.clientX, e.clientY) })
		window.addEventListener('pointermove', e => { if (this.pointerActive) setFromXY(e.clientX, e.clientY) })
		let release = () => {
			this.pointerActive = false
			this.targetDetune = 0
			if (typeof dubDelay !== 'undefined') dubDelay.reset()
		}
		window.addEventListener('pointerup', release)
		window.addEventListener('pointercancel', release)
	},

	scheduleNext() {
		let hold = (this.holdMin + Math.random() * (this.holdMax - this.holdMin)) * 1000
		this.timer = setTimeout(() => {
			if (this.running) { this.step(); this.scheduleNext() }
		}, hold)
	},

	// Find the scale-degree index range that lands inside [fMin, fMax].
	computeBounds() {
		let i = 0
		while (this.freqAt(i) > this.fMin) i--
		while (this.freqAt(i) < this.fMin) i++
		this.iLo = i
		while (this.freqAt(i + 1) <= this.fMax) i++
		this.iHi = i
		// leave headroom above the root for the dyad
		this.iHiRoot = Math.max(this.iLo, this.iHi - Math.max(...this.dyadSteps))
	},

	start() {
		if (this.running) return
		this.running = true
		this.computeBounds()
		if (this.ri === null) this.ri = this.iLo + 2
		this.step()
		this.scheduleNext()
		this.attachInput()
		this.tick()
		console.log('synthBed: started')
	},

	stop() {
		this.running = false
		clearTimeout(this.timer)
		if (this.raf) cancelAnimationFrame(this.raf)
		this.voices.forEach(v => { try { v.stop() } catch (e) {} })
		this.voices = []
	},
}
