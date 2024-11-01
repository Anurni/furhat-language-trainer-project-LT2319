import { AnyActorRef, assign, createActor, fromPromise, setup } from "xstate";

const FURHATURI = "127.0.0.1:54321";    //192.168.1.11:54321 <--- this is the physical Furhat uri


// *************************************************************************
// FUNCTIONS ARE DEFINED HERE
// *************************************************************************

// Furhat's listening function
// check if it's possible to add language as an argument, Furhat needs different listening functions for different languages

async function fhListen(language: string) {
  const myHeaders = new Headers();
  const encLang = encodeURIComponent(language)
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/listen?language=${encLang}`, {
    method: "GET",
    headers: myHeaders,
  })
    .then((response) => response.body)
    .then((body) => body.getReader().read())
    .then((reader) => reader.value)
    .then((value) => JSON.parse(new TextDecoder().decode(value)).message);
}


// Furhat talking function

async function fhSay(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(text);
  return fetch(`http://${FURHATURI}/furhat/say?text=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

// audio producing function
async function fhAudioSound(url: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encURL = encodeURIComponent(url);
  
  return fetch(`http://${FURHATURI}/furhat/say?url=${encURL}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

// Furhat voice changing function, needed to match user's choice of targLang

async function fhVoiceChange(voice: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(voice); // This is not used in the fetch call
  return fetch(`http://${FURHATURI}/furhat/voice?name=${encText}`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  })
}

// furhat led function
async function fhLed(red: number, green: number, blue: number) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/led?red=${red}&green=${green}&blue=${blue}`, {  
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}

// furhat character changing function

async function fhChangeCharacter(character: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(character);
  return fetch(`http://${FURHATURI}/furhat/face?mask=adult&character=${encText}`, {  
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}


// Function for retrieving ready - made gestures from Furhat

async function fhGesture(gesture: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const gesture_cleaned = gesture.trim()
  
  console.log("Cleaned gesture:", gesture_cleaned); 
  
  const response = await fetch(
    `http://${FURHATURI}/furhat/gesture?name=${gesture_cleaned}&blocking=true`,
    {
      method: "POST",
      headers: myHeaders,
      body: "",
    },
  );

  console.log("Response status:", response.status); 
  console.log("Response ok?", response.ok);         
  return response;
}

// attending to User function
async function fhAttendToUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=CLOSEST`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({ 
      enum: "CLOSEST",
    }),
  });
}

// *************************************************************
// other functions and consts are defined here
// *************************************************************

function insertLearnerInformation(context : any) {
  const targetLang = context.targetLang;
  const skillLevel = context.skillLevel;
  const chosenScenarioType = context.scenarioType; 
  
  let scenarios;

  if (skillLevel === "beginner" || skillLevel === "Beginner") {
    scenarios = chosenScenarioType === "professional" ? beginner_professionallife : beginner_everydaylife;
  } else if (skillLevel === "advanced" || skillLevel === "Advanced") {
    scenarios = chosenScenarioType === "professional" ? advanced_professionallife : advanced_everydaylife;
  } 

  // Get a random scenario from our options
  const randomScenario = getRandomScenario(scenarios);

  return `Information about user's choice of target language: ${targetLang}. 
  Information about user's skill level: ${skillLevel}.
  This is the scenario that the user would like to practice: ${randomScenario}`; 
}

const beginner_professionallife = {
  1: "introducing yourself on your first day to a colleague",
  2: "asking your colleague for a help on a task",
  3: "asking your colleague about their weekend plans",
  4: "asking your colleague out for lunch",
};

const beginner_everydaylife = {
  1: "ordering a coffee at a café",
  2: "talking about your family to a friend",
  3: "discussing your weekend plans",
  4: "asking someone about their favourite food",
  5: "asking for directions out downtown",
  6: "book a dentist appointment over the phone"
};

const advanced_professionallife = {
  1: "introducing a professional idea to your boss",
  2: "asking your boss for a raise",
  3: "asking your teammate about project timeline and deadlines",
  4: "introducing yourself and your background in an international conference",
};

const advanced_everydaylife = {
  1: "calling the doctors to reshedule your appointment",
  2: "calling a car rental to discuss the mistaken bill you received",
  3: "ask for book recommendations from a librarian at the library",
  4: "debate about a controversial topic with your friend",
};


const languageoptions = "spanish, french, turkish, greek, and swedish"


function getRandomScenario(scenarios: object) {
  const keys = Object.keys(scenarios); 
  const randomIndex = Math.floor(Math.random() * keys.length); 
  const randomKey = keys[randomIndex]; 
  return scenarios[randomKey]; 
}

const furhatGestures = [' Oh', ' Smile', ' Wink', ' BigSmile', ' Blink', ' BrowRaise', ' OpenEyes']


// ***************************************************************************

interface MyDMContext extends DMContext {
  //noinputCounter: number;
  availableModels?: string[];
  messages: Message[];
  targetLang: string;
  languageCode: string;
  targetVoice: string;
  skillLevel: string;
  scenarioType: string;
  situation: string;
  character: string;
  utteranceGesture: string;
}
interface DMContext {
  //count: number;
  //ssRef: AnyActorRef;
}
interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
  },
  guards: {
    skillLevelIsAdvanced: ({ context }) => { return context.skillLevel == "advanced"}   // not used at the moment
  },
  actions: {

  },
  actors: {
    get_ollama_models: fromPromise<any, null>(async () => {
      return fetch("http://localhost:11434/api/tags").then((response) =>
        response.json()
      );
    }),

    llm_generate: fromPromise<any, {prompt:Message[]}>(async ({ input }) => {
      const body = {
        model: "gemma2",  //mistral
        stream: false,
        messages: input.prompt,
        temperature: 0.5,
      };
      console.log(`This is the body--> ${JSON.stringify(body)}`)
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
    }),

    llm_generate2: fromPromise<any, {prompt: string}>(async ({ input }) => {
      const body = {
        model: "gemma2", //mistral
        stream: false,
        prompt: input.prompt,
        temperature: 0.5
      };
      console.log(`This is the body--> ${JSON.stringify(body)}`)
      return fetch("http://localhost:11434/api/generate", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
    }),

    fhSpeakWGesture: fromPromise<any, {message: string, gesture: string}>(async ({input}) => {
      return Promise.all([
        fhSay(input.message),
        fhGesture(input.gesture),
        fhAttendToUser(),
      ])
    }),

    fhSpeak: fromPromise<any, {message: string}>(async ({input}) => {
      return Promise.all([
        fhSay(input.message),
        fhAttendToUser(),
      ])
    }),


    fhListenEnglish: fromPromise<any, null>(async () => {
      return Promise.all([
       fhListen("en-US"),
       fhAttendToUser(),
       fhLed(50,20,200)
      ])
     }),

     fhListenTargetLang: fromPromise<any, {language: string}>(async ({input}) => {
      return Promise.all([
       fhListen(input.language),
       fhAttendToUser(),
       fhLed(50,20,200)
      ])
     }),

     fhChangeVoice: fromPromise<any, {voice: string, character: string}>(async ({input}) => {
      return Promise.all([
       fhVoiceChange(input.voice),
      fhChangeCharacter(input.character)
      ])
     }),

     fhApplaud: fromPromise<any,{url: string}>(async ({input}) => {
      return Promise.all([
        fhAudioSound("https://raw.githubusercontent.com/Anurni/furhat-language-trainer-project-LT2319/main/applause-75314.wav")
      ])
     })
  },
}).createMachine({
  context: 
    { 
      messages: [{role: "user", content: "You are a spoken language instructor, and your task is to help a learner practice their target language in real-life situations. You will act as the other person in the scenario-role play (for example a waiter, colleague, or shop assistant)"}],
      targetLang: "",
      languageCode: "",
      targetVoice: "",
      skillLevel: "",
      scenarioType: "",
      situation : "",
      character : "",
      utteranceGesture:' BigSmile',
    },
  id: "DM",
  initial: "GetModels",
  states: {
    // getModels state - API call to the ollama models
        GetModels: {
          invoke: {
            src: "get_ollama_models",
            input: null, 
            onDone: {
              target: "SetLangToEnglish",
              actions: assign(({ event }) => {
                console.log(`This is the event.output.models--> ${event.output.models}`);
                return {
                  availableModels: event.output.models.map((m: any) => m.name),
                };
              }),
            },
            onError: {
              actions: () => console.error("no models available"),
            },
          },
        },

    // set English as the 'default' language in the beginning
    // also Furhat's default mask (James) is set
    SetLangToEnglish: {
      invoke: [{
        src: "fhChangeVoice",
        input: { voice : "Matthew-Neural", character: "James"}, 
        onDone: {
          target: "LanguageChoiceStateSpeak"
        },
        onError: {
          target: "noInput"
      }
  }

],
},
    // LanguageChoice state speak - here the user will choose their target language 
        LanguageChoiceStateSpeak: {
            invoke: {
              src: "fhSpeakWGesture",
              input: { message : `Hi there! I'm Furhat the spoken language instructor. With me, you can practice speaking the following languages: ${languageoptions}. Which language would you like to practise.`, gesture: "Smile"}, //Hi there! I am Furhat the Language Instructor. I am here to help build your confidence in speaking a foreign language. With me you can safely practise a variety of real-life situations in your target language. I will be able to give you feedback and some tips. I will give you more instructions soon, but for now, let's start by you telling me which language you would like to practise.
              onDone: {
                target: "LanguageChoiceStateListen"
              },
              onError: {
                target: "noInput"
            }
      },
    },

      // LanguageChoice state listen - for user's choice of language and assigning that to context (targetLang)
      // assigning also the language code (needed for listening in later states)
      // and target Voice (needed for speaking in the target language)
      LanguageChoiceStateListen: {
        invoke: {
          src: "fhListenEnglish",
        onDone: [
          { // SPANISH?
          guard: ({event}) => event.output[0].includes("spanish"),  
          actions: [
            assign(({ context }) => {
              return { targetLang: "Spanish", targetVoice: "CarlotaNeural", languageCode: "es-MX", character: "Rania" };
          }),
          // just logging some stuff...
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`),
          ({context}) => console.log(`This is context target Voice ${context.targetVoice}`),
          ({context}) => console.log(`This is context Language Code ${context.languageCode}`)
          ],
          target: "SkillLevelStateSpeak"},
          { // TURKISH?
          guard: ({event}) => event.output[0].includes("turkish"),  
          actions: [
            assign(({ context }) => {
              return { targetLang: "Turkish", targetVoice: "Burcu-Neural", languageCode: "tr-TR", character: "Fedora" };
            }),
          // just logging some stuff...
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`),
          ({context}) => console.log(`This is context target Voice ${context.targetVoice}`),
          ({context}) => console.log(`This is context Language Code ${context.languageCode}`)
          ],
          target: "SkillLevelStateSpeak"},
            { // FRENCH?
            guard: ({event}) => event.output[0].includes("french"),  
            actions: [
              assign(({ context }) => {
              return { targetLang: "French", targetVoice: "Isabelle-Neural", languageCode: "fr-BE", character: "Isabel" };
              }),
            // just logging some stuff...
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`),
          ({context}) => console.log(`This is context target Voice ${context.targetVoice}`),
          ({context}) => console.log(`This is context Language Code ${context.languageCode}`)
              ],
            target: "SkillLevelStateSpeak"},
            { // GREEK?
              guard: ({event}) => event.output[0].includes("greek"),  
              actions: [
                assign(({ context }) => {
                  return { targetLang: "Greek", targetVoice: "AthinaNeural", languageCode: "el-GR", character: "Patricia" };
              }),
            // just logging some stuff...
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`),
          ({context}) => console.log(`This is context target Voice ${context.targetVoice}`),
          ({context}) => console.log(`This is context Language Code ${context.languageCode}`)
              ],
              target: "SkillLevelStateSpeak"},
              { // SWEDISH?
              guard: ({event}) => event.output[0].includes("swedish"),  
              actions: [
              assign(({ context }) => {
              return { targetLang: "Swedish", targetVoice: "SofieNeural", languageCode: "sv-SE", character: "Jane" };
              }),
              // just logging some stuff...
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`),
          ({context}) => console.log(`This is context target Voice ${context.targetVoice}`),
          ({context}) => console.log(`This is context Language Code ${context.languageCode}`)
              ],
              target: "SkillLevelStateSpeak"},

              // else:
              {
                actions: [
                  ({event}) => console.log(`This is what the user said ${event.output[0]}`)
                ]
              }
        ],
        onError: {
          target: "noInput"
        }
  },
},

    // SkillLevel state speak - here the user will choose their skill level
    SkillLevelStateSpeak: {
      invoke: {
        src: "fhSpeakWGesture",
        input: { message : "Amazing! Now, what can you tell me about your skill level? Would you describe yourself as more of a beginner or advanced learner?", gesture: "BrowRaise"},
        onDone: {
          target: "SkillLevelStateListen"
        },
        onError: {
          target: "noInput"
      }
},
},

// SkillLevelChoice state listen - for user's choice of skill level
// assigning the skill level to the context
SkillLevelStateListen: {
  invoke: {
    src: "fhListenEnglish",
  onDone: [{
    guard: ({event}) => event.output[0].includes("beginner"),
    actions: [
      assign(({ event }) => {
        return { skillLevel:  "beginner" };
    }),
    ({context}) => console.log(`This is the skill level in the context${context.skillLevel}`)
    ],
    target: "ScenarioTypeStateSpeak"
  },
  {
    guard: ({event}) => event.output[0].includes("advanced"),
    actions: [
      assign(({ event }) => {
        return { skillLevel:  "advanced" };
    }),
    ({context}) => console.log(`This is the skill level in the context${context.skillLevel}`)
    ],
    target: "ScenarioTypeStateSpeak"
  }
],
  onError: {
    target: "noInput"
  }
},
},

    // ScenarioTypeStateSpeak - here the user is asked if they would like to practise a professional setting or every-day setting
    ScenarioTypeStateSpeak: {
      invoke: {
        src: "fhSpeakWGesture",
        input: { message : `Would you like to practise your speaking skills in a professional setting or with some every-day themes instead?`, gesture: "OpenEyes"}, 
        onDone: {
          target: "ScenarioTypeStateListen"
        },
        onError: {
          target: "noInput"
      }
},
},

    // listening for users choice of scenario type
    ScenarioTypeStateListen: {
      invoke: {
        src: "fhListenEnglish",
      onDone: [
        { guard: ({ event }) => event.output[0].includes("professional"),
          actions: [ assign(() => { return { scenarioType:  "professional" }}),
            ({ context }) => console.log(context.scenarioType)
          ],
          target: "Generate_LMM_answer1"
      },
      { guard: ({ event}) => event.output[0].includes("every"),
          actions: [ assign(() => { return { scenarioType: "everyday" }}),
            ({ context }) => console.log(context.scenarioType)
          ],
          target: "Generate_LMM_answer1"
      },

    ],
      onError: {
        target: "noInput"
      }
    },
},

    // in Generate_LMM_answer-state, the LMM answer gets generated and assigned to the context
    // when entering this state, the learner information from context gets appended into the prompt
    // in this state, we provide the model with the first prompt containing the theme and tasks for the model
        Generate_LMM_answer1: {
          entry: [
            assign(({ context }) => {
              const promptAndlearnerInfo = insertLearnerInformation(context);
              return { messages : [ ... context.messages, { role: "user", content: `Here is information about the user and the scenario you will role play : ${promptAndlearnerInfo}. PRESENT THE SCENARIO TO THE USER IN THE NEXT TURN BRIEFLY IN ENGLISH. DO NOT PRESENT THE SCENARIO IN THE TARGET LANGUAGE, ONLY IN ENGLISH. DO NOT START SUGGESTING WHAT THE USER COULD SAY IN THAT SCENARIO. DO NOT GENERATE THE TARGET LANGUAGE. ONLY GENERATE A DESCRIPTION OF THE SCENARIO IN ENGLISH.` }]};  // adding another user prompt in the context (messages holds all prompts and model's answers), contains target Lang and skill level
            }),
          ],
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: [
              {actions: 
                  assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
                  target: "SituationPresentationSpeak"},
              ],
          },
        },

    // SituationChoice state speak - here the scenario chosen in the random function 
    // will get presented by Furhat
    SituationPresentationSpeak: {
      invoke: 
        {
          src: "fhSpeak",
          input: ({ context }) => {
            const lastMessage = context.messages[context.messages.length - 1];
            return { message: `${lastMessage.content}. Once we've got started on the scenario role-play, you can interrupt it by saying the word "stop". For now, say yes to start the role play and no to leave the conversation.` };
          },
          onDone: [
            {target: "VerifyStartOfRoleplay"}
          ],
          onError: {
            target: "noInput"
          }
        },

    },
    

  // listening in the target lang for the confirmation from the user to start the role-play
    VerifyStartOfRoleplay: {
      invoke: {
        src: "fhListenEnglish",
      onDone: [
        {
          guard: ({ event }) => event.output[0].includes("yes") || event.output[0].includes("yeah"),
          target: "Generate_LMM_answer2",
      },
      {
        guard: ({ event }) => event.output[0].includes("no"),
        target: "ExitWithoutRoleplay",
    }
    ],
      onError: {
        target: "noInput"
      }
    },
    },

    // in this state, the model produces an utterance suitable to the situation the user has chosen
    Generate_LMM_answer2: {
      entry: [
        assign(({ context }) => {
          return { messages : [ ... context.messages, { role: "user", content: `According to the previous information you have received, play now the role of the other person in the chosen scenario. The role you play does not know any English, only the chosen target language. DO NOT GENERATE THE USER'S UTTERANCES OR GIVE THE USER ANY SUGGESTIONS. ONLY PLAY YOUR OWN PART IN THE ROLE PLAY. The user will play their own role. For example, if the scenario is about ordering food in a restaurant, you will play the role of the waiter and say something like 'Hello, what would you like to order?' in the target language. ONLY SPEAK IN THE TARGET LANGUAGE. DO NOT TRANSLATE ANY OF THE UTTERANCES IN ENGLISH . DO NOT PROVIDE SUGGESTIONS ON WHAT THE USER MIGHT SAY. Remember: Your task is to engage in a ROLE-PLAY, not to guide the user in what they should say, AGAIN: DO NOT TRANSLATE YOUR ROLE-PLAY UTTERANCES IN ENGLISH. ONLY SPEAK IN THE TARGET LANGUAGE`}]};  // adding information about user's choice of scenario in the context.messages
        }),
      ],
      invoke: {
        src: "llm_generate", 
        input: ({context}) => ({prompt: context.messages}),
        onDone: [
          {actions: [
            ({context }) => console.log(`This is context.messages latest message ${context.messages[context.messages.length-1]} `),
              assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}})], // assign the LMM answer to the messages in the context
              target: "MatchTargetLangVoice"},
          ],
      },
    },

    // here, furhat changes "character" and voice to match the target language
    MatchTargetLangVoice: {
          invoke:
          {
            src: "fhChangeVoice",
            input: ({context}) => ({ voice: context.targetVoice, character: context.character }),
            onDone: {
              target: "Situation_speak",
            },
            onError: {
              target: "noInput",
            }
          }
        },

  // in Situation_speak, Furhat starts the scenario training (role play) based on the information from the context (targetlang, skill level and scenario)
  // PART OF THE MAIN DIALOGUE LOOP
        Situation_speak: {
          invoke: {
            src: "fhSpeakWGesture",
            input: ({ context }) => {
              const message = context.messages[context.messages.length -1].content;
              const gesture = context.utteranceGesture;
              return { message, gesture };
            },
            onDone: {
              target: "Listen_user_input",
              actions: [({context}) => console.log(`This is the utteranceGesture logged from SituationSpeak--->${context.utteranceGesture}`)]
            },
            onError: {
              target: "noInput"
            }
    },
  },

        // in Listen_user_input, the machine will listen to the user's utterance 
        // and assing it to the context
        // PART OF THE MAIN DIALOGUE LOOP
        Listen_user_input: {
          invoke: {
            src: "fhListenTargetLang",
            input: ({ context }) => ({language: context.languageCode}),
            onDone: [

              {
                guard: ({ event }) => event.output[0].includes("stop"),
                actions: [
                  ({ event, context }) => {
                   const userMessage = event.output[0]; // Latest user message
                   const responseObject = event.output[1]; // Response object
                   console.log(`This is the userMessage ${userMessage}`)
                   console.log(`This is the responseObject ${responseObject}`)},
                   assign(({ context, event}) => { return { messages: [ ...context.messages, { role: "user", content: "The user wishes to end the conversation. Provide the user now with some feedback about the scenario role-play and their performance in English. If the user made some mistakes having to do with cultural politeness aspects, you can suggest some improvements, At the end, say goodbye"}]}})
               ],
               target: "GenerateFeedBack",
                
              },
              
              {   // generating an answer
              target: "Generate_LMM_answer3",
              actions: [
                 ({ event, context }) => {
                  const userMessage = event.output[0]; // Latest user message
                  const responseObject = event.output[1]; // Response object
                  console.log(`This is the userMessage ${userMessage}`)
                  console.log(`This is the responseObject ${responseObject}`)},
                  assign(({ context, event}) => { return { messages: [ ...context.messages, { role: "user", content: event.output[0]}]}})
              ]
            }
          ],
            onError: { 
              target: "noInput" 
            },
          }
        },

        // PART OF THE MAIN DIALOGUE LOOP
        Generate_LMM_answer3: {
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: [
              {actions: 
                  assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
                  target: "GenerateSuitableGesture"},
              ],
          },
        },
        
      // in this state, the llm is prompted to generate a suitable ready-made Furhat gesture to go with its answer
      // PART OF THE MAIN DIALOGUE LOOP
        GenerateSuitableGesture: {
          invoke: {
            src: "llm_generate2",
            input: ({ context }) => {
              return { 
                prompt: `Choose one of these gestures: ${furhatGestures} that is suitable with this utterance: ${context.messages[context.messages.length - 1].content}. ONLY GENERATE THE NAME OF THE GESTURE YOU'VE CHOSEN EXACTLY AS IT WAS WRITTEN.` 
              };
            },
            onDone: [
              {actions: [
                assign(({ context,event }) => { return { utteranceGesture: event.output.response }}),
                ({context}) => console.log("This is the generated gesture", context.utteranceGesture) ],
                target: "Situation_speak"
              }
            ]
          }
        },
        
      // for no-input cases
      noInput: {
        invoke: {
          src: "fhSpeak",
          input: { message: "Sorry, I did not hear you! Kindly repeat." },
          onDone: {
              target: "Listen_user_input"
            },
          onError: {
            target: "noInput"
          }
      }
  },

    // generating the end for the role-play
    // model generates the 'feedback'
    GenerateFeedBack: {
      invoke: {
        src: "llm_generate", 
        input: ({context}) => ({prompt: context.messages}),
        onDone: [
          {actions: 
              assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
              target: "FinalState"},
          ],
      },
    },


    // last state where user feedback will be provided in English (with James charachter) and listen-speak loop broken
      FinalState: {
        initial: "FinalChangeToEnglish",
        states:{
        FinalChangeToEnglish: {
          invoke: {
            src: "fhChangeVoice",
            input: { voice : "Matthew-Neural", character: "James"},
            onDone: "ApplaudState"
        },
        
      },

      ApplaudState: {
          invoke: {
            src: "fhApplaud",
            onDone: "Finalspeak"
          }
      },

        Finalspeak: {
        invoke: {
            src: "fhSpeak",
            input: ({ context }) => {
              const lastMessage = context.messages[context.messages.length -1] 
              return { message : lastMessage.content}
            },
        },
      },
    },
    },

      // for cases when user chooses "no" when Furhat asks whether to start the role play or not
    ExitWithoutRoleplay: {
      invoke: {
        src: "fhSpeak",
        input: { message : "I understand, I will let you look up some words before we get started. Restart me when you are ready to start!"}
    },

      }  
},
});


