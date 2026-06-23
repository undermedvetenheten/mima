let soundLibrary = {
	chirps: {},
	fades: {},
	soundtracks: []
}


// --- Reverb bus (2026-06-22) ------------------------------------------------
// ONE shared room reverb, built as an aux send rather than a per-sound effect.
// Pizzicato's addEffect taps an effect's output into EACH sound's master, so
// sharing one effect instance across many sounds sums its wet output once per
// sound (and the synth bed spawns voices forever) — that runs away / feeds back.
// Instead we make a single convolver: every sound keeps its normal dry path to
// the master AND sends a copy into `reverbBus`; the wet output hits the speakers
// exactly once. "Added to the reverb once" = one reverbBus.connect() per sound.
// Tweak ROOM_SECONDS / wet.gain to taste.
function makeImpulse(ctx, seconds, decay) {
	let rate = ctx.sampleRate
	let len = Math.max(1, Math.floor(seconds * rate))
	let buf = ctx.createBuffer(2, len, rate)
	for (let ch = 0; ch < 2; ch++) {
		let data = buf.getChannelData(ch)
		for (let i = 0; i < len; i++)
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
	}
	return buf
}
let reverbBus = (function () {
	let ctx = Pizzicato.context
	let send = ctx.createGain()              // sounds connect here (aux send)
	let convolver = ctx.createConvolver()
	convolver.buffer = makeImpulse(ctx, 6, 3) // 6s room, exp decay
	let wet = ctx.createGain()
	wet.gain.value = 0.6                       // overall reverb amount into master
	send.connect(convolver)
	convolver.connect(wet)
	wet.connect(Pizzicato.masterGainNode)     // single wet output tap
	return send
})()
// --- Dub delay bus (2026-06-22) ---------------------------------------------
// A tribute to the accidental reverb-runaway: a feedback delay (the musical,
// BOUNDED version of that swell). Everything sends a copy in at low volume; the
// delay regenerates with a darkening lowpass in the loop for a dubby tail. The
// touch screen rides `feedback` (how long it regenerates) and `wet` (how loud)
// via setFeedback/setWet — drag toward the edge for that on-the-verge howl,
// release to settle back. A limiter on the wet path keeps it ear-safe even when
// pushed near self-oscillation. See attachInput() in synthbed.js for the touch.
let dubDelay = (function () {
	let ctx = Pizzicato.context
	let send = ctx.createGain()                 // sounds connect here (aux send)
	let delay = ctx.createDelay(2.0)
	delay.delayTime.value = 0.38                 // dubby repeat time
	let feedback = ctx.createGain()
	let tone = ctx.createBiquadFilter()          // darken each repeat
	tone.type = 'lowpass'; tone.frequency.value = 2200
	let wet = ctx.createGain()
	let limiter = ctx.createDynamicsCompressor() // safety: hard-ish ceiling
	limiter.threshold.value = -10; limiter.ratio.value = 20
	limiter.attack.value = 0.003; limiter.release.value = 0.25

	let baseFeedback = 0.42, baseWet = 0.32      // present, but still rides up on touch
	feedback.gain.value = baseFeedback
	wet.gain.value = baseWet

	send.connect(delay)
	delay.connect(tone)
	tone.connect(feedback); feedback.connect(delay)   // the feedback loop
	tone.connect(wet)
	wet.connect(limiter); limiter.connect(Pizzicato.masterGainNode)

	let clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
	let glide = (param, v) => param.setTargetAtTime(v, ctx.currentTime, 0.1)
	return {
		send, baseFeedback, baseWet,
		setFeedback(f) { glide(feedback.gain, clamp(f, 0, 0.92)) },  // <1 so it always decays
		setWet(w)      { glide(wet.gain, clamp(w, 0, 0.6)) },
		setTime(t)     { glide(delay.delayTime, clamp(t, 0.02, 1.6)) },
		reset()        { glide(feedback.gain, baseFeedback); glide(wet.gain, baseWet) },
	}
})()

// Send a sound's output into the shared aux buses (reverb + dub delay), once.
function sendToReverb(sound) {
	if (!sound || sound._reverbSent) return
	try {
		sound.connect(reverbBus)
		sound.connect(dubDelay.send)
		sound._reverbSent = true
	} catch (e) {}
}

// --- Master limiter (2026-06-22) --------------------------------------------
// Everything (dry voice + reverb + dub + the discombobulate sub) sums at
// Pizzicato.masterGainNode. With no ceiling, that overflows into hard digital
// clipping on phones — the "meaty" clicks heard on a Pixel. Insert one limiter
// between the master bus and the speakers so peaks are caught instead of clipped.
// NOTE: sample rate is NOT the cause of those clicks — Web Audio resamples mp3s
// to the device rate automatically; no need to convert files for that.
;(function installMasterLimiter() {
	let ctx = Pizzicato.context
	let m = Pizzicato.masterGainNode
	let lim = ctx.createDynamicsCompressor()
	lim.threshold.value = -3   // start catching just below full scale
	lim.knee.value = 0
	lim.ratio.value = 20       // brick-wall-ish
	lim.attack.value = 0.003
	lim.release.value = 0.25
	try { m.disconnect(ctx.destination) } catch (e) {}
	m.connect(lim)
	lim.connect(ctx.destination)
})()

