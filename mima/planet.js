// --- planet (2026-06-23) ----------------------------------------------------
// A minimal, slowly-rotating procedural planet drawn into the same Processing
// canvas as the face (2D, HSB colour, utilities.noise for the surface). Shown
// when app.values.planet > 0 (see face.draw); the facebox fades fully out so the
// world floats alone. Touch drags it to rotate it slightly (momentum + decay).
//
// How the sphere is faked in 2D: walk a lat/lon grid, keep only the front
// hemisphere, place each cell as a dot. The surface noise is sampled on the
// planet-FIXED normal (so continents stick to the surface), while the SCREEN
// position uses the rotated+tilted normal. Lambert shading from a fixed light
// gives the day/night terminator; limb darkening + a soft atmosphere ring sell
// the curvature.

let planet = {
	rot: 0,            // auto-rotation, radians
	spin: 0.07,        // base spin (radians/sec)
	tilt: -0.32,       // fixed view tilt, so we see a little "north"
	lastT: 0,
	seed: 0,
	pal: null,

	// touch-to-rotate
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
			this.dragRot += dx * 0.01   // drag to rotate
			this.dragVel = dx * 0.01    // remember last delta for release momentum
		})
		let up = () => { this.dragging = false }
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
	},

	draw(g, t, presence) {
		if (!this.pal) this.summon()
		let dt = this.lastT ? Math.min(0.05, t - this.lastT) : 0.016
		this.lastT = t
		this.rot += this.spin * dt
		if (!this.dragging) { this.dragRot += this.dragVel; this.dragVel *= 0.92 }  // release momentum

		let rot = this.rot + this.dragRot
		let R = g.height * 0.26
		let pal = this.pal
		let A = presence
		let ct = Math.cos(this.tilt), st = Math.sin(this.tilt)
		let L = [-0.5, -0.45, 0.74]   // light: upper-left, toward viewer

		g.pushMatrix()
		g.translate(0, -g.height * 0.09)
		g.noStroke()

		// Atmosphere — a few soft rings just outside the disc.
		for (let k = 6; k >= 1; k--) {
			let rr = R * (1 + k * 0.045)
			g.fill(pal.sky, 0.6, 0.95, 0.045 * A)
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
				// viewed normal: rotate around vertical, then tilt around x
				let vlam = lam + rot
				let nx = cphi * Math.sin(vlam)
				let ny = sphi
				let nz = cphi * Math.cos(vlam)
				let ny2 = ny * ct - nz * st
				let nz2 = ny * st + nz * ct
				ny = ny2; nz = nz2
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
		g.popMatrix()
	},
}
