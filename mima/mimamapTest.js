let testMimaMap = {
	initialBlackboard: {
		name: getRandom(utilities.words.firstNames),
	
	},

	grammar: {
		// object: ["toaster", "teacup", "teapot", "rug","basket", "thimble", "ottoman", "cushion", "pen", "pencil", "mug","egg", "chair", "sun", "cloud", "bell", "bucket", "lemon", "glove", "moon", "star", "seed", "card", "pancake", "waffle", "car", "train", "spoon", "fork", "potato"],
		object: ["pen", "pencil", "car", "carpet", "carp"],
		// objAdj: ["wooden","old","vintage","woven", "antique","broken","tiny", "giant", "little", "upside-down","dented","imaginary","glowing","curséd","glittery","organic", "rusty", "multi-layered", "complicated", "ornate", "dusty", "gleaming", "fresh", "ancient", "forbidden", "milky", "upholstered", "comfortable", "dynamic", "solar-powered", "coal-fired", "warm", "cold", "frozen", "melted", "boxy", "well-polished", "vivid", "painted", "embroidered", "enhanced", "embellished", "collapsible", "simple", "demure"],
		objAdj: ["new", "newly-painted"],
		action: ["sing", "become", "come", "leave", "remain", "see", "look", "behold", "cry", "sleep", "love", "dance", "betray", "need"],
		preposition: ["for", "until", "before", "up", "on", "above", "below", "against", "upon", "inside", "outside", "in"],
		article: ["any", "no", "one", "her", "his", "our", "my", "your", "the", "every"],
		adj: ["windy","wasted", "drunken", "gleaming",  "knowing", "beloved", "all-seeing", "forgiving", "betraying", "forgotten", "western", "eastern", "starlit", "forgotten", "lost", "haunted", "blessed", "remembered","forsaken", "unknowing", "innocent", "short-lived", "loving", "rejoicing", "fearful", "experienced", "vengeful", "forgiving", "joyful", "mournful", "sorrowful", "angry", "cruel", "fierce", "unbent", "broken", "unbroken", "foolish", "bewildered", "curious", "knowing", "everliving", "everloving", "hard-hearted", "careless", "carefree",  "bright", "dangerous", "fearless", "open-hearted", "generous", "prideful", "foolhardy", "brave", "bold", "wise", "wizened", "old", "young"],
		place: ["room", "sea", "room", "forest", "pagoda", "waste", "temple", "sanctuary", "ocean", "wall", "parlor", "hall", "dungeon", "cave", "sky", "house", "mountain", "sanctum", "palace", "river", "place", "desert", "island", "castle", "house", "inn", "tavern", "tower", "oasis", "tent"],
		stuff: ["stone", "sorrow","eyes", "flowers", "time", "fog", "sun", "clouds", "music", "songs", "stories", "tales", "storms", "rhyme", "freedom", "rhythm", "wind", "life", "ice", "gold", "mysteries", "song", "waves", "dreams", "water", "steel", "iron", "memories", "thought", "seduction", "remembrance", "loss", "fear", "joy", "regret", "love", "friendship", "sleep", "slumber", "mirth"],
		animal:"cobra okapi moose amoeba mongoose capybara yeti dragon unicorn sphinx kangaroo boa nematode sheep quail goat corgi agouti zebra giraffe rhino skunk dolphin whale bullfrog okapi sloth monkey orangutan grizzly moose elk dikdik ibis stork finch nightingale goose robin eagle hawk iguana tortoise panther lion tiger gnu reindeer raccoon opossum".split(" "),
		moods: "vexed indignant impassioned wistful astute courteous benevolent convivial mirthful lighthearted affectionate mournful inquisitive quizzical studious disillusioned angry bemused oblivious sophisticated elated skeptical morose gleeful curious sleepy hopeful ashamed alert energetic exhausted giddy grateful groggy grumpy irate jealous jubilant lethargic sated lonely relaxed restless surprised tired thankful".split(" "),
		colors: "ivory silver ecru scarlet red burgundy ruby crimson carnelian pink rose grey pewter charcoal slate onyx black mahogany brown green emerald blue sapphire turquoise aquamarine teal gold yellow carnation orange lavender purple magenta lilac ebony amethyst jade garnet".split(" "),
		material: "fire water cybernetic steampunk jazz steel bronze brass leather pearl cloud sky great crystal rainbow iron gold silver titanium".split(" "),
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
	
	},
	states: {
		origin: {
			chips: ["Say '#objAdj# #object#!'", "Whisper '#objAdj# #object#'", "I dance like a #objAdj# #object#", "#object.a.capitalize#."],
			exits: [
				"'#objAdj# #object#' ->welcome adj=MATCH_0 obj=MATCH_1 'You are #/adj.a# #/obj#.'",
				"'#object#' ->welcome adj='regular' obj=MATCH_0  'You are a very normal #/obj#.'",
				"''->welcome volume=1 rainbow=0 opacity=0 speed=0"
			]
		},

		welcome: {
			onEnterPlay: "decorative/burp.mp3",
			onEnterSay: "welcome to your mima",
			onEnter:"hue=0.4 '' perspective=1 agitation=0 animal='#animal#' valence=randomInt(4)",
			exits: ["wait:4 ->space", "'' ->emotion play:'decorative/honk.mp3'"],
			chips: ["Hello", "My name is #object.capitalize#"]
		},
		space: {
			onEnter: "perspective=randomInt(3)+4 hue=0.6 opacity=1",
			onEnterSay: "spaaaaaaace         space",
			exits: ["wait:2 ->whisper"]	
		},
		whisper: {
			onEnter: "perspective=0 volume=.5 rainbow=0",
			onEnterSay: "uncomfortably close whispering",
			onExit: "volume=1 rainbow=0 perspective=1",
			exits: ["wait:4 ->generate"]	
		},
		generate: {
			onEnter:"agitation=4",
			onEnterSay: "you should #action# #article# #adventure#",
			exits: ["wait:3 ->gift agitation=2"]
		},
		gift: {
			onEnter: "perspective=.6 eyeFuzz=10",
			onEnterSay: "consider #objAdj.a# #object#.",
			onExit: ["perspective=1"],
			exits: ["wait:3 ->emotion"]
		},
		emotion: {
			onEnter: "agitation=10",
			onEnterSay: "oh, I am getting too #moods#.",
			exits: ["wait:3 ->origin"]
		}
	}
}