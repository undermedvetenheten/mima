function Particle({word,lifespan}) {
	this.word = word
	this.p = Vector.polar(Math.random()*100, Math.random()*100)
	this.v = Vector.polar(Math.random()*100 + 30, Math.random()*100)
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
	this.p.addMultiple(this.v, t.elapsed)
	this.v.mult(Math.pow(this.drag,t.elapsed*10))

	if (this.start === undefined) {
		this.start = t.current
	}
	// console.log(this.start, t.current, this.lifespan)
	this.age = (t.current - this.start)/this.lifespan
	// console.log(this.age)
}



function Face() {
	this.width  = 300
	this.height = 400
	this.rows = 16
	this.columns = 13
	this.pixelW = this.width/this.columns
	this.pixelH = this.height/this.rows


	this.detailColor = new KColor(.5, .6, .6)
	// Start colour: #f1dddc / rgb(241,221,220) ≈ HSL(0.01, 0.43, 0.90) — a pale blush.
	// h is overridden each frame by the state's `hue`; s by the rainbow formula in
	// drawFaceBG; l (lightness) persists from here.
	this.faceColor = new KColor(0.01, 0.43, 0.90)

	this.particles = []

	this.touch = null          // {x, y} canvas-center-relative px, or null
	this.touchAttraction = 0   // lerps 0→1 while holding
	this.blinkL = 0            // per-eye touch blink (0=open, 1=closed)
	this.blinkR = 0
	this._z2 = 1               // space scale, updated each draw frame
	this._canvasH = 600        // canvas pixel height, set by registerCanvas
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
		this.touchAttraction += (1 - this.touchAttraction) * 0.06
		// Convert touch (canvas-center-relative px) to face-local coords
		const zs = 1 / (app.values.perspective * 0.7 + 0.3)
		const tx = this.touch.x / zs
		const ty = (this.touch.y + this._canvasH * 0.09) / zs
		// Eye centres: (±pw*2.5, ph*-2.5) in face-local space
		const hitR = this.pixelW * 3
		const eyeY = this.pixelH * -2.5
		if (Math.abs(ty - eyeY) < hitR) {
			if (tx > 0 && Math.abs(tx - this.pixelW * 2.5) < hitR) blinkRTarget = 1
			if (tx < 0 && Math.abs(tx + this.pixelW * 2.5) < hitR) blinkLTarget = 1
		}
	} else {
		this.touchAttraction *= 0.88
	}
	this.blinkL += (blinkLTarget - this.blinkL) * 0.15
	this.blinkR += (blinkRTarget - this.blinkR) * 0.15
}

Face.prototype.registerCanvas = function(canvas) {
	this._canvasH = canvas.height
	const toCenter = (clientX, clientY) => {
		const r = canvas.getBoundingClientRect()
		const sx = canvas.width / r.width
		const sy = canvas.height / r.height
		return {
			x: (clientX - r.left) * sx - canvas.width / 2,
			y: (clientY - r.top) * sy - canvas.height / 2
		}
	}
	canvas.addEventListener('touchstart', e => {
		e.preventDefault()
		const t = e.touches[0]
		this.touch = toCenter(t.clientX, t.clientY)
	}, {passive: false})
	canvas.addEventListener('touchmove', e => {
		e.preventDefault()
		const t = e.touches[0]
		this.touch = toCenter(t.clientX, t.clientY)
	}, {passive: false})
	canvas.addEventListener('touchend', e => {
		e.preventDefault()
		this.touch = null
		this.blinkL = 0
		this.blinkR = 0
	}, {passive: false})
}

Face.prototype.setWord = function(word, length) {
	
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

	this.particles.push(new Particle({word:word, lifespan:length*.007}))
}

Face.prototype.drawSpace = function(g, t) {
	let stress = app.values.agitation
	let p = new Vector()
	let count = 100
	for (var i = 0; i < count; i++) {
		let pct = i/count
		p.setToPolar(200*(1.2 + Math.sin(4*pct*(2 + stress*.2 + .7*Math.sin(t*.2)) + t*.1)), 20*Math.sin(20*(2 + 1*Math.sin(t*.001))*pct))

		// Attract stars toward touch point
		if (this.touch && this.touchAttraction > 0.01) {
			const tx = this.touch.x / this._z2
			const ty = this.touch.y / this._z2
			p.x += (tx - p.x) * this.touchAttraction * 0.7
			p.y += (ty - p.y) * this.touchAttraction * 0.7
		}

		let r = 1 + Math.sin(pct*100 + t*.4)
		
		g.noStroke()
		g.fill((i*.01 + t*3)%1, .9, .6, .2)
		p.drawCircle(g, 3*r)
		g.fill(1, 0, 1)
		p.drawCircle(g, 1*r + .1)
	}
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
		this.detailColor.hueShift(hueShift).fill(g, Math.sin(i) + detailShade - .5, .6)
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
	let faceOpacity = app.values.opacity
	let hue = app.values.hue
	let stress = app.values.agitation*.1

	let w = this.width
	let h = this.height
	let pw = this.pixelW
	let ph = this.pixelH

	

	// Draw the static rectangle
	this.faceColor.h = hue
	this.faceColor.fill(g, rainbow, .4*faceOpacity)
	g.rect(-w/2, -h/2, w, h)

	// Calm (low rainbow) stays a pale blush ~0.43; agitation (high rainbow) saturates.
	this.faceColor.s = Math.min(1, 0.43 + rainbow*0.05)
	
	// Draw the face squares	
	for (var i = 0; i < this.columns; i++) {
		for (var j = 0; j < this.rows; j++) {
			let jiggle = stress*9
			g.noFill()
			g.noStroke()
			let rainbowJiggle = .08*rainbow*utilities.noise(i + 4*t*jiggle , 100 + j + 4*t*jiggle, t )

			this.faceColor.hueShift(rainbowJiggle).fill(g, .2 + (.2*stress + .3)*utilities.noise(i, j, t), faceOpacity)

			let r = Math.pow(stress, 3)*5*pw
			// console.log(r)
			let theta =i + j + .3*utilities.noise(i + t*jiggle , j + t*jiggle )
			let x = -w/2 + i*pw 
			let y = -h/2 + j*ph 

			g.rect(x + r*Math.sin(theta), y + r*Math.cos(theta), pw + 1, ph + 1)
		}
	}

}

Face.prototype.draw = function(g, time) {
	let t = time.current
	this.lastTime = t


	
	let zoomScale = 1/(app.values.perspective*.7 + .3)
	
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
	g.translate(0, -g.height*.09)
	g.scale(zoomScale, zoomScale)


	this.drawFaceBG(g, t)
	this.drawFaceDetails(g, t)

	g.popMatrix()


	// Draw speech particles
	this.particles.forEach(p => p.draw(g))


	// app.valueTracker.mouthWidth.draw(g, t)
}