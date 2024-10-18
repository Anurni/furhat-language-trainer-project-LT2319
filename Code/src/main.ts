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

// Furhat voice changing function, needed to match user's choice of targLang

async function fhVoiceChange(language: string) {
  const voice = mapLanguageToVoice(language);
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(voice); // This is not used in the fetch call
  return fetch(`http://${FURHATURI}/furhat/voice?name=${encText}`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  })
}


// Function for retrieving ready - made gestures from Furhat

async function fhGesture(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(
    `http://${FURHATURI}/furhat/gesture?name=${text}&blocking=true`,
    {
      method: "POST",
      headers: myHeaders,
      body: "",
    },
  );
}

// attending to User function
async function fhAttendToUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=CLOSEST`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({ // not sure if this part is needed?
      enum: "CLOSEST",
    }),
  });
}

// *************************************************************
// other functions and consts are defined here
// *************************************************************

function insertLearnerInformation(context : any) {
  const targetLang = context.targetLang
  const skillLevel = context.skillLevel
  return targetLang + skillLevel 

}

function insertScenario(context : any) {
  const scenario = context.situation
  return scenario

}

// TO DO: SEE HOW TO MAKE THIS FUNCTION BETTER AND LESS REPETITIVE
function mapLanguageToVoice(language: string) {
  if (language === "spanish") {
    return "Mia-Neural"
  }
  if (language === "turkish") {
    return "Burcu-Neural"
  }
  if (language === "finnish" || language === "finish") {
    return "Suvi-Neural"
  }
  if (language === "french") {
    return "Isabelle-Neural"
  }
  if (language === "greek") {
    return "AthinaNeural"
  }
  if (language === "german") {
    return "KlausNeural"
  }
  if (language === "swedish") {
    return "SofieNeural"
  }
}

const languageoptions = "spanish, turkish, finnish, french, greek, german, and swedish"



// ***************************************************************************

interface MyDMContext extends DMContext {
  //noinputCounter: number;
  availableModels?: string[];
  messages: Message[];
  targetLang: string;
  skillLevel: string;
  situation: string;
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
    skillLevelIsAdvanced: ({ context }) => { return context.skillLevel == "advanced"}   // will be applied in presenting of the scenarios, if advanced -> will be presented in targLang
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
        model: "mistral",
        stream: false,
        messages: input.prompt,
        temperature: 1.5,
      };
      console.log(`This is the body--> ${JSON.stringify(body)}`)
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
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
       fhAttendToUser()
      ])
     }),

     fhListenTargetLang: fromPromise<any, {language: string}>(async ({input}) => {
      return Promise.all([
       fhListen(input.language),
       fhAttendToUser()
      ])
     }),

     fhChangeVoice: fromPromise<any, {language: string}>(async ({input}) => {
      return Promise.all([
       fhVoiceChange(input.language),
       fhAttendToUser()
      ])
     }),
  },
}).createMachine({
  context: 
    { 
      messages: [{role: "user", content: "You are a spoken language instructor, and your task is to help a learner practice their target language in real-life situations. In the next user prompt, you will find the information about the learner (the target language of their choice and their skill level). Here are some examples of how to generate scenarios based on the learner's skill level. Example 1: User Info: Target Language: Spanish Skill Level: Beginner. Generated Scenarios:  1. Professional life: Call your boss to tell him you are sick. 2. Personal life: Order a dish at a restaurant. 3. Introduce yourself to a new friend.        Example 2: User Info: Target Language: French Skill Level: Advanced. Generated Scenarios: 1. La vie professionelle: Décrivez votre dernière journée au travail.  2. La  vie personelle: Faites un petit discours lors de votre fête d'anniversaire. 3. La vie quotidienne: Vous rencontrez votre voisin dans le couloir et engagez une conversation sur l'état de votre immeuble, en discutant surtout les problèmes recents. Based on the target language and skill level information in the next user prompt, generate three situations adapted to the skill level (professional life, personal life, or every-day situation) for the user to choose from. Important: all of the generated scenarios must match the skill level the user has chosen. Present the scenarios as clearly and briefly as possible.**Important:**  If the user chooses advanced level, list the scenarios in the target language. If the user chooses beginner or intermediate, present the scenarios in English. At the end, ask the user which situation they would like to choose by saying the number of the scenario (1, 2, or 3). Remember: For advanced level: The user will choose the number in the target language. For beginner or intermediate level: The user will answer in English. Once the user has chosen the scenario, proceed to role-playing mode: say the first utterance as the other person in the scenario. For example, if the user chooses a scenario where they need to ask for help in the grocery store using the target language, you would play the role of the sales assistant and ask, 'What can I help you with?' in the target language. Let the user come up with the next utterance, and then proceed to respond to that and continue the interaction."}],
      targetLang: "",
      skillLevel: "",
      situation : "",
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
              target: "LanguageChoiceStateSpeak",
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

    // LanguageChoice state speak - here the user will choose their target language 
        LanguageChoiceStateSpeak: {
            invoke: {
              src: "fhSpeak",
              input: { message : `Hi there! Which language would you like to practise? With me, you can practice the following languages: ${languageoptions}`}, //Hi there! I am Furhat the Language Instructor. I am here to help build your confidence in speaking a foreign language. With me you can safely practise a variety of real-life situations in your target language. I will be able to give you feedback and some tips. I will give you more instructions soon, but for now, let's start by you telling me which language you would like to practise.
              onDone: {
                target: "LanguageChoiceStateListen"
              },
              onError: {
                target: "noInput"
            }
      },
    },

      // LanguageChoice state listen - for user's choice of language and assigning that to context (targetLang)
      LanguageChoiceStateListen: {
        invoke: {
          src: "fhListenEnglish",
        onDone: {
          actions: [
            assign(({ event }) => {
              return { targetLang: event.output[0] };
          }),
          ({context}) => console.log(`This is context target Lang ${context.targetLang}`)
          ],
          target: "SkillLevelStateSpeak"
        },
        onError: {
          target: "noInput"
        }
  },
},

    // SkillLevel state speak - here the user will choose their skill level
    SkillLevelStateSpeak: {
      invoke: {
        src: "fhSpeak",
        input: { message : "Amazing! Now, what can you tell me about your skill level? Would you describe yourself as a beginner, intermediate or advanced learner?"},
        onDone: {
          target: "SkillLevelStateListen"
        },
        onError: {
          target: "noInput"
      }
},
},

// SkillLevelChoice state listen - for user's choice of skill level
SkillLevelStateListen: {
  invoke: {
    src: "fhListenEnglish",
  onDone: {
    actions: [
      assign(({ event }) => {
        return { skillLevel:  event.output[0] };
    }),
    ],
    target: "Generate_LMM_answer1"
  },
  onError: {
    target: "noInput"
  }
},
},

    // in Generate_LMM_answer-state, the LMM answer gets generated and assigned to the context
    // in this state, we provide the model with the first prompt from the user (this is already in context.messages)
        Generate_LMM_answer1: {
          entry: [
            assign(({ context }) => {
              const promptAndlearnerInfo = insertLearnerInformation(context);
              return { messages : [ ... context.messages, { role: "user", content: promptAndlearnerInfo }]};  // adding another user prompt in the context, contains target Lang and skill level
            }),
          ],
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: [
              // for checking if the user skill level is advanced:
              {actions: 
                assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
                guard: "skillLevelIsAdvanced", 
                target: "MatchTargetLangVoice"},
                // else:
              {actions: 
                  assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
                  target: "SituationChoiceStateSpeak"},
              ],
          },
        },

        // if user's skill level is advanced, this state will be entered to present the scenarios in the target language (to add more challenge)
        MatchTargetLangVoice: {
          invoke: {
            src: "fhChangeVoice",
            input: ({context}) => ({ language: context.targetLang }),
            onDone: {
              target: "SituationChoiceStateSpeak",
            },
            onError: {
              target: "noInput",
            }
          }
        },

    // SituationChoice state speak - here the situations will get spoken by Furhat
    SituationChoiceStateSpeak: {
      invoke: 
        {
          src: "fhSpeak",
          input: ({ context }) => {
            const lastMessage = context.messages[context.messages.length - 1];
            return { message: lastMessage.content };
          },
          onDone: [
            {guard: "skillLevelIsAdvanced", target: "SituationChoiceStateListenInTargetLang"},
            {target: "SituationChoiceStateListen"}
          ],
          onError: {
            target: "noInput"
          }
        },

    },


    // SituationChoice state listen - for user's choice of situation IN TARGET LANGUAGE (SINCE ADVANCED LEVEL)
// user's choice of situation gets assigned to the context
    SituationChoiceStateListenInTargetLang: {
      invoke: {
        src: "fhListenTargetLang",
      onDone: {
        actions: [
          assign(({ event }) => {
            return { situation:  event.output[0] };
        }),
        ],
        target: "Generate_LMM_answer2"
      },
      onError: {
        target: "noInput"
      }
    },
    },
    

// SituationChoice state listen - for user's choice of situation
// user's choice of situation gets assigned to the context
SituationChoiceStateListen: {
  invoke: {
    src: "fhListenEnglish",
  onDone: {
    actions: [
      assign(({ event }) => {
        return { situation:  event.output[0] };
    }),
    ],
    target: "Generate_LMM_answer2"
  },
  onError: {
    target: "noInput"
  }
},
},

    // in this state, the model produces an utterance suitable to the situation the user has chosen
    Generate_LMM_answer2: {
      entry: [
        assign(({ context }) => {
          const promptAndScenarioInfo = insertScenario(context);
          return { messages : [ ... context.messages, { role: "user", content: promptAndScenarioInfo }]};  // adding information about user's choice of scenario in the context.messages
        }),
      ],
      invoke: {
        src: "llm_generate", 
        input: ({context}) => ({prompt: context.messages}),
        onDone: [
          {actions: [
            ({context }) => console.log(`This is context.messages latest message ${context.messages[context.messages.length-1]} `),
              assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}})], // assign the LMM answer to the messages in the context
              target: "Situation_speak"},
          ],
      },
    },
  // in Situation_speak, Furhat starts the scenario training (role play) based on the information from the context (targetlang, skill level and scenario)
        Situation_speak: {
          invoke: {
            src: "fhSpeak",
            input: ({ context }) => {
              const lastMessage = context.messages[context.messages.length -1] 
              return { message : lastMessage.content}
            },
            onDone: {
              target: "Listen_user_input"
            },
            onError: {
              target: "noInput"
            }
    },
  },

        // in Listen_user_input, the machine will listen to the user's utterance 
        // and assing it to the context
        Listen_user_input: {
          invoke: {
            src: "fhListenTargetLang",
            onDone: {
              target: "Generate_LMM_answer3",
              actions: [
                 ({ event, context }) => {
                  const userMessage = event.output[0]; // Latest user message
                  const responseObject = event.output[1]; // Response object
                  console.log(`This is the userMessage ${userMessage}`)
                  console.log(`This is the responseObject ${responseObject}`)},
                  assign(({ context, event}) => { return { messages: [ ...context.messages, { role: "user", content: event.output[0]}]}})
              ]
            },
            onError: { 
              target: "noInput" 
            },
          }
        },

        Generate_LMM_answer3: {
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: [
              {actions: 
                  assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
                  target: "Situation_speak"},
              ],
          },
        },
        

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