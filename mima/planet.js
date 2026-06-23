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

	// camera orbit (touch-to-rotate-your-view)
	dragRot: 0, dragVel: 0, lastX: null, dragging: false, attached: false,

	// [seaHue, landHue, saturation, skyHue] — all 0..1 (HSB)
	palettes: [
		{ sea: 0.55, land: 0.32, sat: 0.55, sky: 0.55 }, // ocean & green
		{ sea: 0.74, land: 0.07, sat: 0.50, sky: 0.72 }, // violet & amber
		{ sea: 0.50, land: 0.02, sat: 0.50, sky: 0.52 }, // teal & rust
		{ sea: 0.60, land: 0.13, sat: 0.38, sky: 0.60 }, // ice & sand
		{ sea: 0.42, land: 0.28, sat: 0.45, sky: 0.45 }, // swamp green
	],

	// Pick a fresh world (called from app.onEnterState when entering worldgaze).
	summon() {
		this.seed = Math.random() * 1000
		this.pal = this.palettes[Math.floor(Math.random() * this.palettes.length)]
		this.dragRot = 0
		this.dragVel = 0

		// Each planet gets its own axial tilt rather than a fixed one (±~30°).
		this.tilt = (Math.random() - 0.5) * 1.0

		// A certain number of moons (often none or one, occasionally a few).
		let counts = [0, 0, 1, 1, 1, 2, 2, 3]
		let mc = counts[Math.floor(Math.random() * counts.length)]
		this.moons = []
		for (let i = 0; i < mc; i++) {
			this.moons.push({
				dist: 1.45 + Math.random() * 1.5,                       // in planet-radii
				speed: (0.12 + Math.random() * 0.30) * (Math.random() < 0.5 ? -1 : 1),
				phase: Math.random() * Math.PI * 2,
				size: 0.05 + Math.random() * 0.06,                      // in planet-radii
				incl: (Math.random() - 0.5) * 0.9,                      // orbit-plane tilt
				bright: 0.62 + Math.random() * 0.22,
			})
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
			this.dragRot += dx * 0.01   // drag to orbit the camera
			this.dragVel = dx * 0.01    // remember last delta for release momentum
		})
		let up = () => { this.dragging = false }
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
	},

	// Rotate a planet-space vector into view space: axial tilt (about screen x),
	// then camera orbit (about screen vertical y). Returns [x, y, z] (z>0 = front).
	_view(x, y, z, ct, st, cd, sd) {
		// axial tilt about x
		let y1 = y * ct - z * st
		let z1 = y * st + z * ct
		// camera azimuth about y
		let x2 = x * cd + z1 * sd
		let z2 = -x * sd + z1 * cd
		return [x2, y1, z2]
	},

	draw(g, t, presence) {
		if (!this.pal) this.summon()
		let dt = this.lastT ? Math.min(0.05, t - this.lastT) : 0.016
		this.lastT = t
		this.rot += this.spin * dt                                      // keep spinning on its axis
		if (!this.dragging) { this.dragRot += this.dragVel; this.dragVel *= 0.92 }  // camera momentum

		let rot = this.rot                  // planet's own spin (surface only)
		let cam = this.dragRot              // viewer's orbit
		let R = g.height * 0.13             // small — floats above her head
		let pal = this.pal
		let A = presence
		let ct = Math.cos(this.tilt), st = Math.sin(this.tilt)
		let cd = Math.cos(cam), sd = Math.sin(cam)
		let L = [-0.5, -0.45, 0.74]         // light: upper-left, toward viewer

		g.pushMatrix()
		g.translate(0, -g.height * 0.30)    // up, above the face
		g.noStroke()

		// Moon positions (planet-space orbit → view space), split by depth so the
		// ones behind the planet draw first.
		let moons = this.moons.map(m => {
			let ang = m.phase + m.speed * t
			let mx = m.dist * Math.cos(ang)
			let mz = m.dist * Math.sin(ang)
			// orbit-plane inclination (about x)
			let my = -mz * Math.sin(m.incl)
			mz = mz * Math.cos(m.incl)
			let [vx, vy, vz] = this._view(mx, my, mz, ct, st, cd, sd)
			return { x: vx, y: vy, z: vz, size: m.size, bright: m.bright }
		})
		let drawMoon = p => {
			let depth = 0.8 + 0.4 * ((p.z + 2) / 4)   // mild near/far size
			let mr = R * p.size * depth
			let b = p.bright * (p.z > 0 ? 1 : 0.65)
			g.fill(0.62, 0.06, b, A)
			g.ellipse(R * p.x, -R * p.y, mr * 2, mr * 2)
		}
		moons.filter(p => p.z <= 0).forEach(drawMoon)

		// Atmosphere — a tight rim that hugs the disc (nothing spills onto the screen).
		for (let k = 3; k >= 1; k--) {
			let rr = R * (1 + k * 0.012)
			g.fill(pal.sky, 0.55, 0.95, 0.06 * A)
			g.ellipse(0, 0, rr * 2, rr * 2)
		}
		// Base disc (dark sea) so gaps between dots read as deep ocean / night.
		g.fill(pal.sea, pal.sat, 0.12, A)
		g.ellipse(0, 0, R * 2, R * 2)

		let LAT = 24, LON = 48
		for (let i = 0; i <= LAT; i++) {
			let phi = -Math.PI / 2 + Math.PI * (i / LAT)
			let cphi = Math.cos(phi), sphi = Math.sin(phi)
			let lonSteps = Math.max(6, Math.round(LON * cphi))   // fewer cells near the poles
			for (let j = 0; j < lonSteps; j++) {
				let lam = (j / lonSteps) * Math.PI * 2
				// planet-fixed normal (rotation-invariant) — for the surface noise
				let nx0 = cphi * Math.sin(lam), ny0 = sphi, nz0 = cphi * Math.cos(lam)
				// spin the surface about the planet's axis, then view-transform
				let vlam = lam + rot
				let [nx, ny, nz] = this._view(cphi * Math.sin(vlam), sphi, cphi * Math.cos(vlam), ct, st, cd, sd)
				if (nz <= 0) continue   // back hemisphere — skip

				let n = utilities.noise(nx0 * 1.7 + this.seed, ny0 * 1.7, nz0 * 1.7)
				let isLand = n > 0.55
				let lamb = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
				let b = (0.1 + 0.95 * lamb) * (isLand ? 0.95 : 0.82)
				b *= 0.4 + 0.6 * nz   // limb darkening
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