const actor = createActor(dmMachine).start();
console.log(`this is actor.getSnapshot().value --> ${actor.getSnapshot().value}`);

actor.subscribe((snapshot) => {
  console.log(`this is snapshot.value --> ${snapshot.value}`);
});


// const dmActor = createActor(dmMachine, {
//   inspect: inspector.inspect,
// }).start();

// dmActor.subscribe((state) => {
//   /* if you want to log some parts of the state */
//   console.debug(state.context);
// });

// export function setupButton(element: HTMLElement) {
//   element.addEventListener("click", () => {
//     dmActor.send({ type: "CLICK" });
//   });
//   dmActor.getSnapshot().context.ssRef.subscribe((snapshot) => {
//     const meta = Object.values(snapshot.getMeta())[0];
//     element.innerHTML = `${(meta as any).view}`;
//   });
// }



//({ event }) => console.log(`This is event.output[0]${ JSON.stringify(event.output)}`),
//({ context }) => console.log(`This is typeof context.messages${typeof( context.messages)}`),



        // in Prompt, the LMM answer gets generated and assigned to the context
        // in this state, we provide the model with the first prompt from the user (this is already in context.messages)
        // Generate_LMM_answer: {
        //   invoke: {
        //     src: "llm_generate", 
        //     input: ({context}) => ({prompt: context.messages}),
        //     onDone: {
        //       target: "Speak_LMM",
        //       actions: [
        //         assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // attempting to assign the LMM answer to the messages in the context
        //         //({ event }) => console.log(`This is the event output response--> ${event.output.response}`),
        //         //({ context}) => console.log("Sending to API:", JSON.stringify({ model: "llama3.1", messages: context.messages })),
        //         //({ context }) => console.log(`This is the context messages--> ${context.messages}`),
        //         //({ event }) => console.log(`Full event output:`, event.output),
        //         //({ context }) => console.log(`This is context.messages[context.messages.length-1].content --> ${context.messages[context.messages.length-1].content }`),
        //       ],
        //     },
        //   },
        // },


                // if user's skill level is advanced, this state will be entered to present the scenarios in the target language (to add more challenge)
        // THIS STATE IS ONLY ENTERED WHEN THE USER'S SKILL LEVEL IS ADVANCED
        // MatchTargetLangVoice: {
        //   invoke: {
        //     src: "fhChangeVoice",
        //     input: ({context}) => ({ voice: context.targetVoice }),
        //     onDone: {
        //       target: "SituationChoiceStateSpeak",
        //     },
        //     onError: {
        //       target: "noInput",
        //     }
        //   }
        // },


            // SituationChoice state listen - for user's choice of situation IN TARGET LANGUAGE (SINCE ADVANCED LEVEL)
// user's choice of situation gets assigned to the context
    // SituationChoiceStateListenInTargetLang: {
    //   invoke: {
    //     src: "fhListenTargetLang",
    //     input: ({context}) => ({language: context.languageCode}), 
    //   onDone: {
    //     actions: [
    //       assign(({ event }) => {
    //         return { situation:  event.output[0] };
    //     }),
    //     ],
    //     target: "Generate_LMM_answer2"
    //   },
    //   onError: {
    //     target: "noInput"
    //   }
    // },
    // },