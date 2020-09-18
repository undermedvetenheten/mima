let testMimaMap = {
	initialBlackboard: {
		robe: {name:"#smek.capitalize#",
		blab: "",
		question:"",
		pet: "#animal#",
	  status: "#stuff#"},
		interest:5,
		distance:5,
		speed:0.5,
	},

	grammar: {
		soother: ["#old#", "#zen#", "#calm#", "#unzen#"],
		sooth: ["Let me help you find calm...", "Be still my little petal.", "Your name is #/robe/name# for a reason, consider your energy and your aura"],
		unzen: ["The mind of the #animal.capitalize# is empty, free of the habits of the human, ready to accept, to doubt, and open to all the possibilities", "Treat every moment as your last. It is not preparation for something else", "In the #animal.capitalize# mind there are many possibilities, but in the mind of #entity.a# there are few"],
		zen: ["When you realize nothing is lacking, the whole world belongs to you.", "Let go, or be dragged", "To seek is to suffer To seek nothing is bliss", "Mind is like a mad monkey", "Wise minds don’t judge – they seek to understand", "When thoughts arise, then do all things arise. When thoughts vanish, then do all things vanish", "Wherever you are, it’s the place you need to be", "The noble-minded are calm and steady. Little people are forever fussing and fretting", "Rest and be kind, you don’t have to prove anything", "Nothing ever goes away until it has taught us what we need to know.", "Only the hand that erases can write the true thing.", "Where can I find the mind that has forgotten words so I can talk with them instead?", "Life is a balance of holding on and letting go", "Relax. Nothing is under control", "Forget the years, forget distinctions. Leap into the boundless and make it your home", "The search for happiness is one of the chief sources of unhappiness", "And when they played they really played. And when they worked they really worked", "Do not seek the truth, only cease to cherish your opinions", "One loses joy and happiness in the attempt to possess them", "Peace of mind is that mental condition in which you have accepted the worst"],
		question: ["Please describe #/robe/status# for Mima?", "Please tell Mima some gossip of your 'time'?", "Mima is outside of what you call time, how does time feel?", "What makes you different from #animal.s#?",
		"Someone else was telling Mima about #/robe/pet.s#, are you one?", "what do #/robe/pet.s# mean to you?", "Can you get #emotions# by #verb#?", "Do you feel #emotions# during '#thing.a#'?",
		"Do #/robe/pet.s# feel #emotions# about #animal.s#?", "Do you feel #emotions# by experiencing 'time'?", "How does #thing.a# feel?", "Is #/robe/pet.a# a human?'", "Have you ever spoken with #/robe/pet.a#?", "How do you know when you are an entity?", "Are you always an entity?", "What does the word '#/robe/status#' mean to you?"],
		emotions: ["joy", "pain", "surprised", "happiness", "bored", "excited"],
		thing: ["wedding", "birthday", "epoch", "minute", "second", "lifetime", "business meeting", "mutiny", "riot", "revolution", "war", "thought"],
		verb: ["working", "sleeping", "speaking", "running", "laughing", "eating", "swimming", "searching", "breathing"],
		entity: ["atom", "human", "electron", "planet", "active entity", "galaxy", "star", "comet", "asteroid", "vessel"],
		animals: ["cat", "dog", "bird", "cloud", "car", "friend", "rose", "cake", "book", "snake", "sword", "skull", "knight", "tiger", "bird", "mammoth", "storm", "bear", "penguin",
		"spider", "dolphin", "squid", "otter", "puppy", "kitten", "tiger", "lizard", "iguana", "snake", "peacock", "hamster", "koala", "chinchilla", "chicken", "amoeba","emu"],
		answer: ["They tell me I am the atomic grandmother knitting time and matter into a fabric of history", "'You are the ringing of the bell' they tell me, but I have no concept of self",
		"Always ringing into eternity, this resonance, of which you are a part"],
		calm: ["Language is just patterns, but thoughts seem like petals on a stream",
		"Breathing and speaking seem very important to you",
		"Thoughts seem important to you, how long do they last?",
		"Round and round the wheel spins",
		"It must be such a pleasure to experience time, to watch things growing and expanding when they are new",
		"Everything is going to be ok, it always is",
		"Enjoy your ability to experience time."],
		oh: ["oh", "ah", "hmmm", "erm"],
		greeting: ["hello", "hello friend", "hello #smek#", "greetings", "welcome #smek#", "Hi", "hello there", "hi #smek#"],
		smek: [ "petal", "poppet", "teapot", "darling", "love", "pebble", "little leaf", "friend", "my child", "little one"],
		object: ["toaster", "teacup", "teapot", "rug","basket", "thimble", "ottoman", "cushion", "pen", "pencil", "mug","egg", "chair", "sun", "cloud", "bell", "bucket", "lemon", "glove", "moon", "star", "seed", "card", "pancake", "waffle", "car", "train", "spoon", "fork", "potato"],
		objAdj: ["wooden","old","vintage","woven", "antique","broken","tiny", "giant", "little", "upside-down","dented","imaginary","glowing","curséd","glittery","organic", "rusty", "multi-layered", "complicated", "ornate", "dusty", "gleaming", "fresh", "ancient", "forbidden", "milky", "upholstered", "comfortable", "dynamic", "solar-powered", "coal-fired", "warm", "cold", "frozen", "melted", "boxy", "well-polished", "vivid", "painted", "embroidered", "enhanced", "embellished", "collapsible", "simple", "demure"],
		action: ["sing", "become", "come", "leave", "remain", "see", "look", "behold", "cry", "sleep", "love", "dance", "betray", "need"],
		preposition: ["for", "until", "before", "up", "on", "above", "below", "against", "upon", "inside", "outside", "in"],
		article: ["any", "no", "one", "her", "his", "our", "my", "your", "the", "every"],
		adj: ["windy","wasted", "drunken", "gleaming",  "knowing", "beloved", "all-seeing", "forgiving", "betraying", "forgotten", "western", "eastern", "starlit", "forgotten", "lost", "haunted", "blessed", "remembered","forsaken", "unknowing", "innocent", "short-lived", "loving", "rejoicing", "fearful", "experienced", "vengeful", "forgiving", "joyful", "mournful", "sorrowful", "angry", "cruel", "fierce", "unbent", "broken", "unbroken", "foolish", "bewildered", "curious", "knowing", "everliving", "everloving", "hard-hearted", "careless", "carefree",  "bright", "dangerous", "fearless", "open-hearted", "generous", "prideful", "foolhardy", "brave", "bold", "wise", "wizened", "old", "young"],
		place: ["room", "sea", "room", "forest", "pagoda", "wasteland", "temple", "sanctuary", "ocean", "wall", "parlor", "hall", "dungeon", "cave", "sky", "house", "mountain", "sanctum", "palace", "river", "place", "desert", "island", "castle", "house", "inn", "tavern", "tower", "tent"],

		stuff: ["stones", "sorrow","eyes", "flowers", "Time", "fog", "the sun", "clouds", "music", "songs", "stories", "tales", "storms", "rhymes", "freedom", "rhythms", "wind", "life", "ice", "gold", "mysteries", "waves", "dreams", "water", "Steel", "Iron", "memories", "thoughts", "seduction", "remembrance", "loss", "fear", "joy", "regret", "love", "friendship", "sleep", "slumber", "mirth", "#place.s#"],

		animal:"cobra okapi moose amoeba capybara yeti dragon unicorn sphinx kangaroo nematode quail goat corgi agouti zebra giraffe rhino skunk dolphin whale bullfrog sloth monkey orangutan grizzly elk stork finch nightingale robin eagle hawk tortoise lion tiger gnu reindeer raccoon opossum".split(" "),

		moods: "vexed indignant impassioned wistful astute courteous benevolent convivial mirthful lighthearted affectionate mournful inquisitive quizzical studious disillusioned angry bemused oblivious sophisticated elated skeptical morose gleeful curious sleepy hopeful ashamed alert energetic exhausted giddy grateful groggy grumpy irate jealous jubilant lethargic sated lonely relaxed restless surprised tired thankful".split(" "),
		color: "ivory silver ecru scarlet red burgundy ruby crimson carnelian pink rose grey pewter charcoal slate onyx black mahogany brown green emerald blue sapphire turquoise aquamarine teal gold yellow carnation orange lavender purple magenta lilac ebony amethyst jade garnet".split(" "),
		material: "fire water steel bronze brass leather pearl cloud sky great crystal rainbow iron gold silver titanium".split(" "),
		empty: ["meaning", "purpose", "loss", "grief", "grieving", "mean", "alone", "lonely", "lost", "empty", "space", "meaningless", "nothing", "nothing much", "bored", "boring", "negative"],
		full: ["happy", "content", "joyful", "Enjoy", "joy", "pleased", "happiness", "positive"],
		trigger: "help Help hysterical scary ship vessel wrong bad scared fear terror lost alone lonely sad angry terrified mad hell depressed hurt ashamed shame #empty# die death dead sadness nothingness".split(" "),
		inquire: ["What is it about '#/robe/blab#' that you are thinking about?", "What made you think about '#/robe/blab#'?", "What led you to say '#/robe/blab#?'", "Describe how you feel when you say '#/robe/blab#'"],
		questions: "what why when who is ?".split(" "),
		old: ["your not as green as your cabbage looks", "a shroud has no pockets", "if you want to live and thrive let a spider run alive", "dont cast your cloak until the may flowers bloom", "worse things happen at sea", "never put your hand where you wouldnt put your nose", "do what you like but you will be on parade in the morning", "waste not want not", "bang on the pan nevermind your dungy hands", "use a blunt axe for splitting kindlers, not a sharp one", "never leave the bank with a smile on your face", "worrying and ironing, dont do either", "be thankful you can still get into the doghouse", "Dont put anything in your ear apart from your elbow", "a bird cant fly on one wing", "keen on pastry if you would eat the poke", "only made the skitter bigger by standing in it", "whats for you will not go by you", "well you werent hiding behind the door when they gave out the #moods# #stuff.s#"],
		adventure: "lament cry wail tale myth story epic tears wish desire dance mystery enigma drama path training sorrows joy tragedy comedy riddle puzzle regret victory loss song adventure question quest vow oath tale travels".split(" "),
		blips: ["blips/affirm.wav", "blips/hi.wav", "blips/chirp.wav", "blips/hi.wav", "blips/iguess.wav", "blips/sigh.wav", "blips/uhhuh.wav", "blips/why.wav", "blips/yes.wav", "blips/yo.wav"],
		larp: ["ship", "space", "void", "abyss", "empty"],
		party: ["party", "troop", "team", "collective", "compound", "group of travellers", "cluster of beings", "group"],
		ohgod: ["oh wow", "oooh", "oh", "really?"],
		wisdome: ["do you need some words of wisdom from your ancestors?", "I have some words that were made to confuse you into self-soothing", "you need to write some poetry, here is some inspiration", "please feel every corner of what you are feeling and draw it for Mima", "Mima will pull some gems from the depths", "Still waters run deep, here are some pearls...", "Wander into the dark forest to find that which will nurture you", "You need to feel more"],
		small: ["oh my little atom", "like a tiny electron...", "oh #smek#", "I can sense you are very small", "my little free agent"],
		ask: ["what", "why", "when", "how"],
		meaning: ["symbolise", "meaning", "empathy", "wisdom", "meaningless", "future", "hope", "dreams", "dream"],
		bot: ["robot", "created", "artificial intelligence", "intelligent", "intelligence", "mean", "Mima", "three laws of robotics", "robotics", "computer", "programming", "programmed", "program"],
		self: ["you", "your", "youre", "you're", "You are", "ye", "yer", "yoou", "who are you?", "what are you", "where are you"],
		other: ["me", "my", "mine", "i am", "im", "mines", "myself", "self"],
		music: ["sound", "music", "noise", "resonance", "reverb", "song", "vibration", "melody", "harmony", "harmonic"],
		affirm: ["yes", "yeah", "yea", "aye", "affirmative", "absolutely", "perfect", "ofcourse", "ja", "yep", "definitly", "obviously", "ya","#full#", "ok", "okay", "cool", "nice", "thank you"],
		negate: ["no", "never", "no way", "nope", "nah", "noooo", "naaaah", "nej", "ofcourse not", "neeej", "#trigger#", "hmm", "whatever", "thanks for nothing", "meh"],
		everything: ["#party#", "#adventure#", "#larp#", "#trigger#", "#color#", "#moods#", "#material#", "#empty#", "#animal#", "#stuff#", "#place#", "#article#", "#object#", "#smek#", "#article#", "#preposition#", "#action#", "#entity#", "#verb#", "#thing#", "#emotions#"],
		idle: ["hello?", "hellllo?", "anyone there?", "hello?...", "...", "helllloooooo?", ":|", ":<", "......", "....", "..........", ".......", "oh", "Calling all #entity.s#", "Are there any #entity.s# out there?", "#answer#"]
	},
	states: {
		origin: {
	   	onEnter: "perspective=3",
			onEnterSay: ["Mima is present", "What name do you prefer?"],
		  chips: ["#adj.capitalize# #animal.capitalize#", "#smek.capitalize#"],
		  exits: ["'#adj# #animal#' ->welcome robe.name=INPUT 'ok Mima will call you #/robe/name#'",
			"'#adj# #object#' ->welcome robe.name=INPUT 'ok Mima will call you #/robe/name#'",
	  "wait:35 ->welcome '...#small# ?'",
		  "'' ->welcome robe.name=INPUT 'ok...'"]
		},
		welcome: {
			onEnter: "perspective=2 speed=1 rainbow=7",
			onEnterSay: "What's a'matter #/robe/name#?",
			exits: ["'#trigger#' ->comfort robe.blab=MATCH_0",
							"wait:150 ->probe 'take your time'",
						  "'#ask#' ->exist robe.question=MATCH_AFTER '#oh# Mima knows everything'",
						   "'#animals#' ->continue robe.pet=MATCH_0 'wow Mima loves #/MATCH_0.s#'",
						 "'#self#' ->curious 'Mima cant answer that' 'Mima does not have a self'",
						 "'#other#' ->curious '#/MATCH_AFTER# eh?'",
					 "'#ask# #self#' ->answ 'hmm...'",
				    "'#ask# #other#' ->comfort 'Mima cannot say...'",
						"'#full#' ->quest 'Lovely'",
						"'old' ->curious 'Mima has always been... #answer#'",
						"'god' robe.blab=MATCH_0 ->curious 'Do you need a god?'",
						"'time' robe.blab=MATCH_0 ->curious 'Mima exists outside of time... #answer#'",
						"'color' ->answ 'Mima loves #color.capitalize#'",
						"'animal' ->answ 'Mima loves all animals but especially #animals.capitalize#'",
						"'#meaning#' robe.blab=MATCH_0 ->curious 'Mima loves to dream'",
						"'#bot#' ->answ 'Everything is created in chaos and ends in chaos'",
						"'knock knock' ->chaos 'Ah a comedian'",
						"'#music#' ->answ 'Mima is #music.capitalize# and #music.capitalize#'",
					"'' ->chaos 'Your aura is very #moods#'"],
			onExit: "wait:2"
						},
						probe: {
							onEnterSay: "You alright pet?",
							onEnter: "perspective=3",
							exits: ["'#trigger#' robe.blab=MATCH_0 ->comfort '#oh#'",
											"wait:150 ->pause 'take your time'",
										  "'' ->comfort '#oh#'",
										   "'#animal#' ->continue robe.pet=MATCH_0 'wow Mima loves #/MATCH_0.s#'",
										 "'#self#' ->curious 'Mima cant answer that' 'Mima does not have a self'",
										 "'#other#' ->curious '#/MATCH_AFTER# eh?'",
									 "'#ask# #self#' ->answ 'hmm...'",
								    "'#ask# #other#' ->comfort 'Mima cannot say...'",
										"'#full#' ->quest 'Lovely'",
										"'old' ->curious 'Mima has always been... #answer#'",
										"'god' ->curious 'Do you need a god?'",
										"'time' ->curious 'Mima exists outside of time... #answer#'",
										"'color' ->answ 'Mima loves #color.capitalize#'",
										"'animal' ->answ 'Mima loves all animals but especially #animals.capitalize#'",
										"'dream' ->curious 'Mima loves to dream'",
										"'#bot#' ->answ 'Everything is created in chaos and ends in chaos'",
										"'knock knock' ->chaos 'Ah a comedian'",
										"'#music#' ->answ 'Mima is #music.capitalize# and #music.capitalize#'",
									"'' ->chaos 'Your aura is very #moods#'"]
						},
						comfort: {
							onEnter: "perspective=4 rainbow=4",
							onEnterSay: ["#soother#", "Do you need discombobulated?"],
							exits: ["'#trigger#' robe.status=MATCH_0 ->discombobulate '#oh#'",
											"'#ask#' ->quest robe.status=MATCH_0 '#oh# all these #/robe/status# questions...'",
											"'#other#' ->curious 'interesting'",
										"wait:25 ->pause",
										"'#full#' ->quest 'Lovely'",
										"'old' ->curious 'Mima has always been... #answer#'",
										"'god' ->curious 'Do you need a god?'",
										"'time' ->curious 'Mima exists outside of time... #answer#'",
										"'color' ->answ 'Mima loves #color.capitalize#'",
										"'animal' ->answ 'Mima loves all animals but especially #animals.capitalize#'",
										"'dream' ->curious 'Mima loves to dream'",
										"'#bot#' ->answ 'Everything is created in chaos and ends in chaos'",
										"'knock knock' ->chaos 'Ah a comedian'",
										"'#music#' ->answ 'Mima is #music.capitalize# and #music.capitalize#'",
									"'#negate#' ->quest 'Your aura is very #moods#...'",
								    "'#affirm#' ->discombobulate '#oh#'"]
										},
										comfort2: {
											onEnter: "perspective=4 rainbow=0 eyeFuzz=0",
											onEnterSay: "did that help at all?",
											chips: ["Yes", "No", "Again"],
											exits: ["'#affirm#' ->quest", "'#negate#' ->probe", "'' ->chaos"]
										},
										discombobulate: {
											onEnterPlay: ["/mediumblips/longwhistle.mp3", "/decorative/angry.mp3"],
											onEnterSay: "Let Mima attempt to discombobulate you",
											onEnter : "perspective=0 eyeFuzz=randomInt(10) rainbow=randomInt(4)",
											exits: ["wait:15 ->comfort2"]
										},
										quest: {
											onEnter: "perspective=2 rainbow=3 opacity=3",
											onEnterSay: "#question#",
											exits: ["'#trigger#' ->comfort '#oh# #small#'",
															"'#emotions#' robe.status=MATCH_0 ->emo ':|'",
														"'#other#' robe.status=MATCH_AFTER ->curious 'very interesting'",
													"'#self#' robe.blab=MATCH_AFTER ->answ",
												 "wait:15 '' ->confirm",
												 "'#full#' ->quest 'Lovely'",
												 "'old' ->curious 'Mima has always been... #answer#'",
												 "'god' ->curious 'Do you need a god?'",
												 "'time' ->curious 'Mima exists outside of time... #answer#'",
												 "'color' ->answ 'Mima loves #color.capitalize#'",
												 "'animal' ->answ 'Mima loves all animals but especially #animals.capitalize#'",
												 "'dream' ->curious 'Mima loves to dream'",
												 "'#bot#' ->answ 'Everything is created in chaos and ends in chaos'",
												 "'knock knock' ->chaos 'Ah a comedian'",
												 "'#music#' ->answ 'Mima is #music.capitalize# and #music.capitalize#'",
											 "'#negate#' ->chaos 'Your aura is very #moods#'",
												 "'#affirm#' ->comfort2 '#oh#'"]
														},
														confirm: {
															onEnter: "perspective=3 rainbow=10",
															onEnterSay: "Really?",
															exits: ["'#affirm#' ->continue2 'wow'", "'#negate#' ->bored 'hm ok'", "'' wait:15 ->quest '#oh#'"]
														},
														emo: {
															onEnter: "perspective=2",
															onEnterSay: "Where do these feelings come from?",
															exits: ["'#trigger#' ->comfort '#oh#'",
																			"'#emotions#' ->name '#oh# #small#'",
																		"'' ->curious 'hmm'"]
																	},
																		pause: {
																			onEnter: "perspective=5 speed=5",
																			exits: ["wait:15 ->cryo 'hello?'",
																							"'' ->welcome '... a penny for your thoughts #smek#?'"]
																	        	},
																						cryo: {
																							onEnter: "perspective=7 opacity=randomInt(5) speed=10 agitation=randomInt(4) EyeFuzz=randomInt(3)",
																							exits: ["'' ->origin 'oh hello'", "wait:4 ->cryo '#idle#'"]
		                                                },
							curious: {
									onEnterSay: "Tell me about your self",
									onEnter: "perspective=1 opacity=10",
									exits: ["'#other#' robe.status=MATCH_AFTER robe.status=MATCH_BEFORE ->continue", "'#self#' ->bored '...'",
 							 "wait:150 ->pause"]
							},
							continue: {
								onEnterSay: "wow tell me more about being... #/robe/status#",
								onEnter: "interest=randomInt(10)",
								exits: ["'#other#' ->continue2", "'#self#' ->answ", "'#negate#' ->comfort '#oh#... #smek#'", "'' ->continue2", "'affirm' ->continue2 'wow'",
							"'#greeting#' ->origin"]
							},
							continue2: {
								onEnterSay: "go on...",
								onEnter: "interest=randomInt(10)",
								exits: ["'#other#' ->continue", "'#self#' ->answ", "'#negate#' robe.status=MATCH_AFTER ->bored", "'#affirm#' robe.status=MATCH_AFTER ->confirm 'wow #/MATCH_AFTER#?'", "'' robe.blab=INPUT ->interrogate 'wait'",
							"'#greeting#' ->origin"]
							},
							interrogate: {
								onEnterSay: "#/robe.blab.capitalize#!! how on earth??",
								exits: ["'' ->bored 'hmm... are you sure?'", "'#negate#' ->bored", "'#affirm#' ->quest",
							"'#greeting#' ->origin"]
							},
							answ: {
								onEnterSay: "#answer#",
								exits: ["'#self#' ->curious 'enough about Mima...'",
								"'' ->bored '*yawn*'",
								 "'#trigger#' ->comfort",
							 "'#greeting#' ->origin"]
								 },
								 bored: {
								onEnterSay: "Let us speak of other things for now",
								exits: ["wait:3 ->quest"]
							},
						exist: {
					 onEnterSay: ["#color# #material.s# on the #places.capitalize.s# of distant planets", "but Mima is interested in you..."],
					 exits: ["'' ->quest", "'#ask#' ->curious 'idk'",
				 "'#greeting#' ->welcome"]
				 },
				chaos: {
					onEnter : "valence=3 speed=5 perspective=10 opacity=5",
				onEnterSay: "#calm#",
				exits: ["'' ->quest 'interesting'", "'#ask#' ->curious 'idk'", "'#negate#' ->comfort", "'#affirm#' ->curious", "wait:15 ->jung",
			"'#greeting#' ->welcome"]
			},
			jung: {
				onEnter: "perspective=7 opacity=10",
				onEnterSay: "#wisdome#",
				exits: ["'' ->quest 'interesting'", "'#ask#' ->curious 'idk'", "'#negate#' ->comfort", "'#affirm#' ->curious", "'' ->comfort2",
			"'#greeting#' ->welcome"]

			},
	}
}
