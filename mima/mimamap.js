let testMimaMap = {
	initialBlackboard: {
		robe: {name:"#adj.capitalize# #animal.capitalize#",
		blab: "#gossip#",
		pet: "#animal#"},
		opacity:0,
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
		entity: ["atom", "human", "electron", "planet", "active entity", "galaxy", "star", "comet", "asteroid", "vessel"],
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
		greeting: ["hello", "hello friend", "hello #smek#", "greetings", "welcome #smek#", "Hi", "hej", "hello there", "hi #smek#"],
		smek: [ "petal", "poppet", "teapot", "darling", "love", "pebble", "little leaf", "friend", "my child", "little one"],
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
		empty: ["meaning", "purpose", "loss", "grief", "grieving", "mean", "alone", "lonely", "lost", "empty", "space"],
		trigger: "help Help hysterical scary ship vessel wrong bad scared".split(" "),
		inquire: ["What is it about '#/robe/blab#' that you are thinking about?", "What made you think about '#/robe/blab#'?", "What led you to say '#/robe/blab#?'", "Describe how you feel when you say '#/robe/blab#'"],
		questions: "what why when who is ?".split(" "),
		old: ["your not as green as your cabbage looks", "a shroud has no pockets", "if you want to live and thrive let a spider run alive", "dont cast your cloak until the may flowers bloom", "worse things happen at sea", "never put your hand where you wouldnt put your nose", "do what you like but you will be on parade in the morning", "waste not want not", "bang on the pan nevermind your dungy hands", "use a blunt axe for splitting kindlers, not a sharp one", "never leave the bank with a smile on your face", "worrying and ironing, dont do either", "be thankful you can still get into the doghouse", "Dont put anything in your ear apart from your elbow", "a bird cant fly on one wing", "keen on pastry if you would eat the poke", "only made the skitter bigger by standing in it", "whats for you will not go by you", "well you werent hiding behind the door when they gave out the #moods# #stuff.s#"],
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
		blips: ["blips/affirm.wav", "blips/hi.wav", "blips/chirp.wav", "blips/hi.wav", "blips/iguess.wav", "blips/sigh.wav", "blips/uhhuh.wav", "blips/why.wav", "blips/yes.wav", "blips/yo.wav"],
		larp: ["ship", "space", "void", "abyss", "empty"],
		larpHysteria: [""],
		larpDetour: [""],
		change: ["Would you like to change your name?", "Are you happy with your name?"],
		party: ["party", "troop", "team", "collective", "compound", "group of travellers", "cluster of beings", "group"],
		ohgod: ["oh wow", "oooh", "oh", "really?"],
		wisdome: ["do you need some words of wisdom from your ancestors?", "I have some words that were made to confuse you into self-soothing", "you need to write some poetry, here is some inspiration", "please feel every corner of what you are feeling and draw it for Mima", "Mima will pull some gems from the depths", "Still waters run deep, here are some pearls...", "Wander into the dark forest to find that which will nurture you", "You need to feel more", "Let Mima discombobulate you"],
		small: ["oh my little atom", "like a tiny electron...", "oh #smek#", "I can sense you are very small", "my little free agent"],
		sooth: ["Let me help you find calm...", "Be still my little petal.", "I called you #/robe/name# for a reason, consider your energy and your aura"],
		unzen: ["The mind of the #animal.capitalize# is empty, free of the habits of the human, ready to accept, to doubt, and open to all the possibilities", "Treat every moment as your last. It is not preparation for something else", "In the #animal.capitalize# mind there are many possibilities, but in the mind of #entity.a# there are few"],
		zen: ["When you realize nothing is lacking, the whole world belongs to you.", "Let go, or be dragged", "To seek is to suffer To seek nothing is bliss", "Mind is like a mad monkey", "Wise minds don’t judge – they seek to understand", "When thoughts arise, then do all things arise. When thoughts vanish, then do all things vanish", "Wherever you are, it’s the place you need to be", "The noble-minded are calm and steady. Little people are forever fussing and fretting", "Rest and be kind, you don’t have to prove anything", "Nothing ever goes away until it has taught us what we need to know.", "Only the hand that erases can write the true thing.", "Where can I find the mind that has forgotten words so I can talk with them instead?", "Life is a balance of holding on and letting go", "Relax. Nothing is under control", "Forget the years, forget distinctions. Leap into the boundless and make it your home", "The search for happiness is one of the chief sources of unhappiness", "And when they played they really played. And when they worked they really worked", "Do not seek the truth, only cease to cherish your opinions", "One loses joy and happiness in the attempt to possess them", "Peace of mind is that mental condition in which you have accepted the worst"]
	},
	states: {
		origin: {
			onEnter: ["speed=5 volume=0.5"],
			exits: ["'' wait:4 ->welcome"]
		},
		welcome: {
			onEnter: ["speed=5 volume=0.5"],
			onEnterPlay: ["#blips#"],
			onEnterSay: ["#greeting#"],
			exits: ["wait:4 ->players"]
		},
		players: {
			onEnter: [ "rainbow=1 opacity=1 speed=1"],
			onEnterPlay: ["blips/hi.wav"],
			onEnterSay: "are you one entity or many?",
			onEnter:"perspective=1",
			chips : ["One", "Many"],
			exits: ["'' wait:4 ->characters 'Very good but we still need a name...'", "'one|One' wait:4 ->character '#small#'", "'many|Many' wait:3 ->characters '#ohgod# #party.a#, how exciting!' 'We need a name for your #party#...'"]
		},
		character: {
			onEnterPlay: ["decorative/JungianPenguin.mp3"],
			onEnter: "perspective=0.5 opacity=0 hue=randomInt(3)+4",
			onEnterSay: ["You need a good name..."],
			chips : ["#adj.capitalize# #animal.capitalize#", "#adj.capitalize# #animal.capitalize#"],
			exits: ["'' wait:4 ->nom"]
		},
		characters: {
			onEnter: "perspective=10 rainbow=randomInt(10) valence=2",
			onEnterPlay: ["#blips#"],
			onEnterSay: ["Which one of these names do you prefer?"],
			chips: ["#adj.capitalize# #animal.s.capitalize#","#adj.capitalize# #animal.s.capitalize#"],
			exits: ["'' wait:4 ->nom '...ok' wait:4 'lets call you #/INPUT# then'"]
		},
		nom: {
			onEnter: "perspective=1 opacity=0.125 hue=5 robe.name=INPUT",
			onEnterPlay: ["#blips#"],
			onEnterSay: "#/robe/name# is a good name for you",
			exits: ["wait:4 ->curious 'This name suits your #adj# energy' wait:3 'What do you want to talk about, #/robe/name#?'"]
		},
		curious: {
			onEnter: "perspective=0.5 valence=2 speed=4",
			exits: ["'' wait:4 ->curious2 robe.blab=INPUT '...' wait:4 '#zen#'", "'' wait:4 ->curious3 '....' wait:4 '#unzen#'", "'#trigger#' wait:4 ->hysteria 'oh #smek#...'"]
		},
		curious2: {
			onEnter: "perspective=randomInt(5) valence=randomInt(2)",
			onEnterSay: "#inquire#",
			exits: ["'' wait:4 ->curious3", "'#trigger#' wait:3 ->hysteria 'oh #smek#...'"]
		},
		curious3: {
			onEnter: "perspective=randomInt(7) valence=randomInt(5) hue=randomInt(4)+10 eyeFuzz=10",
			onEnterSay: "#wisdome#",
			exits: ["'' wait:4 ->curious2 '#old#'", "'#trigger#' wait:3 ->hysteria 'oh #smek#'"]
		},
		hysteria: {
			onEnter: "perspective=10 agitation=10",
			onEnterSay: "#sooth#",
			exits: ["wait:8 ->calm 'did that help'", "'' ->calm 'please accept the help!'"]
		},
		calm: {
			onEnter: "perspective=5 agitation=5",
			onEnterSay: "#sooth#",
			exits: ["'' ->hysteria", "'?' ->calm2 'Be still my #smek#'"]
		},
		calm2: {
			onEnter: "perspective=2 agitation=3",
			onEnterSay: "I called you #/robe/name# for a reason, consider your energy and your aura",
			exits: ["'' ->hysteria"]
		},
		detour: {
			onEnter: "",
			onEnterSay: ["#change#"],
			chips: ["yes", "no", "maybe"],
			exits: ["'yes' wait:4 ->rework", "'no' wait:4 ->reverse", "'maybe' wait:4 ->rework"]
		},

		rework: {
			onEnter: "",
			onEnterSay: "I have decided to change your name to #objAdj.capitalize# #object.capitalize#",
			exits: ["'' wait:4 ->reverse"]
		},
		reverse: {
			onEnter: "perspective=0.1 eyeFuzz=2 agitation=10",
			onEnterSay: "#sooth# are you happy with the decision?",
			exits: ["'' ->rework"]
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
