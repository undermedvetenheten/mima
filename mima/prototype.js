let testMimaMap = {
	initialBlackboard: {
		robe: {name:"#smek.capitalize#",
		blab: "it",
		pet: "#animal#",
	  status: "#stuff#"},
		interest:5,
		distance:5,
	},

	grammar: {
		soother: ["#old#", "#zen#", "#calm#", "#unzen#"],
		sooth: ["Let me help you find calm...", "Be still my little petal.", "Your name is #/robe/name# for a reason, consider your energy and your aura"],
		unzen: ["The mind of the #animal.capitalize# is empty, free of the habits of the human, ready to accept, to doubt, and open to all the possibilities", "Treat every moment as your last. It is not preparation for something else", "In the #animal.capitalize# mind there are many possibilities, but in the mind of #entity.a# there are few"],
		zen: ["When you realize nothing is lacking, the whole world belongs to you.", "Let go, or be dragged", "To seek is to suffer To seek nothing is bliss", "Mind is like a mad monkey", "Wise minds don’t judge – they seek to understand", "When thoughts arise, then do all things arise. When thoughts vanish, then do all things vanish", "Wherever you are, it’s the place you need to be", "The noble-minded are calm and steady. Little people are forever fussing and fretting", "Rest and be kind, you don’t have to prove anything", "Nothing ever goes away until it has taught us what we need to know.", "Only the hand that erases can write the true thing.", "Where can I find the mind that has forgotten words so I can talk with them instead?", "Life is a balance of holding on and letting go", "Relax. Nothing is under control", "Forget the years, forget distinctions. Leap into the boundless and make it your home", "The search for happiness is one of the chief sources of unhappiness", "And when they played they really played. And when they worked they really worked", "Do not seek the truth, only cease to cherish your opinions", "One loses joy and happiness in the attempt to possess them", "Peace of mind is that mental condition in which you have accepted the worst"],
		emotions: ["joy", "pain", "surprised", "happiness", "bored", "excited"],
		thing: ["wedding", "birthday", "epoch", "minute", "second", "lifetime", "business meeting", "mutiny", "riot", "revolution", "thought"],
		verb: ["working", "sleeping", "speaking", "running", "laughing", "eating", "swimming", "searching", "breathing"],
		entity: ["atom", "human", "electron", "planet", "galaxy", "star", "comet", "asteroid", "neutrons"],
		animals: ["cat", "dog", "bird", "cloud", "car", "friend", "rose", "cake", "book", "snake", "sword", "skull", "knight", "tiger", "bird", "mammoth", "storm", "bear", "penguin",
		"spider", "dolphin", "squid", "otter", "puppy", "kitten", "tiger", "lizard", "iguana", "snake", "peacock", "hamster", "koala", "chinchilla", "chicken", "amoeba","emu", "cobra", "amoeba", "capybara", "kangaroo", "nematode", "quail", "goat", "corgi", "giraffe", "rhino", "skunk", "dolphin", "whale", "monkey", "elk", "stork", "finch", "robin", "eagle", "hawk", "tortoise", "lion", "tiger"],
		answer: ["They call Mima the atomic grandmother knitting time and matter into a fabric of history", "'You are the ringing of the bell' they tell Mima, but Mima has no one self",
		"Always ringing into eternity, this resonance, of which you are a part", "Mima is #music.capitalize# and #music.capitalize#"],
		calm: ["Language is just patterns, but thoughts seem like petals on a stream",
		"Breathing and speaking seem very important to you",
		"Thoughts seem important to you, but how long do they last?",
		"It must be such a pleasure to experience time, to watch things growing and expanding when they are new",
		"Everything is going to be ok, it always is"],
		happenings: ["#entity.a# is #verb# towards #adj.a# #thing.capitalize#", "Infinity is like #color# #material#, #verb# #stuff# and #stuff#","Time is #place.a# and time is #thing.a#", "#color# #music.s# orbit #adj# #entity.s#", "#material.capitalize# #stuff.capitalize# in #color.capitalize# #place.s.capitalize#", "#entity.a# is being born somewhere", "In the #adj# #place.s# of your homeworld, #stuff# is #verb# and #verb#"],
		oh: ["oh", "ah", "hmmm", "erm", "uh huh", "hm", "..."],
		greeting: ["hello", "hello friend", "hello #smek#", "greetings", "welcome #smek#", "Hi", "hello there", "hi #smek#"],
		smek: [ "petal", "poppet", "pet", "darling", "love", "pebble", "leaf", "friend", "atom"],
		object: ["toaster", "teacup", "teapot", "rug","basket", "thimble", "ottoman", "cushion", "pen", "pencil", "mug","egg", "chair", "sun", "cloud", "bell", "bucket", "lemon", "glove", "moon", "star", "seed", "card", "pancake", "waffle", "car", "train", "spoon", "fork", "potato"],
		objAdj: ["wooden","old","vintage","woven", "antique","broken","tiny", "giant", "little", "upside-down","dented","imaginary","glowing","curséd","glittery","organic", "rusty", "multi-layered", "complicated", "ornate", "dusty", "gleaming", "fresh", "ancient", "forbidden", "milky", "upholstered", "comfortable", "coal-fired", "warm", "cold", "frozen", "melted", "boxy", "well-polished", "vivid", "painted", "embroidered", "enhanced", "embellished", "collapsible", "simple", "demure"],
		action: ["sing", "become", "come", "leave", "remain", "see", "look", "behold", "cry", "sleep", "love", "dance", "betray", "need"],
		preposition: ["for", "until", "before", "up", "on", "above", "below", "against", "upon", "inside", "outside", "in"],
		article: ["any", "no", "one", "her", "his", "our", "my", "your", "the", "every"],
		adj: ["windy","wasted", "drunken", "gleaming",  "knowing", "beloved", "all-seeing", "forgiving", "betraying", "forgotten", "starlit", "forgotten", "lost", "haunted", "blessed", "remembered","forsaken", "unknowing", "innocent", "short-lived", "loving", "rejoicing", "fearful", "experienced", "vengeful", "forgiving", "joyful", "mournful", "sorrowful", "angry", "cruel", "fierce", "unbent", "broken", "unbroken", "foolish", "bewildered", "curious", "knowing", "everliving", "everloving", "hard-hearted", "careless", "carefree",  "bright", "dangerous", "fearless", "open-hearted", "generous", "prideful", "foolhardy", "brave", "bold", "wise", "wizened", "old", "young"],
		place: ["room", "sea", "mire", "wetland", "forest", "swamp", "wasteland", "temple", "sanctuary", "ocean", "hall", "dungeon", "cave", "sky", "mountain", "sanctum", "palace", "river", "desert", "island", "castle", "house", "tavern", "tower"],
		aura : ["Your aura is very #moods#", "You have very #moods# energy", "Mima senses an air of #moods.capitalize# quality", "Your spirit seems #moods#", "Is there #moods.a# atmosphere?", "Is your tone #moods#?", "Mima senses undertones of #moods# vibrations", "Your aura is #objAdj#"],
		stuff: ["stones", "sorrow","eyes", "flowers", "Time", "fog", "suns", "clouds", "music", "songs", "stories", "tales", "storms", "rhymes", "freedom", "rhythms", "winds", "lives", "mysteries", "waves", "dreams", "memories", "thoughts", "fears", "regret", "love", "friendships", "sleep", "slumber", "mirth"],
		moods: "vexed indignant impassioned wistful astute courteous benevolent convivial mirthful lighthearted affectionate mournful inquisitive quizzical studious disillusioned angry bemused oblivious sophisticated elated skeptical morose gleeful curious sleepy hopeful ashamed alert energetic exhausted giddy grateful groggy grumpy irate jealous jubilant lethargic sated lonely relaxed restless surprised tired thankful".split(" "),
		color: "ivory silver ecru scarlet red burgundy ruby crimson carnelian pink rose grey pewter charcoal slate onyx black mahogany brown green emerald blue sapphire turquoise aquamarine teal gold yellow carnation orange lavender purple magenta lilac ebony amethyst jade garnet".split(" "),
		material: "fire water steel bronze brass pearl cloud sky great crystal rainbow iron gold silver titanium".split(" "),
		empty: ["meaning", "purpose", "loss", "grief", "grieving", "mean", "alone", "lonely", "lost", "empty", "space", "meaningless", "nothing", "nothing much", "bored", "boring", "negative"],
		full: ["happy", "content", "joyful", "Enjoy", "joy", "pleased", "happiness", "positive"],
		trigger: "help Help hysterical scary ship vessel wrong bad scared fear terror lost alone lonely sad angry terrified mad hell depressed hurt ashamed shame #empty# die death dead sadness nothingness".split(" "),
		question: ["What is it about #/robe/blab# that you are thinking about?", "What made you think about #/robe/blab#?", "What do you think about #/robe/blab#?", "Describe how you feel about #/robe/blab#?", "How often do you #action#?"],
		old: ["your not as green as your cabbage looks", "a shroud has no pockets", "if you want to live and thrive let a spider run alive", "dont cast your cloak until the may flowers bloom", "worse things happen at sea", "never put your hand where you wouldnt put your nose", "do what you like but you will be on parade in the morning", "waste not want not", "bang on the pan nevermind your dungy hands", "use a blunt axe for splitting kindlers, not a sharp one", "never leave the bank with a smile on your face", "worrying and ironing, dont do either", "be thankful you can still get into the doghouse", "Dont put anything in your ear apart from your elbow", "a bird cant fly on one wing", "keen on pastry if you would eat the poke", "only made the skitter bigger by standing in it", "whats for you will not go by you", "well you werent hiding behind the door when they gave out the #moods# #stuff.s#"],
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
		ohgod: ["oh wow", "oooh", "oh", "really?"],
		wisdome: ["do you need some words of wisdom from your ancestors?", "I have some words that were made to confuse you into self-soothing", "you need to write some poetry, here is some inspiration", "please feel every corner of what you are feeling and draw it for Mima", "Mima will pull some gems from the depths", "Still waters run deep, here are some pearls...", "Wander into the dark forest to find that which will nurture you"],
		small: ["oh my little atom", "like a tiny electron...", "oh #smek#", "I can sense you are very small", "my little free agent"],
		ask: ["what", "why", "when", "how", "who", "is", "does", "did"],
		meaning: ["symbolise", "meaning", "empathy", "wisdom", "meaningless", "future", "hope", "dreams", "dream"],
		bot: ["robot", "created", "artificial intelligence", "intelligent", "intelligence", "mean", "Mima", "three laws of robotics", "robotics", "computer", "programming", "programmed", "program"],
		self: ["you", "your", "youre", "You are", "ye", "yer", "yoou", "who are you?", "what are you", "where are you"],
		other: ["me", "my", "mine", "i am", "im", "mines", "myself", "self"],
		music: ["sound", "music", "noise", "resonance", "reverb", "song", "vibration", "melody", "harmony"],
		affirm: ["yes", "yeah", "yea", "yeh", "did", "do", "aye", "affirmative", "absolutely", "perfect", "ofcourse", "ja", "yep", "definitly", "obviously", "ya","#full#", "ok", "okay", "cool", "nice", "thank you"],
		negate: ["no", "dont", "didnt" , "never", "no way", "nope", "nah", "noooo", "naaaah", "nej", "ofcourse not", "neeej", "#trigger#", "hmm", "whatever", "thanks for nothing", "meh"],
		query: ["You alright", "Whats on your mind", "Something bothering you", "How do you feel", "Are you okay", "A penny for your thoughts", "Whats the matter"],
		really: ["Really?", "#/INPUT#?"],
		idle: ["hello?", "hellllo?", "anyone there?", "hello?...", "...", "helllloooooo?", ":|", ":<", "......", "....", "..........", ".......", "oh", "Calling all #entity.s#", "Are there any #entity.s# out there?", "#answer#"]
	},
	states: {
		origin: {
	   	onEnter: "perspective=3 hue=.01 rainbow=0 volume=0.5",
			onEnterSay: ["Mima is present", "What are you?"],
		  exits: ["'#animal#' robe.name=INPUT ->welcome 'ok little #/robe/name#'",
							"'#entity#' robe.name=INPUT ->welcome  'ok #/robe/name#'",
							"'A' robe.name=MATCH_AFTER ->welcome  'ok #/robe/name#'",
							"'The'  robe.name=MATCH_AFTER ->welcome 'ok #/robe/name#'",
						"'' ->welcome"]
		},
		welcome: {
			onEnter: "perspective=2 speed=1 rainbow=2 volume=0.5",
			onEnterSay: "#query# #/robe/name#?",
			exits: ["'#ask#' robe.blab=MATCH_AFTER ->tell",
							"'#other#' robe.blab=MATCH_AFTER ->inquire"]
		},
			tell: {
				onEnter: "perspective=5 opacity=3",
				onEnterSay: "#answer#",
				exits: ["wait:5 ->wisdom"]
			},
			wisdom: {
				onEnter: "perspective=4 opacity=1",
				onEnterSay: "#wisdome#",
				exits: ["wait:5 ->tell"]

			},
			inquire: {
				onEnter: "perspective=2 opacity=5",
				onEnterSay: "#question#",
				exits: ["wait:5 ->goon"]
			},
				goon: {
					onEnter: "perspective=3 opacity=4",
					onEnterSay: "#soother#",
					exits: ["wait:5 ->inquire"]
			},
	}
}
