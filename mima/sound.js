let soundLibrary = {
	chirps: {},
	soundtracks: []
}


var reverb = new Pizzicato.Effects.Reverb({
	time: 1,
	decay: 0.8,
	reverse: true,
	mix: 0.5
});

let effects = {
	dubDelay : new Pizzicato.Effects.DubDelay({
		feedback: 0.6,
		time: 0.7,
		mix: 0.5,
		cutoff: 700
	}),

	reverb : new Pizzicato.Effects.Reverb({
		time: 1,
		decay: 0.8,
		reverse: true,
		mix: 0.3
	}),

	lilReverb : new Pizzicato.Effects.Reverb({
		time: .3,
		decay: 0.5,
		reverse: true,
		mix: 0.5
	})

}

function randomChirp(length) {

	

	let keys = Object.keys(soundLibrary.chirps)
	if (keys.length !== 0) {
		let key = getRandom(keys)
		let sound = soundLibrary.chirps[key]
		if (sound.effects.length > 0)
			sound.removeEffect(effects.reverb)

		sound.volume = app.values.volume*settings.volume
		if (app.values.perspective > 3) {
			sound.volume *= .1
			sound.addEffect(effects.reverb)
		} else {
			 // sound.volume = settings.volume*(.5 + .05*app.values.volume)		
		}

		
		sound.play()
	
		sound.sourceNode.playbackRate.value = (Math.pow(.92, app.values.speed + .01))*settings.speed / (length*.001 + 1 + Math.random())
		sound.on('end', () => {
			// console.log("done!")
		})
	}
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

	let chirps = ["affirm", "hi", "iguess", "chirp", "sigh", "uh huh", "why", "yes", "yo"]

	chirps.forEach((name) => {
		var sound = new Pizzicato.Sound({ 
			source: 'file',
			options: { path: 'mima/sounds/blips/' + name + '.wav' }
		}, ()  => {
			console.log(`blip file loaded: '${name}'`);
			// console.log('sound file loaded!');
			//	sound.play();
			soundLibrary.chirps[name] = sound
		});
		
	})

	// let soundtrackFiles = ["mimamed", "mimamax", "mimamin"]
	// Just use this for now
	let soundtrackFiles = ["mimamed"]
	soundtrackFiles.forEach((name) => {
		var sound = new Pizzicato.Sound({ 
			source: 'file',
			loop: true,
			options: { path: 'mima/sounds/' + name + '.mp3' }
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