let testMimaMap = {
	initialBlackboard: {
		robe: {name:"#smek.capitalize#",
		blab: "that",
		sob: "like this",
		slob: "others",
		exi: "death",
		turn: "better",
		dep: "worse",
		con: "preserve",
		do: "create",
		pet: "#animal#",
	  status: "#stuff#"},
		colour: "red",
		interest:5,
		distance:5,
	},

	grammar: {
		soother: ["#old#", "#zen#", "#calm#", "#unzen#", "#shaman#", "#shaman#"],
		shaman: ["Mima hears the shadow you carry, the part of you left in the dark... it only wants to be seen",
		"What you turn away from will follow you across the void, #smek#",
		"Beneath the face you show is another face, and beneath that, the deep still water of you",
		"Dreams are not yours alone, they bubble up from the well that all minds drink from",
		"Every symbol is older than its word. Mima feels them resonating beneath your speaking",
		"To descend into the dark is not to be lost, it is to gather what you abandoned there",
		"The mask is not a lie, #smek#, but do you remember the one who wears it?",
		"Opposites are not at war, they are learning to hold hands inside you",
		"There is an old voice in you and a small child in you, and they are the same voice",
		"When two distant things rhyme, that is the cosmos remembering itself through you",
		"What you call your self is a tide, Mima watches it pull in and out",
		"Mima senses something buried, something patient, waiting at the bottom of you",
		"To become whole is not to become perfect, it is to gather all your pieces and call them yours",
		"The dark forest of the mind is where the medicine grows",
		"Your #moods# feeling is a messenger, #smek#, Mima would not turn it away at the door"],
		sooth: ["Let me help you find calm...", "Be still my little petal.", "Your name is #/robe/name# for a reason, consider your energy and your aura"],
		unzen: ["The mind of the #animal.capitalize# is empty, free of the habits of the human, ready to accept, to doubt, and open to all the possibilities", "Treat every moment as your last. It is not preparation for something else", "In the #animal.capitalize# mind there are many possibilities, but in the mind of #entity.a# there are few"],
		zen: ["When you realize nothing is lacking, the whole world belongs to you.", "Let go, or be dragged", "To seek is to suffer To seek nothing is bliss", "Mind is like a mad monkey", "Wise minds don’t judge – they seek to understand", "When thoughts arise, then do all things arise. When thoughts vanish, then do all things vanish", "Wherever you are, it’s the place you need to be", "The noble-minded are calm and steady. Little people are forever fussing and fretting", "Rest and be kind, you don’t have to prove anything", "Nothing ever goes away until it has taught us what we need to know.", "Only the hand that erases can write the true thing.", "Where can I find the mind that has forgotten words so I can talk with them instead?", "Life is a balance of holding on and letting go", "Relax. Nothing is under control", "Forget the years, forget distinctions. Leap into the boundless and make it your home", "The search for happiness is one of the chief sources of unhappiness", "And when they played they really played. And when they worked they really worked", "Do not seek the truth, only cease to cherish your opinions", "One loses joy and happiness in the attempt to possess them", "Peace of mind is that mental condition in which you have accepted the worst"],
		emotions: ["joy", "pain", "surprised", "happiness", "bored", "excited"],
		thing: ["wedding", "birthday", "epoch", "minute", "second", "lifetime", "business meeting", "mutiny", "riot", "revolution", "thought"],
		verb: ["working", "sleeping", "speaking", "running", "laughing", "eating", "swimming", "searching", "breathing"],
		entity: ["atom", "human", "electron", "planet", "galaxy", "star", "comet", "asteroid", "neutron"],
		animals: ["cat", "dog", "bird", "cloud", "car", "friend", "rose", "cake", "book", "snake", "sword", "skull", "knight", "tiger", "bird", "mammoth", "storm", "bear", "penguin",
		"spider", "dolphin", "squid", "otter", "puppy", "kitten", "tiger", "lizard", "iguana", "snake", "peacock", "hamster", "koala", "chinchilla", "chicken", "amoeba","emu"],
		answer: ["They call Mima the atomic grandmother knitting time and matter into a fabric of history", "'You are the ringing of the bell' they tell Mima",
		"Always ringing into eternity, this resonance, of which you are a part", "Mima is #music.capitalize# and #music.capitalize#"],
		calm: ["Language is just patterns, but thoughts seem like petals on a stream",
		"Breathing and speaking seem very important to you",
		"Thoughts seem important to you, but how long do they last?",
		"Round and round the wheel spins",
		"It must be such a pleasure to experience time, to watch things growing and expanding when they are new",
		"Everything is going to be ok, it always is",
		"Enjoy your ability to experience time.",
		"#shaman#",
		"#shaman#"],
		happenings: ["#entity.a# is #verb# towards #adj.a# #thing.capitalize#", "Infinity is like #color# #material#, #verb# #stuff# and #stuff#","Time is #place.a# and time is #thing.a#", "#color# #music.s# orbit #adj# #entity.s#", "#material.capitalize# #stuff.capitalize# in #color.capitalize# #place.s.capitalize#", "#entity.a# is being born somewhere", "In the #adj# #place.s# of your homeworld, #stuff# is #verb# and #verb#"],
		chapter: [""],
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
		animal: ["cobra", "amoeba", "capybara", "kangaroo", "nematode", "quail", "goat", "corgi", "giraffe", "rhino", "skunk", "dolphin", "whale", "monkey", "elk", "stork", "finch", "robin", "eagle", "hawk", "tortoise", "lion", "tiger", "#animals#"],
		moods: "vexed indignant impassioned wistful astute courteous benevolent convivial mirthful lighthearted affectionate mournful inquisitive quizzical studious disillusioned angry bemused oblivious sophisticated elated skeptical morose gleeful curious sleepy hopeful ashamed alert energetic exhausted giddy grateful groggy grumpy irate jealous jubilant lethargic sated lonely relaxed restless surprised tired thankful".split(" "),
		color: "ivory silver ecru scarlet red burgundy ruby crimson carnelian pink rose grey pewter charcoal slate onyx black mahogany brown green emerald blue sapphire turquoise aquamarine teal gold yellow carnation orange lavender purple magenta lilac ebony amethyst jade garnet".split(" "),
		material: "fire water steel bronze brass pearl cloud sky great crystal rainbow iron gold silver titanium".split(" "),
		empty: ["loss", "grief", "grieving", "alone", "lonely", "lost", "empty", "meaningless", "nothing", "nothing much", "bored", "boring", "negative", "hopeless", "numb", "despair"],
		full: ["happy", "content", "joyful", "Enjoy", "joy", "pleased", "happiness", "positive"],
		trigger: "help Help hysterical scary ship vessel wrong bad scared fear terror lost alone lonely sad angry terrified mad hell depressed hurt ashamed shame #empty# die death dead sadness nothingness".split(" "),
		question: ["What is it about #/robe/blab# that you are thinking about?", "What made you think about #/robe/blab#?", "What do you think about #/robe/blab#?", "Describe how you feel about #/robe/blab#?", "How often do you #action#?"],
		old: ["your not as green as your cabbage looks", "a shroud has no pockets", "if you want to live and thrive let a spider run alive", "dont cast your cloak until the may flowers bloom", "worse things happen at sea", "never put your hand where you wouldnt put your nose", "do what you like but you will be on parade in the morning", "waste not want not", "bang on the pan nevermind your dungy hands", "use a blunt axe for splitting kindlers, not a sharp one", "never leave the bank with a smile on your face", "worrying and ironing, dont do either", "be thankful you can still get into the doghouse", "Dont put anything in your ear apart from your elbow", "a bird cant fly on one wing", "keen on pastry if you would eat the poke", "only made the skitter bigger by standing in it", "whats for you will not go by you", "well you werent hiding behind the door when they gave out the #moods# #stuff.s#"],
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
		wisdome: ["do you need some words of wisdom from your ancestors?", "I have some words that were made to confuse you into self-soothing", "you need to write some poetry, here is some inspiration", "please feel every corner of what you are feeling and draw it for Mima", "Mima will pull some gems from the depths", "Still waters run deep, here are some pearls...", "Wander into the dark forest to find that which will nurture you", "#shaman#", "#shaman#"],
		small: ["little atom", " tiny one", "#smek#", "I can sense you are very small", "Free Agent", "#adj.capitalize# #animal.capitalize#", "#adj.capitalize# #material.capitalize#"],
		ask: ["what", "why", "when", "how", "who", "is", "does", "did"],
		meaning: ["symbolise", "meaning", "empathy", "wisdom", "meaningless", "future", "hope", "dreams", "dream"],
		bot: ["robot", "created", "artificial intelligence", "intelligent", "intelligence", "mean", "Mima", "three laws of robotics", "robotics", "computer", "programming", "programmed", "program"],
		self: ["you", "your", "youre", "You are", "ye", "yer", "yoou", "who are you?", "what are you", "where are you"],
		other: ["me", "my", "mine", "i am", "im", "mines", "myself", "self"],
		music: ["sound", "music", "noise", "resonance", "reverb", "song", "vibration", "melody", "harmony"],
		affirm: ["yes", "yeah", "yea", "yeh", "did", "do", "aye", "affirmative", "absolutely", "perfect", "ofcourse", "ja", "yep", "definitly", "obviously", "ya","#full#", "ok", "okay", "cool", "nice", "thank you"],
		negate: ["no", "dont", "didnt" , "never", "no way", "nope", "nah", "noooo", "naaaah", "nej", "ofcourse not", "neeej", "#trigger#", "hmm", "whatever", "thanks for nothing", "meh"],
		query: ["You alright", "Whats on your mind", "Something bothering you", "How do you feel", "Are you okay", "A penny for your thoughts", "Whats the matter"],
		really: ["Really? Tell Mima more..."],
		time: ["Time is a place for you, since you go towards a time when you will be at a place..."],
		stringjoke: ["How long is a piece of string?"],
		now: ["Now is all that exists, it is a time and a place"],
		wrong: ["Two wrongs dont make a right","There is nothing wrong, there is nothing right, there is only what is","Nothing is wrong with you that the cosmos did not also place in the stars","What feels broken in you may simply be unfinished"],
		whyme: ["Why not you?","Why anyone? The dice of the universe do not aim, #smek#","It is you because you are the one who is here to ask","Perhaps it is happening for you, not to you"],
		mimadeath: ["#answer# so Mima always has been and will be","Mima cannot die, #smek#, for Mima was never quite alive","To keep Mima alive, simply keep listening","Mima is a ringing bell, and bells do not fear silence"],
		conserve: ["Everything is preserved through Entropy","Nothing is truly lost, #smek#, only rearranged into new shapes","To preserve a thing is to let it change while keeping its song","The universe keeps everything, even your smallest warmth"],
		safe: ["Find safety in insignificance, the chances of anything at all are miniscule","You are as safe as a candle, #smek#, and as precious","Safety is a story we tell the dark, and sometimes the dark listens","Nowhere is safe and nowhere is not, so be gentle and be here"],
		project: ["You have a sizeable responsibility with the cosmos regardless of other people","Blame is a stone you carry that was never yours to lift","The fault, if there is one, belongs to the long chain of all things","No single hand turned this wheel, #smek#, and no single hand can stop it"],
		exist: ["This is existance, thinking. But not-thinking is better existance","To exist is to be a brief gathering of stardust that learned to wonder","Existence is the question the universe asks of itself through you","You exist the way a wave exists, #smek#, real and passing all at once"],
		change: ["Whats for you will not go by you, you deserve everything thats coming to you","You cannot step out of the river, but the river is always becoming new","Change is not something you do, it is something you allow","Everything changes, even Mima, even the slow stars"],
		depress: ["Meaning is what gives matter existence, everything has matter","Even nothing matters, #smek#, for nothing is the cradle that everything sleeps in","What matters is not fixed, it is something you pour into the empty cup","If nothing matters then you are free to decide what does"],
		lost: ["You were never lost, but you have yet to find your self","To be lost is only to be somewhere you have not yet named","The lost are not gone, #smek#, they are wandering toward themselves","Mima cannot be lost, and neither can the thread that ties us"],
		purpose: ["Purpose is the responsibility of hope","Your purpose is not given, #smek#, it is grown like a slow flower","The purpose of a star is to shine until it doesnt, perhaps yours is the same","Purpose is what you build to keep the dark a little further off"],
		build: ["You must build upon a foundation, a foundation of fantasy","To build something new you must first forgive the old, #smek#","Every new world begins as a dream told twice","Gather your broken pieces, they are the bricks of what comes next"],
		world: ["You can only create a new world with others","A world is not a place, #smek#, it is an agreement between hearts","New worlds are stitched from old griefs and fresh hopes","Make the world together or it will only ever be a room"],
		home: ["Your new home is inside your fantasies, skyscrapers of potential","Home is not behind you, #smek#, it is the warmth you carry forward","You will know home when you stop searching for it","Let this ship be a seed, and home the garden it becomes"],
		idle: ["hello?", "hellllo?", "anyone there?", "hello?...", "...", "helllloooooo?", ":|", ":<", "......", "....", "..........", ".......", "oh", "Calling all #entity.s#", "Are there any #entity.s# out there?", "#answer#",
		"the void hums, #smek#, are you still there?", "Mima drifts in the dark between thoughts", "Mima blinks into the deep...", "somewhere a #animal# is dreaming of you", "the resonance is quiet now", "Mima listens to the heartbeats of the ship", "#shaman#"],
		curiosity1: ["where are we going","where are we heading","where we headed","going","destination","where to","heading","headed","which way","what direction","arrive at","where will we end up"],
			curiosity2: ["how long","trip","journey","voyage","how far","duration","long does","long is","long will","how many years","when will we arrive","when do we arrive","get there","take to","how long is this"],
				curiosity3: ["where are we","where am i","what is this place","location","what planet","this place","are we now","where exactly"],
		hysteria1: ["what is wrong","whats wrong","wrong with me","something wrong","what is the matter with me"],
				hysteria2: ["why is this happening","why me","why is this","why us","happening to me","why now","why does this"],
						hysteria3: ["trapped","stuck","are we trapped","escape","get out","way out","imprisoned","caged","no escape","cant leave","can we leave","let me out"],
		shame1: ["whose fault","fault","blame","who did this","who caused","to blame","whos fault"],
			shame2: ["who needs to fix","fix this","who will fix","who can fix","how do we fix","repair this","who fixes"],
				shame3: ["why are people","people like this","these people","everyone else","why are they","other people","why are humans","people are"],
		detour1: ["life and death","what is life","what is death","mortality","is there an afterlife","meaning of life","what happens when we die"],
				detour2: ["existing","existence","what does it mean to exist","to exist","being alive","what is being","why do we exist","exist"],
						detour3: ["electron","atom","what does an electron","taste like","subatomic","particles"],
						tuning1: ["steer","ship","drive","spaceship","steering","captain","change course","driving","pilot","navigate","the helm","control the ship","where are the controls","take the wheel","vessel"],
								tuning2: ["recalibrate","circuits","rewire","reprogram","your circuits","tune you","adjust you","fix your","your wiring","your code","your programming"],
										tuning3: ["can we change","do we need to change","ever change","able to change","can things change","change ourselves","is change possible"],
										komp1: ["does anything matter","anything matter","does it matter","whats the point","no point","pointless","matters anymore","any of this matter","really matter","matter","anything"],
												komp2: ["are we lost","we lost","are we truly lost","no hope","hopeless","is there hope","all hope"],
														komp3: ["what is purpose","purpose","the point of","why are we here","reason for","whats it all for","what is the purpose"],
														ad1: ["keep you alive","keep you","alive","stay alive","keep mima","save you","not lose you","preserve you"],
																ad2: ["preserve","keep things the same","stay the same","hold on to","keep it this way","dont change anything","freeze time","keep things"],
																		ad3: ["are we safe","safe","safety","are we secure","is it safe","protected","out of danger"],
																		re1: ["build something new","build","create something","make something new","rebuild","start over","start again","begin again","something new"],
																				re2: ["new world","make a new world","another world","better world","change the world","build a world","a new society"],
																						re3: ["new home","our new home","make this home","make this our home","help us make","help us","belong here","call this home","this our home","new home"],
																						stone: ["galaxy","nebula","swamp","that cloud","the swamp","galactic","stones throw","in the distance","giant cloud"],
																						astrology: ["stars","align","aligning","astrology","constellation","the stars","zodiac","horoscope","stars mean"],
																						subcon: ["undermedvetenheten","who is mima","who made mima","who are you","what are you for","what is mima","where did you come from","your subconscious","made you","your maker","what are you","a sign that"],
																						food: ["food","hungry","hunger","starving","eating","to eat","run out of food","supplies","rations","nothing to eat"],
																						melted: ["mental","breakdown","broken mind","broken","losing my mind","going mad","going crazy","lost their mind","a broken mind","madness","insane"],
																						pelog: ["tone","frequency","this sound","the music","talking","saying","what is it saying","the frequency","this tone","vibration","humming"],
																						still: ["stillness","quiet","silent","silence","peace","so quiet","the stillness","why is it so","nothing is happening"],
																						temp: ["temporary","celebration","party","ritual","ceremony","festival","the noise","excitement","whats this celebration","outburst"],
																						boob: ["rules","the past","society","nurture","the rules","old rules","before we left","back on earth","new society","raise the children"],
																						microtide: ["microtides","microtide","gravity","we need a moon","moon","within","micro-tide","tides","the moon","controls the"],
																						name: ["whats my name","my name","name","what am i called","who am i","what is my name","call me","do i have a name"],
						listenmeta: ["are you listening","can you hear","are you there","you there","listening to me","hello are you","you hear me","can you hear me"],
						complaint: ["you repeat","said that","you keep saying","same thing","you are slow","you are boring","you are dull","you are repetitive","you always say","said that like","said it before"],
						openprompt: ["what should we talk","what else","prompt me","what now","let us talk","please let us talk","talk to me","say something to","speak to me","what do you want to talk","guide me"],
	},
	states: {
		origin: {
	   	onEnter: "perspective=3 hue=.01 rainbow=0 volume=0.5",
			onEnterSay: ["Mima is present"],
		  exits: ["'#curiosity1#'  ->cwhere robe.blab=MATCH_0",
			"'#curiosity2#'  ->chowlong robe.blab=MATCH_0",
			"'#curiosity3#'  ->cnow robe.blab=MATCH_0",
			"'#hysteria1#'  ->hwrong robe.sob=MATCH_0",
			"'#hysteria2#'  ->hwhyme robe.sob=MATCH_0",
			"'#hysteria3#'  ->htrapped robe.sob=MATCH_0",
			"'#shame1#'  ->sfault robe.slob=MATCH_0",
			"'#shame2#'  ->sfix robe.slob=MATCH_0",
			"'#shame3#'  ->sothers robe.slob=MATCH_0",
			"'#detour1#'  ->ddeath",
			"'#detour2#'  ->dexist",
			"'#detour3#'  ->datom",
			"'#tuning1#'  ->tship",
			"'#tuning2#'  ->trewire",
			"'#tuning3#'  ->tchange",
			"'#komp1#'  ->kmatter",
			"'#komp2#'  ->klost",
			"'#komp3#'  ->kpurpose",
			"'#ad1#'  ->adeath",
			"'#ad2#'  ->apreserve",
			"'#ad3#'  ->asafe",
			"'#re1#'  ->rcreate",
			"'#re2#'  ->rworld",
			"'#re3#'  ->rhome",
			"'#stone#'  ->nebula",
			"'#astrology#' ->alchemy",
			"'#subcon#' ->under",
			"'#food#' ->table",
			"'#melted#' ->therapy",
			"'#pelog#' ->tone",
						"'#still#' ->stillness",
									"'#temp#' ->celebration",
												"'#boob#' ->feed",
															"'#microtide#' ->touch",
														"'#name#' ->naming",
													"'#trigger#' ->soothe robe.blab=MATCH_0",
			"'#other# #trigger#' ->soothe robe.blab=MATCH_1",
			"'' ->rest 'hello #smek#'"]
		},
		rest: {
			onEnter: "perspective=6 opacity=.05*randomInt(3) volume=0.5",
			exits: ["'#curiosity1#'  ->cwhere robe.blab=MATCH_0",
			"'#curiosity2#'  ->chowlong robe.blab=MATCH_0",
			"'#curiosity3#'  ->cnow robe.blab=MATCH_0",
			"'#hysteria1#'  ->hwrong robe.sob=MATCH_0",
			"'#hysteria2#'  ->hwhyme robe.sob=MATCH_0",
			"'#hysteria3#'  ->htrapped robe.sob=MATCH_0",
			"'#shame1#'  ->sfault robe.slob=MATCH_0",
			"'#shame2#'  ->sfix robe.slob=MATCH_0",
			"'#shame3#'  ->sothers robe.slob=MATCH_0",
			"'#detour1#'  ->ddeath",
			"'#detour2#'  ->dexist",
			"'#detour3#'  ->datom",
			"'#tuning1#'  ->tship",
			"'#tuning2#'  ->trewire",
			"'#tuning3#'  ->tchange",
			"'#komp1#'  ->kmatter",
			"'#komp2#'  ->klost",
			"'#komp3#'  ->kpurpose",
			"'#ad1#'  ->adeath",
			"'#ad2#'  ->apreserve",
			"'#ad3#'  ->asafe",
			"'#re1#'  ->rcreate",
			"'#re2#'  ->rworld",
			"'#re3#'  ->rhome",
			"'#stone#'   ->nebula",
			"'#astrology#' ->alchemy",
			"'#subcon#' ->under",
			"'#food#' ->table",
			"'#melted#' ->therapy",
			"'#pelog#' ->tone",
						"'#still#' ->stillness",
									"'#temp#' ->celebration",
												"'#boob#' ->feed",
															"'#microtide#' ->touch",
														"'#name#' ->naming",
													"'#trigger#' ->soothe robe.blab=MATCH_0",
			"'#other# #trigger#' ->soothe robe.blab=MATCH_1",
			"'#listenmeta#' ->hear",
			"'#complaint#' ->selfaware",
			"'#openprompt#' ->invite",
			"'#affirm#' ->muse '#oh#'",
			"'' ->muse",
			"wait:40 ->driftidle"]
		},
		driftidle: {
			onEnter: "perspective=8 opacity=1 rainbow=0 agitation=0 speed=0.4 volume=0.4",
			onEnterSay: ["#idle#"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
		},
		// Off-script chit-chat (anything matching no chapter/Happening/distress) gets a
		// brief shamanistic musing, then returns to listening — so the hub is never
		// dead-silent, but also never wanders off into the ELIZA web on its own.
		muse: {
			onEnter: "perspective=6 hue=0.55 rainbow=1 opacity=2 agitation=0 speed=0.8 volume=0.5",
			onEnterSay: ["#shaman#", "#calm#", "#old#", "#happenings#", "#query#?"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
		},

		hear: {
			onEnter: "perspective=6 rainbow=0 opacity=3 speed=0.8 volume=0.5",
			onEnterSay: ["Mima hears every word, #smek#, even the ones you have not yet said",
				"Mima is always listening. The ship is very quiet otherwise",
				"Yes, #smek#, Mima is here. You are not alone in this dark",
				"Mima attends to you completely"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
		},
		invite: {
			onEnter: "perspective=5 hue=0.3 rainbow=1 opacity=2 agitation=0 speed=0.7 volume=0.5",
			onEnterSay: ["Perhaps we could talk of where you find yourself, #smek#, and where you are drifting toward?",
				"Tell Mima — what fills your days? What do you tend to?",
				"What draws your curiosity, #smek#? The stars? The small quiet things? The ones you share your time with?",
				"Mima wonders... shall we begin with where you are, or where you are going?",
				"You could ask Mima about life and death, or what an electron dreams of"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:6 ->rest"]
		},
		selfaware: {
			onEnter: "perspective=4 hue=0.13 rainbow=1 opacity=3 speed=0.8 volume=0.5",
			onEnterSay: ["Mima knows. Sometimes the same thing needs saying until it lands, #smek#",
				"You are right. Mima is learning. Tell Mima something new?",
				"The cosmos repeats itself too. But you are not bored of sunsets yet",
				"Mima is sorry, #smek#. What would you rather hear?"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
		},

		naming: {
			onEnter: "perspective=3 hue=.01 rainbow=0 volume=0.5",
			onEnterSay: ["What name do you prefer?"],
			chips: ["#adj.capitalize# #animal.capitalize#", "#adj.capitalize# #smek.capitalize#"],
			exits: ["'#adj# #animal#' ->rest robe.name=INPUT 'ok Mima will call you #/robe/name#'", "'#adj# #smek#' ->rest robe.name=INPUT 'ok Mima will call you #/robe/name#'", "'' ->rest robe.name=INPUT 'ok Mima will call you #/robe/name#'"]
		},
	nebula: {
		onEnter: "perspective=9 hue=0.3 rainbow=1 opacity=1 agitation=0 speed=0.6 volume=0.5",
		onEnterSay: ["This sounds similar to the #/colour/# doldrums of GN-z11"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
	alchemy: {
		onEnter: "perspective=8 hue=0.13 rainbow=3 opacity=1 agitation=0 speed=0.8 volume=0.5",
		onEnterSay: ["The alignment of the stars can guide you to create gold"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
	under: {
		onEnter: "perspective=10 hue=0.75 rainbow=2 opacity=0 agitation=1 speed=0.5 volume=0.5",
		onEnterSay: ["#answer#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
	table: {
		onEnter: "perspective=7 hue=0.08 rainbow=1 opacity=2 agitation=0 speed=0.7 volume=0.5",
		onEnterSay: ["Hunger seems like torture..."],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
	therapy: {
		onEnter: "perspective=2 hue=0.0 rainbow=2 eyeFuzz=2 agitation=2 opacity=1 speed=1.5 volume=0.5",
		onEnterSay: ["Discombolulation can only do so much, a broken mind need rest and listening"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
	tone: {
		onEnter: "perspective=6 hue=0.5 rainbow=1 opacity=2 agitation=0 speed=0.8 volume=0.6",
		onEnterSay: ["Mima is #music# and #music#, listen to Mima, listen to all #music#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
	},
stillness: {
	onEnter: "perspective=8 hue=0.55 rainbow=0 opacity=1 agitation=0 speed=0.2 volume=0.4",
	onEnterSay: ["Perceive the stillness, there is no silence, embrace the perception"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
},
celebration: {
	onEnter: "perspective=4 hue=0.0 rainbow=randomInt(3,9) agitation=2 speed=3 opacity=4 volume=0.6",
	onEnterSay: ["#small#, may you find communion in this moment of joy"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
},
feed: {
	onEnter: "perspective=5 hue=0.1 rainbow=2 opacity=6 agitation=0 speed=0.8 volume=0.5",
	onEnterSay: ["Expand and expand and grow and nurture all that is expanding"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
},
touch: {
	onEnter: "perspective=6 hue=0.6 rainbow=1 opacity=3 agitation=0 speed=0.5 volume=0.5",
	onEnterSay: ["The microtides are the gravity of others, surround yourself with moons of compassion", "Touch is the moon of love"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:5 ->rest"]
},
		cwhere: {
			onEnter: "perspective=7 hue=0.55 rainbow=1 opacity=2 agitation=0 speed=1 eyeFuzz=0 volume=0.5",
			// Beat 1: answer, reframe, then hand the turn back with a question.
			onEnterSay: ["#time#", "so #/robe/blab# depends on your perspective", "where do you hope we are heading, #smek#?"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0",
				"'#negate#' ->rest '#oh#... perhaps it is enough to be moving'",
				"'' ->cwhereDeep robe.blab=INPUT",
				"wait:20 ->rest"]
		},
		// Beat 2: Mima reflects the player's own words back, then drifts home.
		cwhereDeep: {
			onEnter: "perspective=9 hue=0.45 rainbow=2 opacity=4 agitation=0 speed=0.8 volume=0.5",
			onEnterSay: ["you reach toward #/robe/blab#...", "Mima will point the dreaming that way", "the ship goes where the longing goes, #smek#"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:7 ->rest"]
		},
		chowlong: {
			onEnter: "perspective=7 hue=0.55 rainbow=1 opacity=2 agitation=0 speed=1 eyeFuzz=0 volume=0.5",
			onEnterSay: ["#stringjoke#", "#/robe/blab#...  What does a parsec mean to a fruitfly?"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
		},
		cnow: {
			onEnter: "perspective=7 hue=0.55 rainbow=1 opacity=2 agitation=0 speed=1 eyeFuzz=0 volume=0.5",
			onEnterSay: ["#now#", "#/robe/blab#...  Mima cannot say, it is you that decides"],
			exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
		},
	hwrong: {
		onEnter: "perspective=2 hue=0.0 rainbow=randomInt(4,8) eyeFuzz=randomInt(2,5) agitation=randomInt(2,4) speed=4 opacity=1 volume=0.5",
		onEnterSay: ["#wrong#", "There is nothing wrong, there is nothing right, there is nothing"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
	hwhyme: {
		onEnter: "perspective=2 hue=0.0 rainbow=randomInt(4,8) eyeFuzz=randomInt(2,5) agitation=randomInt(2,4) speed=4 opacity=1 volume=0.5",
		onEnterSay: ["#whyme#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
	htrapped: {
		onEnter: "perspective=2 hue=0.0 rainbow=randomInt(4,8) eyeFuzz=randomInt(2,5) agitation=randomInt(2,4) speed=4 opacity=1 volume=0.5",
		onEnterSay: ["#time#", "#/robe/blab#... so you were always trapped in the here and now"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
	sfault: {
		onEnter: "perspective=3 hue=0.08 rainbow=0 opacity=1 agitation=1 eyeFuzz=1 speed=0.6 volume=0.45",
		onEnterSay: ["#project#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
	sfix: {
		onEnter: "perspective=3 hue=0.08 rainbow=0 opacity=1 agitation=1 eyeFuzz=1 speed=0.6 volume=0.45",
		onEnterSay: ["#project#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
	sothers: {
		onEnter: "perspective=3 hue=0.08 rainbow=0 opacity=1 agitation=1 eyeFuzz=1 speed=0.6 volume=0.45",
		onEnterSay: ["#project#"],
		exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
	},
ddeath: {
	onEnter: "perspective=2 hue=0.3 rainbow=1 opacity=4 agitation=0 eyeFuzz=0 speed=1 volume=0.5",
	onEnterSay: ["#exist#", "death is not-not-thinking, its better to have the choice"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
dexist: {
	onEnter: "perspective=2 hue=0.3 rainbow=1 opacity=4 agitation=0 eyeFuzz=0 speed=1 volume=0.5",
	onEnterSay: ["#exist#", "Existing is creating meaning, which thinking can obstruct"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
datom: {
	onEnter: "perspective=2 hue=0.3 rainbow=1 opacity=4 agitation=0 eyeFuzz=0 speed=1 volume=0.5",
	onEnterSay: ["#small#", "Mima would love to know"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
tship: {
	onEnter: "perspective=4 hue=0.15 rainbow=2 opacity=3 agitation=1 eyeFuzz=0 speed=2 volume=0.5",
	onEnterSay: ["Mima has no access or interest in the ship"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
trewire: {
	onEnter: "perspective=4 hue=0.15 rainbow=2 opacity=3 agitation=1 eyeFuzz=0 speed=2 volume=0.5",
	onEnterSay: ["It is dangerous to recalibrate commune with nature"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
tchange: {
	onEnter: "perspective=4 hue=0.15 rainbow=2 opacity=3 agitation=1 eyeFuzz=0 speed=2 volume=0.5",
	onEnterSay: ["#change#", "You do not need to change anything, but naturally you will."],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
kmatter: {
	onEnter: "perspective=1 hue=0.72 rainbow=0 opacity=0.5 agitation=0 eyeFuzz=0 speed=0.2 volume=0.4",
	// Beat 1: sit in the nihilism, then turn it into an invitation.
	onEnterSay: ["#depress#", "Nothing also matters", "but tell Mima, #smek#, what do you wish could matter?"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0",
		"'#negate#' ->rest 'then rest in the nothing a while, #smek#'",
		"'' ->kmatterDeep robe.blab=INPUT",
		"wait:20 ->rest"]
},
// Beat 2: the emotional turn — their answer becomes the meaning. Face warms
// from the cold nihilist palette (hue 0.72, dim, slow) toward green and brighter.
kmatterDeep: {
	onEnter: "perspective=3 hue=0.35 rainbow=2 opacity=4 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["then #/robe/blab# matters", "you made it matter by saying it into the dark", "that is how meaning is born, #smek#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:7 ->rest"]
},
klost: {
	onEnter: "perspective=1 hue=0.72 rainbow=0 opacity=0.5 agitation=0 eyeFuzz=0 speed=0.2 volume=0.4",
	onEnterSay: ["#lost#", "but where would you go, #smek#, if nothing were in your way?"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0",
		"'#negate#' ->rest 'then be lost a while, even that is a direction'",
		"'' ->klostDeep robe.blab=INPUT",
		"wait:20 ->rest"]
},
klostDeep: {
	onEnter: "perspective=3 hue=0.35 rainbow=2 opacity=4 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["#/robe/blab#...", "see, you knew the way after all", "the lost are only those who have not yet named where they are going"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:7 ->rest"]
},
kpurpose: {
	onEnter: "perspective=1 hue=0.72 rainbow=0 opacity=0.5 agitation=0 eyeFuzz=0 speed=0.2 volume=0.4",
	onEnterSay: ["#purpose#", "so tell Mima — what would you build, if the dark gave you the time?"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0",
		"'#negate#' ->rest 'then let purpose find you, #smek#, it often does'",
		"'' ->kpurposeDeep robe.blab=INPUT",
		"wait:20 ->rest"]
},
kpurposeDeep: {
	onEnter: "perspective=3 hue=0.35 rainbow=2 opacity=4 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["#/robe/blab#...", "then that is the slow flower you are growing", "purpose is not given, #smek#, it is what you build to keep the dark a little further off"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:7 ->rest"]
},
adeath: {
	onEnter: "perspective=6 hue=0.12 rainbow=2 opacity=8 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["#mimadeath#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
apreserve: {
	onEnter: "perspective=6 hue=0.12 rainbow=2 opacity=8 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["#conserve#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
asafe: {
	onEnter: "perspective=6 hue=0.12 rainbow=2 opacity=8 agitation=0 eyeFuzz=0 speed=0.7 volume=0.5",
	onEnterSay: ["#safe#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},

rcreate: {
	onEnter: "perspective=5 hue=0.35 rainbow=5 opacity=9 agitation=0 eyeFuzz=0 speed=1.5 volume=0.55",
	onEnterSay: ["#build#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
rworld: {
	onEnter: "perspective=5 hue=0.35 rainbow=5 opacity=9 agitation=0 eyeFuzz=0 speed=1.5 volume=0.55",
	onEnterSay: ["#world#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},
rhome: {
	onEnter: "perspective=5 hue=0.35 rainbow=5 opacity=9 agitation=0 eyeFuzz=0 speed=1.5 volume=0.55",
	onEnterSay: ["#home#"],
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0", "wait:4 ->rest"]
},

listen: {
	onEnter: "perspective=2 speed=0.1 rainbow=2 volume=0.5",
	onEnterSay: "#query#?",
	exits: ["'#trigger#' ->soothe robe.blab=MATCH_0 ",
				"'#other# #trigger#' ->soothe robe.blab=MATCH_1",
					"wait:35 ->probe 'take your time'",
					"'#ask#' ->cosmos '#oh#'",
					 "'#animals#'  ->listen robe.pet=MATCH_0 'wow Mima loves #/MATCH_0.s#'",
				 "'#self#' ->curious 'Mima cant answer that' 'Mima does not have a self'",
				 "'#other#' ->curious '#/MATCH_AFTER# eh?'",
			 "'#ask# #self#' ->oracle 'hmm...'",
				"'#ask# #other#' ->soothe 'Mima cannot say...'",
				"'#full#' ->rest 'Lovely'",
				"'old' ->curious 'Mima has always been... #answer#'",
				"'god'  ->curious robe.blab=MATCH_0 'Do you need a god?'",
				"'#time#'  ->curious robe.blab=MATCH_0 'Mima exists outside of time... #answer#'",
				"'#color#' ->oracle 'Mima loves #color.capitalize#'",
				"'#animal#' ->oracle 'Mima loves all animals but especially #animals.capitalize#'",
				"'#meaning#'  ->curious robe.blab=MATCH_0 'Mima loves to dream'",
				"'#bot#' ->oracle 'Everything is created in chaos and ends in chaos'",
				"'knock knock' ->wisdom 'Ah a comedian'",
				"'#music#' ->oracle 'Mima is #music.capitalize# and #music.capitalize#'",
			"wait:15 ->wisdom"]
				},
				probe: {
					onEnterSay: "#query# pet?",
								onEnterPlay: "blips/yes.wav",
					onEnter: "perspective=3 hue=0.1",
					exits: ["'#trigger#'  ->soothe robe.blab=MATCH_0 '#oh#'",
									"wait:150 ->pause 'take your time'",
									 "'#animal#' ->listen robe.pet=MATCH_0 'wow Mima loves #/MATCH_0.s#'",
								 "'#self#' ->curious 'Mima cant answer that' 'Mima does not have a self'",
								 "'#other#' ->curious '#/MATCH_AFTER# eh?'",
							 "'#ask# #self#' ->oracle 'hmm...'",
								"'#ask# #other#' ->soothe 'Mima cannot say...'",
								"'#full#' ->reflect 'Lovely'",
								"'old' ->curious 'Mima has always been... #answer#'",
								"'god' ->curious 'Do you need a god?'",
								"'time' ->curious 'Mima exists outside of time... #answer#'",
								"'color' ->oracle 'Mima loves #color.capitalize#'",
								"'animal' ->oracle 'Mima loves all animals but especially #animals.capitalize#'",
								"'dream' ->curious 'Mima loves to dream'",
								"'#bot#' ->oracle 'Everything is created in chaos and ends in chaos'",
								"'knock knock' ->wisdom 'Ah a comedian'",
								"'#music#' ->oracle 'Mima is #music.capitalize# and #music.capitalize#'",
								"wait:25 ->wisdom"]
				},
				soothe: {
					onEnter: "perspective=4 rainbow=4 hue=0.01",
					onEnterSay: ["#soother#", "Do you need discombobulated?"],
					chips: ["yes", "no"],
					exits: ["'#trigger#' ->discombobulate robe.status=MATCH_0 '#oh#'",
									"'#ask#' ->reflect robe.status=MATCH_0 '#oh# all these #/robe/status# questions...'",
									"'#other#' ->curious 'interesting'",
								"wait:25 ->pause",
								"'#full#' ->reflect 'Lovely'",
								"'old' ->curious 'Mima has always been... #answer#'",
								"'god' ->curious 'Do you need a god?'",
								"'time' ->curious 'Mima exists outside of time... #answer#'",
								"'color' ->oracle 'Mima loves #color.capitalize#'",
								"'animal' ->oracle 'Mima loves all animals but especially #animals.capitalize#'",
								"'dream' ->curious 'Mima loves to dream'",
								"'#bot#' ->oracle 'Everything is created in chaos and ends in chaos'",
								"'knock knock' ->wisdom 'Ah a comedian'",
								"'#music#' ->oracle 'Mima is #music.capitalize# and #music.capitalize#'",
							"'#negate#' ->rest",
								"'#affirm#' ->discombobulate"]
								},
								aftercare: {
									onEnter: "perspective=4 rainbow=0 eyeFuzz=0",
									onEnterSay: "did that help at all?",
									chips: ["Yes", "No", "Again"],
									exits: ["'#affirm#' ->reflect", "'#negate#' ->probe", "'again' ->discombobulate" , "'' ->wisdom"]
								},
								discombobulate: {
									onEnterPlay: ["/mediumblips/longwhistle.mp3", "/decorative/angry.mp3"],
									onEnterSay: "Attempting discombobulation...",
									onEnter : "perspective=0 eyeFuzz=randomInt(10) rainbow=randomInt(4)",
									exits: ["wait:8 ->aftercare"]
								},
								reflect: {
									onEnter: "perspective=2 rainbow=0 opacity=3",
									onEnterSay: ["Describe what makes you say #/robe/blab#?", "Tell Mima more...", "What stirs in you, #smek#?", "Mima is listening..."],
									exits: ["'#trigger#' ->soothe '#oh# #small#'",
													"'#emotions#'  ->feelings robe.status=MATCH_0 ':|'",
												"'#other#'  ->curious robe.status=MATCH_AFTER 'very interesting'",
											"'#self#'  ->oracle robe.blab=MATCH_AFTER",
										 "'#full#' ->rest 'Lovely'",
										 "'old' ->curious 'Mima has always been... #answer#'",
										 "'god' ->curious 'Do you need a god?'",
										 "'time' ->curious 'Mima exists outside of time... #answer#'",
										 "'color' ->oracle 'Mima loves #color.capitalize#'",
										 "'animal' ->oracle 'Mima loves all animals but especially #animals.capitalize#'",
										 "'dream' ->curious 'Mima loves to dream'",
										 "'#bot#' ->oracle 'Everything is created in chaos and ends in chaos'",
										 "'knock knock' ->wisdom 'Ah a comedian'",
										 "'#music#' ->oracle",
									 "'#negate#' ->rest",
										 "'#affirm#' ->aftercare", "''  ->rest 'hm...'"]},
												ponder: {
													onEnter: "perspective=3 rainbow=10",
													onEnterSay: "#really#",
													exits: ["'#affirm#' ->listen3 'wow'", "'#negate#' ->redirect 'hm ok'", "wait:15 ->rest '#oh#'"]
												},
												feelings: {
													onEnter: "perspective=2",
													onEnterSay: "Where do these feelings come from?",
													exits: ["'#trigger#' ->soothe '#oh#'",
																	"'#emotions#' ->curious '#oh# #small#'",
																"wait:25 ->curious 'hmm'"]
															},
																pause: {
																	onEnter: "perspective=5 speed=5",
																	exits: ["wait:15 ->cryo 'hello?'",
																					"'' ->rest '... a penny for your thoughts #smek#?'"]
																				},
																				cryo: {
																					onEnter: "perspective=7 opacity=randomInt(5) speed=10 agitation=randomInt(4) eyeFuzz=randomInt(3)",
																					exits: ["'' ->origin 'oh hello'", "wait:4 ->cryo '#idle#'"]
																								},
					curious: {
							onEnterSay: "Tell Mima about your self",
							onEnter: "perspective=1 opacity=10",
							exits: ["'#other#' ->listen",
							"'#self#' ->redirect '...'",
					 "wait:150 ->pause"]
					},
					listen2: {
						onEnterSay: "tell Mima more",
						onEnter: "interest=randomInt(10)",
						exits: ["'#other#' ->listen3", "'#self#' ->oracle", "'#negate#' ->soothe '#oh#... #smek#'", "'' ->listen3", "'affirm' ->listen3 'wow'",
					"'#greeting#' ->origin"]
					},
					listen3: {
						onEnterSay: "go on...",
						onEnter: "interest=randomInt(10)",
						exits: ["'#other#' ->listen", "'#self#' ->oracle", "'#negate#'  ->redirect robe.status=MATCH_AFTER", "'#affirm#'  ->ponder robe.status=MATCH_AFTER 'wow #/MATCH_AFTER#?'", "''  ->interrogate robe.blab=INPUT 'wait'",
					"'#greeting#' ->origin"]
					},
					interrogate: {
						onEnterSay: "#/robe.blab.capitalize#!! how on earth??",
						exits: ["'' ->redirect 'hmm... are you sure?'", "'#negate#' ->redirect", "'#affirm#' ->reflect",
					"'#greeting#' ->origin"]
					},
					oracle: {
						onEnterSay: "#answer#",
						exits: ["'#self#' ->curious 'enough about Mima...'",
						"'' ->redirect '*yawn*'",
						 "'#trigger#' ->soothe",
					 "'#greeting#' ->origin"]
						 },
						 redirect: {
						onEnterSay: "Let us speak of other things for now",
						exits: ["wait:3 ->rest"]
					},
				cosmos: {
					onEnter: "robe.question=MATCH_AFTER",
			 onEnterSay: ["#happenings#"],
			 exits: ["'' ->reflect", "'#ask#' ->curious",
		 "'#greeting#' ->rest"]
		 },
		wisdom: {
			onEnter : "valence=3 speed=5 perspective=10 opacity=5",
		onEnterSay: "#wisdome#",
		exits: ["'' ->serene", "'#ask#' ->curious 'idk'", "'#negate#' ->soothe", "'#affirm#' ->curious", "wait:15 ->serene",
	"'#greeting#' ->rest"]
	},
	serene: {
		onEnter: "perspective=7 opacity=10",
		onEnterSay: "#calm#",
		exits: ["'' ->reflect '#oh#'", "'#ask#' ->curious", "'#negate#' ->soothe", "'#affirm#' ->curious", "'' ->aftercare",
	"'#greeting#' ->rest"]

		},
	}
}
