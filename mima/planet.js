// --- visions (2026-06-23 / generalised 2026-06-28) --------------------------
// Mima communes with subjects across every scale and does not rank them — a
// world, a sun, a nebula, a single atom, the deep water, the quantum foam are
// all the same kind of wonder to her. This module draws ONE summoned vision at
// a time into the same Processing canvas as the face (2D, HSB colour), floating
// small above her head while she stays visible beneath.
//
// Everything is drawn as soft dots/particles, in the same grain as the original
// planet, so the macro and micro share one visual language. `summon()` rolls a
// random subject; "another" (re-summon) crossfades to a different kind.
//
// Shown when app.values.planet > 0 (see face.draw) — the value name stays
// "planet" for wiring compatibility; think of it as "vision presence".

let planet = {
	rot: 0,            // generic auto-spin (planet axis / sun granulation), radians
	spin: 0.07,        // base spin (radians/sec)
	lastT: 0,
	subject: 'planet', // which vision is live
	subjectName: 'a world',
	S: null,           // rolled parameters for the live subject

	// Crossfade between visions when "another" re-summons (state stays worldgaze, so
	// the outer planetAmt doesn't move — this fades the current vision out and the
	// next one in). _fadeDir: -1 fading out to swap, +1 fading in, 0 steady.
	_fade: 1, _fadeDir: 0, _pending: null,

	// camera orbit (touch-to-rotate-your-view) — horizontal yaw only.
	dragRot: 0, dragVel: 0,
	lastX: null, dragging: false, attached: false,

	// [seaHue, landHue, saturation, skyHue] — all 0..1 (HSB) — for the planet subject
	palettes: [
		{ sea: 0.55, land: 0.32, sat: 0.55, sky: 0.55 }, // ocean & green
		{ sea: 0.74, land: 0.07, sat: 0.50, sky: 0.72 }, // violet & amber
		{ sea: 0.50, land: 0.02, sat: 0.50, sky: 0.52 }, // teal & rust
		{ sea: 0.60, land: 0.13, sat: 0.38, sky: 0.60 }, // ice & sand
		{ sea: 0.42, land: 0.28, sat: 0.45, sky: 0.45 }, // swamp green
	],

	// Stable pseudo-random scatter (0..1) from a number — for fixed per-particle
	// positions/phases that don't crawl frame to frame.
	_h(n) { let s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) },

	// utilities.noise is simplex (-1..1). When the value feeds a colour/alpha it must
	// be 0..1 — a negative hue crashes Processing's colour parser. Use this there.
	_n() { return (utilities.noise.apply(utilities, arguments) + 1) * 0.5 },

	// ============================ rolling a subject ============================
	_planetParams() {
		let counts = [0, 1, 1, 1, 2, 2, 2, 3]
		let mc = counts[Math.floor(Math.random() * counts.length)]
		let moons = []
		for (let i = 0; i < mc; i++) {
			moons.push({
				dist: 1.6 + Math.random() * 1.6,
				phase: Math.random() * Math.PI * 2,                 // fixed angle — turned by the touch
				size: 0.05 + Math.random() * 0.05,
				incl: (Math.random() - 0.5) * 0.9,
				bright: 0.70 + Math.random() * 0.20,
			})
		}
		let pal = this.palettes[Math.floor(Math.random() * this.palettes.length)]
		let ring = null
		if (Math.random() < 0.4) {
			let rin = 1.35 + Math.random() * 0.35
			ring = { rin: rin, rout: rin + 0.5 + Math.random() * 0.7, hue: pal.land }
		}
		return { seed: Math.random() * 1000, pal, tilt: (Math.random() - 0.5) * 1.0, moons, ring }
	},

	_subjectRoll() {
		// planet weighted a touch heavier (the flagship); everything else even.
		let bag = ['planet', 'planet', 'sun', 'star', 'nebula', 'atom', 'molecule',
			'ocean', 'waterfall', 'subatomic', 'comet', 'meteor']
		return bag[Math.floor(Math.random() * bag.length)]
	},

	_makeSubject() {
		let type = this._subjectRoll()
		let S = { type, tilt: (Math.random() - 0.5) * 1.0, seed: Math.random() * 1000 }
		if (type === 'planet') {
			Object.assign(S, this._planetParams())
		} else if (type === 'sun' || type === 'star') {
			S.star = (type === 'star')
			S.hue = S.star
				? (Math.random() < 0.5 ? 0.60 : 0.13)               // blue-white or gold star
				: (0.04 + Math.random() * 0.10)                     // red→gold sun
		} else if (type === 'nebula') {
			let a = Math.random()
			S.hueA = a; S.hueB = (a + 0.25 + Math.random() * 0.3) % 1
		} else if (type === 'atom') {
			S.nucleons = 5 + Math.floor(Math.random() * 8)
			let nsh = 1 + Math.floor(Math.random() * 3)
			S.shells = []
			for (let i = 0; i < nsh; i++) {
				S.shells.push({
					rad: 0.7 + i * 0.55 + Math.random() * 0.15,
					ax: Math.random() * Math.PI, ay: Math.random() * Math.PI,
					n: 1 + Math.floor(Math.random() * 3),
					speed: (0.8 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1),
					phase: Math.random() * Math.PI * 2,
				})
			}
			S.hue = 0.55 + Math.random() * 0.1
		} else if (type === 'molecule') {
			let shapes = [
				// water: O + 2H
				{ atoms: [[0, 0, 0, 0.6, 0.0], [-0.8, 0.6, 0, 0.4, 0.6], [0.8, 0.6, 0, 0.4, 0.6]], bonds: [[0, 1], [0, 2]] },
				// triatomic chain
				{ atoms: [[-1, 0, 0, 0.5, 0.33], [0, 0, 0, 0.55, 0.0], [1, 0, 0, 0.5, 0.55]], bonds: [[0, 1], [1, 2]] },
				// tetrahedral-ish
				{ atoms: [[0, 0, 0, 0.6, 0.0], [0.9, 0.5, 0.3, 0.4, 0.13], [-0.9, 0.5, -0.3, 0.4, 0.13], [0, -1, 0.4, 0.4, 0.13]], bonds: [[0, 1], [0, 2], [0, 3]] },
			]
			S.shape = shapes[Math.floor(Math.random() * shapes.length)]
		} else if (type === 'ocean') {
			S.hue = 0.52 + Math.random() * 0.08
		} else if (type === 'waterfall') {
			S.hue = 0.56 + Math.random() * 0.06
		} else if (type === 'subatomic') {
			// nothing extra — pure procedural foam
		} else if (type === 'comet') {
			let dir = Math.PI * 0.65 + (Math.random() - 0.5) * 0.6   // down-right-ish
			S.tailDir = [Math.cos(dir), Math.sin(dir)]
			S.hue = 0.55 + Math.random() * 0.08
		} else if (type === 'meteor') {
			// nothing extra — starfield + streaks
		}
		// The small-scale / surface subjects are not free-floating wonders — they
		// belong to a particular far world, shown as a small globe in the sky/corner.
		if (['ocean', 'waterfall', 'atom', 'molecule', 'subatomic'].indexOf(type) >= 0) {
			S.host = this._planetParams()
		}
		return S
	},

	_nameFor(type) {
		return ({
			planet: 'a world', sun: 'a sun', star: 'a star', nebula: 'a nebula',
			atom: 'a single atom of a far world', molecule: 'a molecule within a far world',
			ocean: 'the deep water of a far world', waterfall: 'a fall of water on a far world',
			subatomic: 'the quantum foam beneath a far world',
			comet: 'a comet', meteor: 'a sky of falling stars',
		})[type] || 'a wonder'
	},

	// Make a rolled subject the live one, and reset the view onto it.
	_apply(w) {
		this.S = w
		this.subject = w.type
		this.subjectName = this._nameFor(w.type)
		this.rot = Math.random() * Math.PI * 2
		this.dragRot = 0; this.dragVel = 0
	},

	// Pick a fresh vision (called from app.onEnterState when entering worldgaze). If
	// one is already on screen, crossfade to the new one; otherwise apply at once and
	// let the outer planetAmt fade it in.
	summon() {
		let w = this._makeSubject()
		// Name it now (not at the fade swap) so her words match the vision arriving.
		this.subjectName = this._nameFor(w.type)
		// Small-scale subjects (atom, ocean, waterfall…) are drawn WITH the tiny
		// world they belong to hanging in the sky (_miniWorld). Expose that so her
		// opening line can name it — unannounced it reads as a stray planet.
		this.hasHost = !!w.host
		let visible = (app.values.planet || 0) > 0.5 && this._fade > 0.05 && this.S
		if (visible) {
			this._pending = w
			this._fadeDir = -1
		} else {
			this._apply(w)
			this._fade = 1
			this._fadeDir = 0
			this._pending = null
		}
		this.attachInput()
	},

	attachInput() {
		if (this.attached) return
		this.attached = true
		let active = () => (app.values.planet || 0) > 0.05
		window.addEventListener('pointerdown', e => { if (active()) { this.dragging = true; this.lastX = e.clientX } })
		window.addEventListener('pointermove', e => {
			if (!this.dragging) return
			let dx = e.clientX - this.lastX
			this.lastX = e.clientX
			this.dragRot += dx * 0.01
			this.dragVel = dx * 0.01
		})
		let up = () => { this.dragging = false }
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
	},

	// ============================ math helpers ================================
	// Axial tilt (about screen x) — the subject's fixed world orientation (the sun
	// lives here, so it does not follow the viewer).
	_tilt(x, y, z, ct, st) { return [x, y * ct - z * st, y * st + z * ct] },
	// Camera orbit — horizontal yaw about screen y. Only changes what we SEE.
	_orbit(x, y, z, cy, sy) { return [x * cy + z * sy, y, -x * sy + z * cy] },
	// Rotate a vector about x by ax, then about y by ay (for tilted orbit planes etc).
	_rot3(x, y, z, ax, ay) {
		let cx = Math.cos(ax), sx = Math.sin(ax)
		let y1 = y * cx - z * sx, z1 = y * sx + z * cx
		let cyy = Math.cos(ay), syy = Math.sin(ay)
		return [x * cyy + z1 * syy, y1, -x * syy + z1 * cyy]
	},
	// A small shaded sphere of dots, lit from screen upper-left — used for nuclei,
	// molecule atoms, comet heads.
	_ball(g, cx, cy, r, hue, sat, A, alphaMul) {
		alphaMul = (alphaMul === undefined) ? 1 : alphaMul
		let ML = 5, MO = 10
		for (let i = 0; i <= ML; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / ML)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let steps = Math.max(4, Math.round(MO * cphi))
			for (let j = 0; j < steps; j++) {
				let lam = (j / steps) * Math.PI * 2
				let nx = cphi * Math.cos(lam), ny = sphi, nz = cphi * Math.sin(lam)
				if (nz <= 0) continue
				let lamb = Math.max(0, nx * -0.4 + ny * -0.4 + nz * 0.82)
				let b = 0.25 + 0.75 * lamb
				let dotR = (r * 2 / MO) * 1.7 * (0.6 + 0.5 * nz)
				g.fill(hue, sat, b, A * alphaMul)
				g.ellipse(cx + r * nx, cy - r * ny, dotR, dotR)
			}
		}
	},

	// A small lit globe drawn as an anchor for the surface/micro subjects — the world
	// this water / atom / foam belongs to, hanging in the sky or the corner so the
	// detail reads as part of something, not a free-floating wonder.
	_miniWorld(g, cx, cy, r, host, t, A) {
		let pal = host.pal
		let ct = Math.cos(host.tilt), st = Math.sin(host.tilt)
		let rot = t * 0.18
		let L = [-0.5, -0.45, 0.74]
		let LAT = 16, LON = 30
		for (let i = 0; i <= LAT; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / LAT)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let lonSteps = Math.max(5, Math.round(LON * cphi))
			for (let j = 0; j < lonSteps; j++) {
				let lam = (j / lonSteps) * Math.PI * 2
				let nx0 = cphi * Math.sin(lam), ny0 = sphi, nz0 = cphi * Math.cos(lam)
				let vlam = lam + rot
				let [tx, ty, tz] = this._tilt(cphi * Math.sin(vlam), sphi, cphi * Math.cos(vlam), ct, st)
				if (tz <= 0) continue
				let lamb = Math.max(0, tx * L[0] + ty * L[1] + tz * L[2])
				let n = utilities.noise(nx0 * 1.7 + host.seed, ny0 * 1.7, nz0 * 1.7)
				let isLand = n > 0.55
				let b = (0.1 + 0.95 * lamb) * (isLand ? 0.95 : 0.82)
				b *= 0.4 + 0.6 * tz
				let hue = isLand ? pal.land : pal.sea
				let sat = pal.sat * (isLand ? 1 : 0.92)
				let dotR = (r * 2 / LON) * 1.7 * (0.6 + 0.5 * tz)
				g.fill(hue, sat, b, A)
				g.ellipse(cx + r * tx, cy - r * ty, dotR, dotR)
			}
		}
	},

	// ================================ draw ====================================
	draw(g, t, presence) {
		if (!this.S) this.summon()
		let dt = this.lastT ? Math.min(0.05, t - this.lastT) : 0.016
		this.lastT = t
		this.rot += this.spin * dt
		if (!this.dragging) { this.dragRot += this.dragVel; this.dragVel *= 0.92 }

		// Crossfade machine: fade the current vision out, swap, fade the new one in.
		let fadeSpeed = 1 / 0.6
		if (this._fadeDir < 0) {
			this._fade -= fadeSpeed * dt
			if (this._fade <= 0) {
				this._fade = 0
				if (this._pending) { this._apply(this._pending); this._pending = null }
				this._fadeDir = 1
			}
		} else if (this._fadeDir > 0) {
			this._fade += fadeSpeed * dt
			if (this._fade >= 1) { this._fade = 1; this._fadeDir = 0 }
		}

		let R = g.height * 0.065
		let A = presence * this._fade

		g.pushMatrix()
		g.translate(0, -g.height * 0.30)   // up, above the face
		g.noStroke()

		switch (this.subject) {
			case 'planet': this._drawPlanet(g, t, A, R); break
			case 'sun':
			case 'star': this._drawSun(g, t, A, R); break
			case 'nebula': this._drawNebula(g, t, A, R); break
			case 'atom': this._drawAtom(g, t, A, R); break
			case 'molecule': this._drawMolecule(g, t, A, R); break
			case 'ocean': this._drawOcean(g, t, A, R); break
			case 'waterfall': this._drawWaterfall(g, t, A, R); break
			case 'subatomic': this._drawSubatomic(g, t, A, R); break
			case 'comet': this._drawComet(g, t, A, R); break
			case 'meteor': this._drawMeteor(g, t, A, R); break
			default: this._drawPlanet(g, t, A, R)
		}

		g.popMatrix()
	},

	// ------------------------------- planet -----------------------------------
	_drawPlanet(g, t, A, R) {
		let S = this.S, pal = S.pal
		let rot = this.rot
		let ct = Math.cos(S.tilt), st = Math.sin(S.tilt)
		let cy = Math.cos(this.dragRot), sy = Math.sin(this.dragRot)
		let L = [-0.5, -0.45, 0.74]

		let [slvx, slvy, slvz] = this._orbit(L[0], L[1], L[2], cy, sy)
		let sl = Math.hypot(slvx, slvy, slvz) || 1
		let sunHat = [slvx / sl, slvy / sl, slvz / sl]

		// moons — fixed satellites turned by the touch-spin (no autonomous orbit).
		let moons = (S.moons || []).map(m => {
			let ang = m.phase
			let mx = m.dist * Math.cos(ang), mz0 = m.dist * Math.sin(ang)
			let my = -mz0 * Math.sin(m.incl), mz = mz0 * Math.cos(m.incl)
			let [tx, ty, tz] = this._tilt(mx, my, mz, ct, st)
			let [vx, vy, vz] = this._orbit(tx, ty, tz, cy, sy)
			let comp = tx * L[0] + ty * L[1] + tz * L[2]
			let ecl = 1, red = 0
			if (comp < 0) {
				let perp = Math.sqrt(Math.max(0, m.dist * m.dist - comp * comp))
				let s = Math.min(1, Math.max(0, (perp - 0.55) / 0.85))
				ecl = 0.1 + 0.9 * s; red = 1 - s
			}
			return { x: vx, y: vy, z: vz, size: m.size, bright: m.bright, ecl, red }
		})
		let drawMoon = p => {
			if (p.z < 0 && Math.hypot(p.x, p.y) < 1) return
			let depth = 0.8 + 0.4 * ((p.z + 2) / 4)
			let mr = Math.max(1.6, R * p.size * depth)
			let cx = R * p.x, cyy = -R * p.y
			let hue = 0.62 * (1 - p.red) + 0.03 * p.red
			let sat = 0.06 * (1 - p.red) + 0.55 * p.red
			let ML = 6, MO = 12
			for (let i = 0; i <= ML; i++) {
				let phi = -Math.PI / 2 + Math.PI * (i / ML)
				let cphi = Math.cos(phi), sphi = Math.sin(phi)
				let steps = Math.max(4, Math.round(MO * cphi))
				for (let j = 0; j < steps; j++) {
					let lam = (j / steps) * Math.PI * 2
					let nx = cphi * Math.cos(lam), ny = sphi, nz = cphi * Math.sin(lam)
					if (nz <= 0) continue
					let lamb = Math.max(0, nx * sunHat[0] + ny * sunHat[1] + nz * sunHat[2])
					let b = (0.08 + 0.92 * lamb) * p.ecl
					b *= 0.5 + 0.5 * nz
					let dotR = (mr * 2 / MO) * 1.7 * (0.6 + 0.5 * nz)
					g.fill(hue, sat, b, A)
					g.ellipse(cx + mr * nx, cyy - mr * ny, dotR, dotR)
				}
			}
		}

		// ring — a flat annulus of fine dust in the equatorial plane.
		let ringPts = [], ringHue = 0.10, ringSat = 0.28, ringLit = 0
		if (S.ring) {
			let r = S.ring; ringHue = r.hue
			let pole = this._tilt(0, 1, 0, ct, st)
			ringLit = Math.min(1, 0.30 + 0.70 * Math.abs(pole[0] * L[0] + pole[1] * L[1] + pole[2] * L[2]))
			let bands = 7, steps = 150
			for (let b = 0; b < bands; b++) {
				let rad = r.rin + (r.rout - r.rin) * (b + 0.5) / bands
				for (let k = 0; k < steps; k++) {
					let th = (k / steps) * Math.PI * 2
					let [tx, ty, tz] = this._tilt(rad * Math.cos(th), 0, rad * Math.sin(th), ct, st)
					let [vx, vy, vz] = this._orbit(tx, ty, tz, cy, sy)
					let comp = tx * L[0] + ty * L[1] + tz * L[2]
					let sh = 1
					if (comp < 0) { let perp = Math.sqrt(Math.max(0, rad * rad - comp * comp)); sh = perp < 1 ? 0.25 : 1 }
					ringPts.push({ x: vx, y: vy, z: vz, rad, sh })
				}
			}
		}
		let drawRingPt = p => {
			if (p.z < 0 && Math.hypot(p.x, p.y) < 1) return
			let band = 0.70 + 0.30 * Math.sin(p.rad * 9)
			let b = ringLit * band * p.sh
			let dotR = R * 0.022 * (0.8 + 0.4 * ((p.z + 2) / 4))
			g.fill(ringHue, ringSat, b, A * 0.9)
			g.ellipse(R * p.x, -R * p.y, dotR, dotR)
		}

		moons.filter(p => p.z <= 0).forEach(drawMoon)
		ringPts.filter(p => p.z <= 0).forEach(drawRingPt)

		let LAT = 24, LON = 48
		for (let i = 0; i <= LAT; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / LAT)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let lonSteps = Math.max(6, Math.round(LON * cphi))
			for (let j = 0; j < lonSteps; j++) {
				let lam = (j / lonSteps) * Math.PI * 2
				let nx0 = cphi * Math.sin(lam), ny0 = sphi, nz0 = cphi * Math.cos(lam)
				let vlam = lam + rot
				let [tx, ty, tz] = this._tilt(cphi * Math.sin(vlam), sphi, cphi * Math.cos(vlam), ct, st)
				let lamb = Math.max(0, tx * L[0] + ty * L[1] + tz * L[2])
				let [nx, ny, nz] = this._orbit(tx, ty, tz, cy, sy)
				if (nz <= 0) continue
				let n = utilities.noise(nx0 * 1.7 + S.seed, ny0 * 1.7, nz0 * 1.7)
				let isLand = n > 0.55
				let b = (0.1 + 0.95 * lamb) * (isLand ? 0.95 : 0.82)
				b *= 0.4 + 0.6 * nz
				let hue = isLand ? pal.land : pal.sea
				let sat = pal.sat * (isLand ? 1 : 0.92)
				let dotR = (R * 2 / LON) * 1.6 * (0.6 + 0.5 * nz)
				g.fill(hue, sat, b, A)
				g.ellipse(R * nx, -R * ny, dotR, dotR)
			}
		}

		ringPts.filter(p => p.z > 0).forEach(drawRingPt)
		moons.filter(p => p.z > 0).forEach(drawMoon)
	},

	// ------------------------------ sun / star --------------------------------
	_drawSun(g, t, A, R) {
		let S = this.S
		let star = S.star
		let Rs = star ? R * 0.55 : R * 1.18
		let hue = S.hue
		let cy = Math.cos(this.dragRot), sy = Math.sin(this.dragRot)
		let rot = this.rot

		// corona — sparse flickering dots beyond the limb.
		let cor = star ? 40 : 90
		for (let i = 0; i < cor; i++) {
			let ang = this._h(i) * Math.PI * 2
			let rr = Rs * (1.04 + this._h(i + 1.7) * (star ? 0.5 : 0.7))
			let fl = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * (1 + this._h(i) * 3) + i)), 2)
			g.fill(hue, 0.5, 1, A * 0.06 * fl)
			g.ellipse(Math.cos(ang) * rr, Math.sin(ang) * rr, R * 0.05, R * 0.05)
		}

		// diffraction spikes for a star (four-point glint).
		if (star) {
			for (let s = 0; s < 4; s++) {
				let aa = s * Math.PI / 2 + Math.PI / 4
				let gl = 0.5 + 0.5 * Math.sin(t * 1.3 + s)
				for (let k = 1; k <= 7; k++) {
					let d = Rs * (1 + k * 0.28)
					g.fill(hue, 0.2, 1, A * 0.10 * gl * (1 - k / 8))
					g.ellipse(Math.cos(aa) * d, Math.sin(aa) * d, R * 0.04, R * 0.04)
				}
			}
		}

		// granulated emissive sphere.
		let LAT = 22, LON = 44
		for (let i = 0; i <= LAT; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / LAT)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let lonSteps = Math.max(6, Math.round(LON * cphi))
			for (let j = 0; j < lonSteps; j++) {
				let lam = (j / lonSteps) * Math.PI * 2
				let nx0 = cphi * Math.sin(lam), ny0 = sphi, nz0 = cphi * Math.cos(lam)
				let vlam = lam + rot
				let nx = cphi * Math.sin(vlam) * cy + cphi * Math.cos(vlam) * sy
				let nz = -cphi * Math.sin(vlam) * sy + cphi * Math.cos(vlam) * cy
				let ny = sphi
				if (nz <= 0) continue
				let gran = utilities.noise(nx0 * 3.0 + S.seed, ny0 * 3.0, nz0 * 3.0 + t * 0.25)
				let bright = 0.7 + 0.5 * gran
				bright *= 0.55 + 0.45 * nz           // gentle limb darkening
				let sat = Math.max(0.05, Math.min(0.85, 0.7 - 0.55 * gran))   // hottest cells go white
				let dotR = (Rs * 2 / LON) * 1.7 * (0.6 + 0.5 * nz)
				g.fill(hue, sat, Math.min(1, bright), A)
				g.ellipse(Rs * nx, -Rs * ny, dotR, dotR)
			}
		}
	},

	// ------------------------------- nebula -----------------------------------
	_drawNebula(g, t, A, R) {
		let S = this.S
		let spread = R * 2.6
		let swirl = t * 0.02 + this.dragRot * 0.25
		// dust
		let N = 260
		for (let i = 0; i < N; i++) {
			let ang = this._h(i) * Math.PI * 2 + swirl
			let rad = Math.sqrt(this._h(i + 1.3)) * spread
			let dx = (utilities.noise(i * 0.07, t * 0.05) - 0.5) * spread * 0.55
			let dy = (utilities.noise(i * 0.07 + 9, t * 0.05) - 0.5) * spread * 0.55
			let x = Math.cos(ang) * rad + dx
			let y = Math.sin(ang) * rad * 0.72 + dy
			let d = this._n(x * 0.004 + S.seed, y * 0.004, t * 0.03)   // 0..1 density
			let hue = (S.hueA + (S.hueB - S.hueA) * d + 1) % 1
			let a = A * (0.04 + 0.12 * d)
			let sz = R * 0.11 * (0.6 + 0.9 * d)
			g.fill(hue, 0.6, 0.45 + 0.45 * d, a)
			g.ellipse(x, y, sz, sz)
		}
		// embedded stars
		let ST = 55
		for (let i = 0; i < ST; i++) {
			let sx = (this._h(i + 5) * 2 - 1) * spread
			let sy = (this._h(i + 9) * 2 - 1) * spread * 0.8
			let tw = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * (0.6 + this._h(i) * 1.2) + this._h(i + 2) * 6.28)), 2)
			g.fill(0.6, 0.12, 1, A * 0.5 * tw)
			g.ellipse(sx, sy, R * 0.032, R * 0.032)
			g.fill(0.6, 0, 1, A * 0.8 * tw)
			g.ellipse(sx, sy, R * 0.012, R * 0.012)
		}
	},

	// -------------------------------- atom ------------------------------------
	_drawAtom(g, t, A, R) {
		let S = this.S
		if (S.host) this._miniWorld(g, -R * 1.75, -R * 1.6, R * 0.38, S.host, t, A)   // the world it belongs to
		let cy = this.dragRot
		let hue = S.hue

		// nucleus — a knot of jiggling nucleon balls.
		let nucR = R * 0.22
		for (let i = 0; i < S.nucleons; i++) {
			let a = this._h(i) * Math.PI * 2, b = Math.acos(2 * this._h(i + 1) - 1)
			let rr = nucR * Math.cbrt(this._h(i + 2))
			let px = rr * Math.sin(b) * Math.cos(a)
			let py = rr * Math.sin(b) * Math.sin(a)
			let pz = rr * Math.cos(b)
			px += (utilities.noise(i, t * 1.5) - 0.5) * R * 0.05
			py += (utilities.noise(i + 7, t * 1.5) - 0.5) * R * 0.05
			let [vx, vy, vz] = this._orbit(px, py, pz, Math.cos(cy), Math.sin(cy))
			let nh = (i % 2) ? 0.0 : 0.6                 // proton (red) / neutron (blue)
			this._ball(g, vx, -vy, R * 0.07, nh, 0.55, A, 0.5 + 0.5 * ((vz + nucR) / (2 * nucR)))
		}

		// electron shells — faint tilted orbit rings + bright electrons.
		S.shells.forEach((sh, si) => {
			let rad = sh.rad * R
			// orbit ring
			let steps = 64
			for (let k = 0; k < steps; k++) {
				let th = (k / steps) * Math.PI * 2
				let [x, y, z] = this._rot3(rad * Math.cos(th), 0, rad * Math.sin(th), sh.ax, sh.ay + cy)
				let depth = 0.6 + 0.4 * ((z + rad) / (2 * rad))
				g.fill(hue, 0.4, 0.8, A * 0.12 * depth)
				g.ellipse(x, -y, R * 0.018, R * 0.018)
			}
			// electrons
			for (let e = 0; e < sh.n; e++) {
				let ang = sh.phase + (e / sh.n) * Math.PI * 2 + t * sh.speed
				let [x, y, z] = this._rot3(rad * Math.cos(ang), 0, rad * Math.sin(ang), sh.ax, sh.ay + cy)
				let depth = 0.55 + 0.45 * ((z + rad) / (2 * rad))
				g.fill(0.6, 0.2, 1, A * 0.35 * depth)
				g.ellipse(x, -y, R * 0.10, R * 0.10)
				g.fill(0.6, 0.05, 1, A * depth)
				g.ellipse(x, -y, R * 0.045, R * 0.045)
			}
		})
	},

	// ------------------------------ molecule ----------------------------------
	_drawMolecule(g, t, A, R) {
		let S = this.S, shape = S.shape
		if (S.host) this._miniWorld(g, -R * 1.75, -R * 1.6, R * 0.38, S.host, t, A)   // the world it belongs to
		let ax = t * 0.12 + 0.3 * Math.sin(t * 0.5)
		let ay = this.dragRot + t * 0.1
		let scale = R * 0.9
		// transform atoms to view space
		let pts = shape.atoms.map((at, i) => {
			let wob = 0.04 * Math.sin(t * 3 + i)        // gentle vibration
			let [x, y, z] = this._rot3((at[0] + wob) * scale, (at[1] - wob) * scale, at[2] * scale, ax, ay)
			return { x, y, z, rad: at[3], hue: at[4], i }
		})
		// bonds — lines of dots between bonded atoms (drawn under the atoms).
		shape.bonds.forEach(([a, b]) => {
			let pa = pts[a], pb = pts[b]
			let seg = 10
			for (let k = 1; k < seg; k++) {
				let f = k / seg
				let x = pa.x + (pb.x - pa.x) * f
				let y = pa.y + (pb.y - pa.y) * f
				let z = pa.z + (pb.z - pa.z) * f
				let depth = 0.55 + 0.45 * ((z + scale) / (2 * scale))
				g.fill(0.0, 0, 0.85, A * 0.5 * depth)
				g.ellipse(x, -y, R * 0.025, R * 0.025)
			}
		})
		// atoms — back to front.
		pts.sort((p, q) => p.z - q.z).forEach(p => {
			this._ball(g, p.x, -p.y, R * 0.16 * p.rad, p.hue, 0.55, A, 0.5 + 0.5 * ((p.z + scale) / (2 * scale)))
		})
	},

	// ------------------------------- ocean ------------------------------------
	_drawOcean(g, t, A, R) {
		let S = this.S, hue = S.hue
		if (S.host) this._miniWorld(g, -R * 1.7, -R * 1.55, R * 0.42, S.host, t, A)   // its world, low in the sky
		let cols = 44, rows = 20
		let pan = this.dragRot * R * 0.6
		for (let j = 0; j < rows; j++) {
			let fz = j / rows                            // 0 far .. 1 near
			let persp = 0.32 + 0.7 * fz
			let baseY = R * (-1.0 + 2.0 * fz)
			for (let i = 0; i <= cols; i++) {
				let u = i / cols - 0.5
				let x = u * R * 5.2 * persp + pan * persp
				let h = Math.sin(i * 0.55 + t * 1.3) + 0.6 * Math.sin(j * 0.9 - t * 1.7)
					+ 0.5 * (utilities.noise(i * 0.2, j * 0.2, t * 0.5) - 0.5) * 2
				let y = baseY + h * R * 0.11 * persp
				let crest = Math.max(0, h) * 0.5
				let b = 0.28 + 0.32 * persp + 0.4 * crest
				g.fill(hue, 0.55 - 0.25 * crest, Math.min(1, b), A * (0.45 + 0.4 * persp))
				g.ellipse(x, y, R * 0.07 * persp, R * 0.05 * persp)
				if (crest > 0.32) {                       // foam fleck on the crests
					g.fill(hue, 0.08, 1, A * 0.7 * persp)
					g.ellipse(x, y - R * 0.02 * persp, R * 0.03 * persp, R * 0.03 * persp)
				}
			}
		}
	},

	// ------------------------------ waterfall ---------------------------------
	_drawWaterfall(g, t, A, R) {
		let S = this.S, hue = S.hue
		if (S.host) this._miniWorld(g, R * 1.6, -R * 1.55, R * 0.42, S.host, t, A)   // its world, off in the sky
		let topY = -R * 1.5, botY = R * 1.1, span = botY - topY
		let width = R * 1.7
		let N = 300
		for (let i = 0; i < N; i++) {
			let col = this._h(i)
			let speed = 1.4 + this._h(i + 2) * 1.6
			let yy = topY + (((t * speed * R) + this._h(i + 1) * span) % span)
			let prog = (yy - topY) / span
			let x = (col - 0.5) * width + (utilities.noise(i, yy * 0.02) - 0.5) * R * 0.25 * prog
			let b = 0.6 + 0.3 * utilities.noise(i, yy * 0.05)
			g.fill(hue, 0.22, b, A * 0.7)
			g.ellipse(x, yy, R * 0.045, R * 0.12)        // vertical streak
		}
		// mist at the foot — billowing soft puffs.
		let M = 70
		for (let i = 0; i < M; i++) {
			let mx = (this._h(i) - 0.5) * width * 1.3 + (utilities.noise(i, t * 0.3) - 0.5) * R * 0.4
			let my = botY - this._h(i + 3) * R * 0.4 + (utilities.noise(i + 5, t * 0.3) - 0.5) * R * 0.2
			let pf = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.4 + this._h(i)) + i))
			g.fill(hue, 0.1, 1, A * 0.10 * pf)
			g.ellipse(mx, my, R * 0.16, R * 0.13)
		}
	},

	// ----------------------------- subatomic ----------------------------------
	_drawSubatomic(g, t, A, R) {
		if (this.S.host) this._miniWorld(g, -R * 1.75, -R * 1.6, R * 0.38, this.S.host, t, A)   // the world it belongs to
		let spread = R * 1.8
		// probability clouds — fuzzy dots winking in and out, hue drifting.
		let N = 120
		for (let i = 0; i < N; i++) {
			let pop = Math.pow(Math.max(0, Math.sin(t * (0.5 + this._h(i) * 1.2) + this._h(i + 1) * 6.28)), 2)
			if (pop < 0.02) continue
			let x = (utilities.noise(i * 0.13, t * 0.12) - 0.5) * spread * 2.2
			let y = (utilities.noise(i * 0.13 + 5, t * 0.12) - 0.5) * spread * 2.2
			let hue = this._n(i, t * 0.2)               // 0..1 (simplex is -1..1 — would crash as a hue)
			g.fill(hue, 0.5, 0.95, A * 0.4 * pop)
			g.ellipse(x, y, R * 0.09 * (0.5 + pop), R * 0.09 * (0.5 + pop))
		}
		// virtual pairs — two opposite particles appear, separate, vanish.
		let P = 26
		for (let i = 0; i < P; i++) {
			let ph = (t * 0.6 + this._h(i) * 6.28) % Math.PI
			let life = Math.sin(ph)
			if (life <= 0.02) continue
			let cx = (this._h(i + 2) * 2 - 1) * spread
			let cy = (this._h(i + 3) * 2 - 1) * spread
			let dir = this._h(i + 4) * Math.PI * 2
			let sep = life * R * 0.42
			let ox = Math.cos(dir) * sep, oy = Math.sin(dir) * sep
			g.fill(0.0, 0.6, 1, A * 0.6 * life)
			g.ellipse(cx + ox, cy + oy, R * 0.045, R * 0.045)
			g.fill(0.6, 0.6, 1, A * 0.6 * life)
			g.ellipse(cx - ox, cy - oy, R * 0.045, R * 0.045)
		}
	},

	// -------------------------------- comet -----------------------------------
	_drawComet(g, t, A, R) {
		let S = this.S
		let dir = S.tailDir
		let perp = [-dir[1], dir[0]]
		let hx = -dir[0] * R * 0.6, hy = -dir[1] * R * 0.6   // head sits up-stream of centre
		let N = 220
		for (let i = 0; i < N; i++) {
			let d = this._h(i)                            // 0 head .. 1 tail tip
			let drift = ((t * 0.25 + this._h(i + 1)) % 1)
			let len = (d * 0.6 + drift * 0.4) * R * 2.6
			let curve = d * d * R * 0.5
			let jit = (utilities.noise(i, t) - 0.5) * R * 0.18 * d
			let x = hx + dir[0] * len + perp[0] * (curve + jit)
			let y = hy + dir[1] * len + perp[1] * (curve + jit)
			let a = A * (1 - d) * 0.55
			// dust tail warm, with a bluish ion streak near the spine.
			let ion = Math.abs(jit) < R * 0.05
			let hue = ion ? 0.6 : 0.12
			g.fill(hue, ion ? 0.5 : 0.4, 1, a)
			g.ellipse(x, y, R * 0.04, R * 0.04)
		}
		// coma glow + bright nucleus.
		g.fill(S.hue, 0.3, 1, A * 0.12)
		g.ellipse(hx, hy, R * 0.5, R * 0.5)
		this._ball(g, hx, hy, R * 0.12, 0.14, 0.25, A)
	},

	// -------------------------------- meteor ----------------------------------
	_drawMeteor(g, t, A, R) {
		// faint starfield
		for (let i = 0; i < 60; i++) {
			let sx = (this._h(i) * 2 - 1) * R * 3
			let sy = (this._h(i + 3) * 2 - 1) * R * 2.4
			let tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + this._h(i)) + i))
			g.fill(0.6, 0.1, 1, A * 0.4 * tw)
			g.ellipse(sx, sy, R * 0.02, R * 0.02)
		}
		// streaks — each falls along a diagonal, recycling on its own cycle.
		let M = 7
		for (let i = 0; i < M; i++) {
			let period = 2.2 + this._h(i) * 2.5
			let ph = ((t + this._h(i + 1) * period) % period) / period   // 0..1 across the sky
			let ang = Math.PI * 0.72 + (this._h(i + 2) - 0.5) * 0.4
			let dx = Math.cos(ang), dy = Math.sin(ang)
			let startX = (this._h(i + 5) * 2 - 1) * R * 3 - dx * R * 3
            let startY = -R * 2.6 - dy * R * 0.5
			let cx = startX + dx * ph * R * 6
			let cy = startY + dy * ph * R * 6
			let bright = Math.sin(ph * Math.PI)          // fade in/out over the arc
			if (bright <= 0.02) continue
			// trailing tail of shrinking, fading dots.
			for (let k = 0; k < 12; k++) {
				let tx = cx - dx * k * R * 0.12
				let ty = cy - dy * k * R * 0.12
				let a = A * bright * (1 - k / 12) * 0.9
				g.fill(0.12, 0.15, 1, a)
				g.ellipse(tx, ty, R * 0.05 * (1 - k / 16), R * 0.05 * (1 - k / 16))
			}
		}
	},
}
