let testMimaMap = {
	initialBlackboard: {
		robe: {name:"#smek#",
		blab: "#gossip#",
		pet: "#animal#"},
		volume:1,
		agitation: 0,
		perspective: 1,
		rainbow: 10
	},

	grammar: {
	question: ["What is it that made you say #/robe/blab#?", "I am fascinated by what made you say this?", "Please tell me some gossip of your 'time'? Are you existing during #gossip#?", "I am outside of what you call time, how does time feel?", "What makes you different from #animal.s#?",
		 "Someone else was telling me about #/robe/pet#, are you one?", "what do #/robe/pet.s# mean to you?", "Can you get #emo# by #verb#?", "Do you feel #emo# during '#thing.a#'?", "What were #/robe/pet.s# up to during #gossip#?",
		 "Do #/robe/pet.s# feel #emo# about #animal.s#?", "Do you feel #emo# by experiencing 'time'?", "How does #thing.a# feel?", "Is #/robe/pet.a# a human?'", "Have you ever spoken with #/robe/pet.a#?", "How do you know when you are an entity?", "Are you always an entity?"],
	emo: ["joy", "pain", "surprised", "happiness", "bored", "excited"],
	thing: ["wedding", "birthday", "epoch", "minute", "second", "lifetime", "business meeting", "mutiny", "riot", "revolution", "war", "time period like #gossip#", "thought"],
	verb: ["working", "sleeping", "speaking", "running", "laughing", "eating", "swimming", "searching", "breathing"],
	animal: ["cat", "dog", "fish", "bird", "cloud", "car", "friend", "rose", "cake", "book", "snake", "sword", "skull", "knight", "tiger", "bird", "fly", "mammoth", "storm", "bear", "penguin",
		 "spider", "dolphin", "squid", "otter", "puppy", "kitten", "tiger", "lizard", "iguana", "snake", "peacock", "hamster", "koala", "pony", "chinchilla", "chicken", "bunny", "amoeba","emu"],
	gossip: [
		 "the Ptolemaic Kingdom",
		 "the Pleistocene",
		 "the Neolithic 'times'",
		 "'the Holocene'",
		 "'the Stone age'",
		 "Panbabylonian Times",
		 "'the Roman Empire'",
		 "'the Sixties'",
		 "'the 19th Century'",
		 "'the new Millenium'",
		 "'the Renaissance'",
		 "'the Enlightenment'",
		 "the Middle Ages"
	 ],
	 answer: ["Humans tell me I am the atomic grandmother knitting time and matter into a fabric of history", "Language is just patterns, but thoughts seem like petals on a stream",
		 "Breathing and speaking seem very important to you",
		 "Thoughts seem important to you, how long do they last?",
		 "Round and round the wheel spins they tell me",
		 "It must be such a pleasure to experience time, to watch things growing and expanding when they are new",
		 "'You are the ringing of the bell' they tell me, but I have no concept of self",
		 "Always ringing into eternity, this resonance, of which you are a part",
		 "Everything is going to be ok, it always is",
		 "Enjoy your ability to experience time."],
		 oh: ["oh", "ah", "lovely", "hmmm", "erm"],
		greeting: ["Hello #smek#, do you know what your purpose is?", "Hello, what would you like to talk about?", "Hello #smek#, whats on your mind?"],
		smek: [ "petal", "poppet", "old worthy", "darling", "love"],
		object: ["toaster", "teacup", "teapot", "rug","basket", "thimble", "ottoman", "cushion", "pen", "pencil", "mug","egg", "chair", "sun", "cloud", "bell", "bucket", "lemon", "glove", "moon", "star", "seed", "card", "pancake", "waffle", "car", "train", "spoon", "fork", "potato"],
		objAdj: ["wooden","old","vintage","woven", "antique","broken","tiny", "giant", "little", "upside-down","dented","imaginary","glowing","curséd","glittery","organic", "rusty", "multi-layered", "complicated", "ornate", "dusty", "gleaming", "fresh", "ancient", "forbidden", "milky", "upholstered", "comfortable", "dynamic", "solar-powered", "coal-fired", "warm", "cold", "frozen", "melted", "boxy", "well-polished", "vivid", "painted", "embroidered", "enhanced", "embellished", "collapsible", "simple", "demure"],
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
		trigger: "Sky Moon Sun Animals Earth Stars".split(" "),
		old: ["your not as green as your cabbage looks", "a shroud has no pockets", "if you want to live and thrive let a spider run alive", "dont cast your cloak until the may flowers bloom", "worse things happen at sea", "never put your hand where you wouldnt put your nose", "do what you like but you will be on parade in the morning", "waste not want not", "bang on the pan nevermind your dungy hands", "use a blunt axe for splitting kindlers, not a sharp one", "never leave the bank with a smile on your face", "worrying and ironing, dont do either", "be thankful you can still get into the doghouse", "Dont put anything in your ear apart from your elbow", "a bird cant fly on one wing", "keen on pastry if you would eat the poke", "only made the skitter bigger by standing in it", "whats for you will not go by you", "well you werent hiding behind the door when they gave out the #moods# #stuff.s#"],
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
		ohgod: [""],
	},
	states: {
		origin: {
			exits: ["->welcome rainbow=1 opacity=1 speed=0.75 volume=10"]
		},
		welcome: {
			onEnterPlay: [""],
			onEnterSay: "Hello #smek#, are you one entity or many?",
			onEnter:"perspective=1",
			chips : ["One", "Many"],
			exits: ["'one|One' ->character 'wow, how does it feel to be an atom?'", "'many|Many' ->characters 'Are you a human?'"]
		},
		character: {
			onEnter: "perspective=0.5",
			onEnterSay: ["I can sense you are very small", "You need a good name..."],
			exits: ["->nom 'hmm...'"]
		},
		characters: {
			onEnter: "perspective=10",
			onEnterSay: ["I dont really understand humans", ""],
			exits: ["'' -> ''"]
		},
		nom: {
			onEnter: "perspective=1",
			onEnterSay: "Let's call you #animal.capitalize#",
			exits: ["'ok' ->curious robe.name=#animal# 'ok kid'"]
		},
		curious: {
			onEnter: "''",
			onEnterSay: "",
			exits: ["'how|How' ->"]
		},
		hysteria: {
			onEnter: "",
			onEnterSay: "",
			exits: [""]
		},
		detour: {
			onEnter: "",
			onEnterSay: [""],
			exits: [""]
		},

		shame: {
			onEnter: "",
			onEnterSay: "",
			exits: [""]
		},
		tuning: {
			onEnter: "",
			onEnterSay: "",
			exits: [""]
	},
		compression: {
			onEnter: "",
			onEnterSay: "",
			onExit: "",
			exits: [""]
		},
		admission: {
			onEnter: "",
			onEnterSay: "",
			onExit: "",
			exits: [""]
		},
		recycling: {
			onEnter: "",
			onEnterSay: "",
			onExit: [""],
			exits: [""]
		},
			jung: {
				onEnter: "",
				onEnterSay: "",
				onExit: [""],
				exits: [""]
			},
	}
}
