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
	this.columns = 14
	this.pixelW = this.width/this.columns
	this.pixelH = this.height/this.rows

	this.detailColor = new KColor(Math.random(), .9, .6)
	this.faceColor = new KColor(Math.random(), .9, .8)
	this.bgColor = new KColor(Math.random(), .9, .5)

	this.particles = []
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

Face.prototype.drawEye = function(g, side) {
	let pw = this.pixelW
	let ph = this.pixelH

	
	let x = this.columns/2 - side*3
	let y = 5
	g.rect(x*pw, y*ph, pw*2*side, ph)

}


Face.prototype.drawMouth = function(g, t) {
	
	let mouth = app.values.mouth
	let w = this.columns*.5/(mouth + 1)
	let h = mouth*5 + .2
	let y = this.rows/2
	g.rect(-(w/2 - this.columns/2)*this.pixelW, y*this.pixelH, w*this.pixelW, h*this.pixelH)

}	


Face.prototype.drawSpace = function(g, t) {
	let stress = app.values.agitation
	let p = new Vector()
	let count = 100
	for (var i = 0; i < count; i++) {
		let pct = i/count
		p.setToPolar(200*(1.2 + Math.sin(4*pct*(2 + stress*.2 + .7*Math.sin(t*.2)) + t*.1)), 20*Math.sin(20*(2 + 1*Math.sin(t*.001))*pct))
		
		let r = 1 + Math.sin(pct*100 + t*.4)
		
		g.noStroke()
		g.fill((i*.01 + t*3)%1, .9, .6, .2)
		p.drawCircle(g, 3*r)
		g.fill(1, 0, 1)
		p.drawCircle(g, 1*r + .1)
	}
}

Face.prototype.draw = function(g, time) {
	let t = time.current
	this.lastTime = t

	let w = this.width
	let h = this.height
	let pw = this.pixelW
	let ph = this.pixelH

	
	let rainbow = app.values.rainbow
	let zoomScale = 1/(app.values.perspective*.7 + .3)

	let faceOpacity = app.values.opacity
	let hue = app.values.hue
	let stress = app.values.agitation*.1
	
	this.faceColor.h = (hue + 10)%1

	if (app.values.perspective > -1) {
		let z2 = utilities.lerp(zoomScale, 1, .8)
		g.pushMatrix()
		g.scale(z2, z2)
		this.drawSpace(g, t)
		g.popMatrix()
	}

	g.pushMatrix()
	

	// Zoom the face
	g.scale(zoomScale, zoomScale)

	g.translate(-w/2, -h/2)

	// Face background
	this.faceColor.fill(g, rainbow, .4*faceOpacity)
	g.rect(0, 0, w, h)

	g.pushMatrix()
	
	this.faceColor.s = 1 - rainbow/11
	
	// // console.log(stress)

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

			g.rect(i*pw + r*Math.sin(theta), j*ph + r*Math.cos(theta), pw + 1, ph + 1)
		}
	}

	let offset = new Vector()

	let fuzz = app.values.eyeFuzz
	for (var i = 0; i < 4; i++) {
		this.detailColor.hueShift(.1*fuzz*Math.sin(i + t)).fill(g, Math.sin(i), .3)
		offset.setToPolar(fuzz*i*utilities.noise(t), 20*utilities.noise(t*.02, i))
		g.pushMatrix()
		g.translate(offset.x, offset.y)

		this.drawEye(g, -1)
		this.drawEye(g, 1)
		this.drawMouth(g, t)
		g.popMatrix()
	}


	g.popMatrix()
	

	// Draw the debug 
	if (this.drawDebug) {
		g.translate(-50, -20)
		this.stress.draw(g, t)

		g.pushMatrix()
		g.translate(0, 100)
		this.mouth.draw(g, t)
		g.popMatrix()
	}

	g.popMatrix()

	this.particles.forEach(p => p.draw(g))


}