let lastChirpTime = 0
function randomChirp(length) {
	let keys = Object.keys(soundLibrary.chirps)
	if (keys.length === 0) return
	let now = Date.now()
	if (now - lastChirpTime < 120) return
	lastChirpTime = now

	let key = getRandom(keys)
	let sound = soundLibrary.chirps[key]

	// If this exact sound is still playing, skip it — changing volume or rate
	// on an active source causes an audible click/rate-glitch.
	if (sound.playing) return

	sound.volume = app.values.volume * settings.volume
	// Far away = quieter; the steady shared-reverb tail makes it read as distant.
	if (app.values.perspective > 3) sound.volume *= .1

	sound.play()

	if (sound.sourceNode) {
		const rate = (Math.pow(.92, app.values.speed + .01)) * settings.speed / (length * .001 + 1 + Math.random())
		sound.sourceNode.playbackRate.setValueAtTime(rate, Pizzicato.context.currentTime)
	}
}


// Load every file from a sounds subfolder into a soundLibrary pool. Filenames
// are NOT hardcoded: we fetch the folder's manifest.json (generated by
// serve.js), which lists each { file, gain }. The `gain` levels the file to a
// consistent peak (see serve.js) and is stashed on the sound. So dropping new
// wavs into the folder loads AND auto-levels them with no code edit.
function loadSoundFolder(folder, poolName) {
	fetch('mima/sounds/' + folder + '/manifest.json')
		.then(res => res.json())
		.then(entries => {
			entries.forEach((entry) => {
				// Tolerate the old plain-string manifest format too.
				let file = (typeof entry === 'string') ? entry : entry.file
				let gain = (typeof entry === 'string') ? 1 : entry.gain
				let key = folder + '/' + file
				var sound = new Pizzicato.Sound({
					source: 'file',
					options: { path: 'mima/sounds/' + folder + '/' + file }
				}, ()  => {
					sound._gain = gain
					sendToReverb(sound)
					soundLibrary[poolName][key] = sound
					console.log(`${poolName} loaded: '${key}' (gain ${gain})`);
					// If the player already pressed "Hello?" before the fades had
					// loaded, fire the promised intro fade once one is available.
					if (introFadePending && playFade()) introFadePending = false
				});
			})
		})
		.catch(err => console.warn('could not load manifest for ' + folder, err))
}

// Play one fade/transition sound, once. Called on every state change (see
// app.js onEnterState). Uses settings.volume so it stays consistent regardless
// of the per-state voice volume.
function playFade() {
	let keys = Object.keys(soundLibrary.fades)
	if (keys.length === 0) return false
	let sound = soundLibrary.fades[getRandom(keys)]
	sound.volume = settings.volume * (sound._gain || 1)
	sound.play()
	return true
}


// A really low sine for the discombobulation moment: swells in, sits under
// everything, then fades within the ~8s state. Tuned an octave below the synth
// bed root so it stays harmonically grounded. Kept DRY (sub-bass + reverb = mud)
// — not routed through sendToReverb. Called from app.js onEnterState.
let discombobDrone = null
function playDiscombobulate() {
	if (discombobDrone) { try { discombobDrone.stop() } catch (e) {} discombobDrone = null }
	let root = (typeof synthBed !== 'undefined' && synthBed.root) ? synthBed.root : 65.41
	let s = new Pizzicato.Sound({
		source: 'wave',
		options: { type: 'sine', frequency: root / 2, attack: 1.5, release: 2.5, volume: 0.32 }
	})
	discombobDrone = s
	s.play()
	// Let it ride most of the state, then release; clear the handle if still ours.
	setTimeout(() => { try { s.stop() } catch (e) {} ; if (discombobDrone === s) discombobDrone = null }, 5500)
}


// Intro fade: a single fade/transition sound the instant the player presses
// "Hello?", so the press has an immediate audible effect before Mima arrives.
// Plays now if the fades have loaded, otherwise arms a flag so the first fade
// to finish loading fires it (loading is async, usually <100ms).
let introFadePending = false
function fadeWhenReady() {
	if (!playFade()) introFadePending = true
}


function startSoundtrack() {
	if (currentSoundtrack === undefined)  {
		console.log("🎵: start soundtrack")
		if (soundLibrary.soundtracks.length > 0) {
			currentSoundtrack = soundLibrary.soundtracks[0]
			currentSoundtrack.play()
		} else {
			playSoundtrackOnLoad = true
		}
	} else {
		console.log("🎵: - soundtrack already playing -")

	}
}

let playSoundtrackOnLoad = false
let currentSoundtrack = undefined
let soundInitialized = false

function initSounds() {
	if (!soundInitialized) {
		soundInitialized = true
		console.log("RESUME SOUND")
	Pizzicato.context.resume();

	// Fades first — needed immediately for the first state-change whoosh.
	// Chirps/blips deferred so their decode burst doesn't compete with the
	// AudioContext resume and face animation on the same frame.
	loadSoundFolder('fades', 'fades')
	setTimeout(() => {
		loadSoundFolder('blips', 'chirps')
		loadSoundFolder('chirps', 'chirps')
	}, 1500)

	// Background soundtrack — full filename incl. extension so .wav/.mp3 both work.
	let soundtrackFiles = ["kettleSimple01.mp3"]
	soundtrackFiles.forEach((name) => {
		var sound = new Pizzicato.Sound({
			source: 'file',
			loop: true,
			options: { path: 'mima/sounds/' + name }
		}, ()  => {
			console.log(`soundtrack file loaded: '${name}'`);
			//	sound.play();
			soundLibrary.soundtracks.push(sound)
			if (playSoundtrackOnLoad)
				startSoundtrack()
		});

	})
	}
}
