// --- planet (2026-06-23) ----------------------------------------------------
// A minimal, slowly-rotating procedural planet drawn into the same Processing
// canvas as the face (2D, HSB colour, utilities.noise for the surface). Shown
// when app.values.planet > 0 (see face.draw); it floats small, above Mima's
// head, so she stays visible beneath it.
//
// How the sphere is faked in 2D: walk a lat/lon grid, keep only the front
// hemisphere, place each cell as a dot. The surface noise is sampled on the
// planet-FIXED normal (so continents stick to the surface and ride the spin),
// while the SCREEN position uses the rotated+tilted+orbited normal. Lambert
// shading from a fixed light gives the day/night terminator; limb darkening
// + a tight atmosphere rim sell the curvature.
//
// Two independent rotations:
//   rot     — the planet's own spin about its (tilted) axis. Always runs.
//   dragRot — the viewer's camera orbiting around the planet (azimuth). Driven
//             by touch-drag; the planet keeps spinning underneath it.

let planet = {
	rot: 0,            // auto-spin about the planet's axis, radians
	spin: 0.07,        // base spin (radians/sec)
	tilt: -0.32,       // axial tilt — randomised per planet in summon()
	lastT: 0,
	seed: 0,
	pal: null,
	moons: [],

	// Crossfade between worlds when "another" re-summons (state stays worldgaze, so
	// the outer planetAmt doesn't move — this fades the current world out and the
	// next one in). _fadeDir: -1 fading out to swap, +1 fading in, 0 steady.
	_fade: 1, _fadeDir: 0, _pending: null,

	// camera orbit (touch-to-rotate-your-view) — yaw (horizontal) + pitch (vertical)
	dragRot: 0, dragVel: 0, dragPitch: 0, dragVelY: 0,
	lastX: null, lastY: null, dragging: false, attached: false,

	// [seaHue, landHue, saturation, skyHue] — all 0..1 (HSB)
	palettes: [
		{ sea: 0.55, land: 0.32, sat: 0.55, sky: 0.55 }, // ocean & green
		{ sea: 0.74, land: 0.07, sat: 0.50, sky: 0.72 }, // violet & amber
		{ sea: 0.50, land: 0.02, sat: 0.50, sky: 0.52 }, // teal & rust
		{ sea: 0.60, land: 0.13, sat: 0.38, sky: 0.60 }, // ice & sand
		{ sea: 0.42, land: 0.28, sat: 0.45, sky: 0.45 }, // swamp green
	],

	// Roll the parameters for a fresh world (without applying them yet).
	_makeWorld() {
		// A certain number of moons — usually one or two, occasionally none or three.
		let counts = [0, 1, 1, 1, 2, 2, 2, 3]
		let mc = counts[Math.floor(Math.random() * counts.length)]
		let moons = []
		for (let i = 0; i < mc; i++) {
			moons.push({
				dist: 1.6 + Math.random() * 1.6,                        // in planet-radii
				speed: (0.12 + Math.random() * 0.30) * (Math.random() < 0.5 ? -1 : 1),
				phase: Math.random() * Math.PI * 2,
				size: 0.10 + Math.random() * 0.08,                      // in planet-radii
				incl: (Math.random() - 0.5) * 0.9,                      // orbit-plane tilt
				bright: 0.70 + Math.random() * 0.20,
			})
		}
		return {
			seed: Math.random() * 1000,
			pal: this.palettes[Math.floor(Math.random() * this.palettes.length)],
			tilt: (Math.random() - 0.5) * 1.0,                          // own axial tilt (±~30°)
			moons: moons,
		}
	},

	// Make a rolled world the live one, and reset the view onto it.
	_apply(w) {
		this.seed = w.seed
		this.pal = w.pal
		this.tilt = w.tilt
		this.moons = w.moons
		this.dragRot = 0; this.dragVel = 0
		this.dragPitch = 0; this.dragVelY = 0
	},

	// Pick a fresh world (called from app.onEnterState when entering worldgaze). If a
	// world is already on screen, crossfade to the new one; otherwise apply at once
	// and let the outer planetAmt fade it in.
	summon() {
		let w = this._makeWorld()
		let visible = (app.values.planet || 0) > 0.5 && this._fade > 0.05 && this.pal
		if (visible) {
			this._pending = w       // swap at the bottom of the fade-out
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
		window.addEventListener('pointerdown', e => { if (active()) { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY } })
		window.addEventListener('pointermove', e => {
			if (!this.dragging) return
			let dx = e.clientX - this.lastX
			let dy = e.clientY - this.lastY
			this.lastX = e.clientX
			this.lastY = e.clientY
			this.dragRot += dx * 0.01     // yaw — orbit left/right
			this.dragPitch += dy * 0.01   // pitch — orbit up/down
			this.dragPitch = Math.max(-1.5, Math.min(1.5, this.dragPitch))  // don't flip over the poles
			this.dragVel = dx * 0.01      // remember last deltas for release momentum
			this.dragVelY = dy * 0.01
		})
		let up = () => { this.dragging = false }
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
	},

	// Apply the planet's axial tilt (about screen x) to a planet-space vector.
	// This is the planet's fixed world orientation — the SUN lives in this frame,
	// so it does not follow the viewer.
	_tilt(x, y, z, ct, st) {
		return [x, y * ct - z * st, y * st + z * ct]
	},
	// Apply the viewer's camera orbit — yaw (about screen y) then pitch (about
	// screen x), so you can turn the world any way you like. Only changes what we
	// SEE, not what is lit. Returns [x, y, z] (z>0 = facing the viewer).
	_orbit(x, y, z, cy, sy, cp, sp) {
		// yaw about y
		let x1 = x * cy + z * sy
		let z1 = -x * sy + z * cy
		// pitch about x
		let y2 = y * cp - z1 * sp
		let z2 = y * sp + z1 * cp
		return [x1, y2, z2]
	},

	draw(g, t, presence) {
		if (!this.pal) this.summon()
		let dt = this.lastT ? Math.min(0.05, t - this.lastT) : 0.016
		this.lastT = t
		this.rot += this.spin * dt                                      // keep spinning on its axis
		if (!this.dragging) {                                           // camera momentum
			this.dragRot += this.dragVel; this.dragVel *= 0.92
			this.dragPitch = Math.max(-1.5, Math.min(1.5, this.dragPitch + this.dragVelY)); this.dragVelY *= 0.92
		}

		// Crossfade machine: fade the current world out, swap, fade the new one in.
		let fadeSpeed = 1 / 0.6                                         // ~0.6s each way
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

		let rot = this.rot                  // planet's own spin (surface only)
		let R = g.height * 0.065            // small — half the previous size
		let pal = this.pal
		let A = presence * this._fade       // outer state fade * inner crossfade
		let ct = Math.cos(this.tilt), st = Math.sin(this.tilt)
		let cy = Math.cos(this.dragRot), sy = Math.sin(this.dragRot)    // camera yaw
		let cp = Math.cos(this.dragPitch), sp = Math.sin(this.dragPitch) // camera pitch
		// Light lives in the planet's tilted (world) frame, NOT the camera frame —
		// so orbiting the view sweeps the terminator across the disc, as if you are
		// circling the planet rather than spinning it under a fixed lamp.
		let L = [-0.5, -0.45, 0.74]         // upper-left, toward the sunward side

		g.pushMatrix()
		g.translate(0, -g.height * 0.30)    // up, above the face
		g.noStroke()

		// Moon positions (planet-space orbit → tilt → camera orbit), split by depth
		// so the ones behind the planet draw first.
		let moons = this.moons.map(m => {
			let ang = m.phase + m.speed * t
			let mx = m.dist * Math.cos(ang)
			let mz0 = m.dist * Math.sin(ang)
			let my = -mz0 * Math.sin(m.incl)          // orbit-plane inclination (about x)
			let mz = mz0 * Math.cos(m.incl)
			let [tx, ty, tz] = this._tilt(mx, my, mz, ct, st)
			let [vx, vy, vz] = this._orbit(tx, ty, tz, cy, sy, cp, sp)
			return { x: vx, y: vy, z: vz, size: m.size, bright: m.bright }
		})
		let drawMoon = p => {
			let depth = 0.8 + 0.4 * ((p.z + 2) / 4)               // mild near/far size
			let mr = Math.max(2.2, R * p.size * depth)            // floor so they never vanish
			let b = p.bright * (p.z > 0 ? 1 : 0.6)
			g.fill(0.62, 0.06, b, A)
			g.ellipse(R * p.x, -R * p.y, mr * 2, mr * 2)
		}

		// Behind-moons (occluded by the planet) draw first.
		moons.filter(p => p.z <= 0).forEach(drawMoon)

		let LAT = 24, LON = 48
		for (let i = 0; i <= LAT; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / LAT)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let lonSteps = Math.max(6, Math.round(LON * cphi))   // fewer cells near the poles
			for (let j = 0; j < lonSteps; j++) {
				let lam = (j / lonSteps) * Math.PI * 2
				// planet-fixed normal (rotation-invariant) — for the surface noise
				let nx0 = cphi * Math.sin(lam), ny0 = sphi, nz0 = cphi * Math.cos(lam)
				// spin the surface about the axis, then tilt into the planet's world
				// frame (this is where it is LIT), then orbit into the viewer's frame.
				let vlam = lam + rot
				let [tx, ty, tz] = this._tilt(cphi * Math.sin(vlam), sphi, cphi * Math.cos(vlam), ct, st)
				let lamb = Math.max(0, tx * L[0] + ty * L[1] + tz * L[2])   // lit in the planet frame
				let [nx, ny, nz] = this._orbit(tx, ty, tz, cy, sy, cp, sp)
				if (nz <= 0) continue   // back hemisphere (relative to viewer) — skip

				let n = utilities.noise(nx0 * 1.7 + this.seed, ny0 * 1.7, nz0 * 1.7)
				let isLand = n > 0.55
				let b = (0.1 + 0.95 * lamb) * (isLand ? 0.95 : 0.82)
				b *= 0.4 + 0.6 * nz   // limb darkening (toward the viewer's edge)
				let hue = isLand ? pal.land : pal.sea
				let sat = pal.sat * (isLand ? 1 : 0.92)
				let dotR = (R * 2 / LON) * 1.6 * (0.6 + 0.5 * nz)
				g.fill(hue, sat, b, A)
				g.ellipse(R * nx, -R * ny, dotR, dotR)
			}
		}

		moons.filter(p => p.z > 0).forEach(drawMoon)
		g.popMatrix()
	},
}
