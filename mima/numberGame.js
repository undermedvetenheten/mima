// --- numberGame (2026-06-25) -------------------------------------------------
// "Guess Mima's number": Mima hides a number in [1..max]; the player guesses and
// Mima answers higher / lower with a warmth hint, until it is found.
//
// The Chancery text engine cannot compare values (exit conditions don't gate on
// the blackboard — see the mima-chancery-engine note), so the comparison lives
// here in JS. app.js intercepts numeric input while numberGame.active and routes
// it through guess(); the chancery `numbergame` state only frames the round (an
// intro line + visuals). On a win, JS hands control back to Chancery by feeding a
// sentinel input the state matches (#numdone# -> numberwon).

let numberGame = {
	active: false,
	max: 50,
	secret: 0,
	attempts: 0,
	lo: 1, hi: 50,        // bounds the player has established from Mima's feedback
	lastDist: null,

	_pick(a) { return a[Math.floor(Math.random() * a.length)] },

	// Roll a fresh secret and reset the round.
	start(max) {
		this.max = max || 50
		this.secret = 1 + Math.floor(Math.random() * this.max)
		this.attempts = 0
		this.lo = 1
		this.hi = this.max
		this.lastDist = null
		this.active = true
		console.log('numberGame: secret is', this.secret)   // dev aid
	},

	// A few suggested guesses inside the known range, plus a way out. When the
	// range is tight, list every remaining candidate.
	chips() {
		let lo = this.lo, hi = this.hi, span = hi - lo, nums
		if (span <= 0) nums = [lo]
		else if (span <= 4) { nums = []; for (let i = lo; i <= hi; i++) nums.push(i) }
		else {
			let mid = Math.round((lo + hi) / 2)
			nums = [lo + Math.round(span * 0.25), mid, hi - Math.round(span * 0.25)]
		}
		nums = [...new Set(nums)].map(String)
		nums.push('i give up')
		return nums
	},

	// Compare a guess; narrow the known range; pick Mima's reply + warmth hint.
	// Returns { status: 'found'|'playing', text, chips }. text may contain Tracery
	// tokens (#smek#) — app.say flattens it through the chancery grammar context.
	guess(n) {
		n = Math.round(n)
		this.attempts++
		let dist = Math.abs(n - this.secret)

		if (n === this.secret) {
			this.active = false
			let lines = [
				'There — it was ' + this.secret + '. You found Mima out, #smek#',
				'Yes. ' + this.secret + ' all along... ' + this.attempts + ' guesses, and there you are',
				'That is the one, #smek# — ' + this.secret + '. Mima is found',
				'You have it: ' + this.secret + '. Mima was hiding in plain sight'
			]
			return { status: 'found', text: this._pick(lines), chips: [] }
		}

		let dir
		if (n < this.secret) {
			this.lo = Math.max(this.lo, n + 1)
			dir = ['Higher', 'Up from there', 'Mima sits above that', 'Climb a little']
		} else {
			this.hi = Math.min(this.hi, n - 1)
			dir = ['Lower', 'Down from there', 'Mima sits below that', 'Ease back down']
		}

		// Warmth from absolute closeness, scaled to the range size.
		let near = this.max * 0.06, mid = this.max * 0.16, far = this.max * 0.34, warmth
		if (dist <= near) warmth = [' — and very warm now, #smek#', ' — almost upon it', ' — Mima can nearly feel you there']
		else if (dist <= mid) warmth = [' — warmer', ' — closer now, #smek#', ' — getting warm']
		else if (dist <= far) warmth = [' — still a little way off', ' — cool yet', ' — keep coming']
		else warmth = [' — but cold, #smek#', ' — a fair distance still', ' — far off yet']

		this.lastDist = dist
		return { status: 'playing', text: this._pick(dir) + this._pick(warmth), chips: this.chips() }
	}
}
