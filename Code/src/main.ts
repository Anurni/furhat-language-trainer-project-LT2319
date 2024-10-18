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

// Furhat voice changing function

async function fhVoiceChange(voice: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(voice); // This is not used in the fetch call
  return fetch(`http://${FURHATURI}/furhat/voice?name=${voice}`, {
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

function insertLearnerInformation(context : any) {
  const targetLang = context.targetLang
  const skillLevel = context.skillLevel
  return targetLang + skillLevel 

}


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

     fhListenFrech: fromPromise<any, null>(async () => {
      return Promise.all([
       fhListen("fr-FR"),
       fhAttendToUser()
      ])
     }),

     fhChangeVoice: fromPromise<any, null>(async () => {
      return Promise.all([
       fhVoiceChange("Isabelle-Neural"),
       fhAttendToUser()
      ])
     }),
  },
}).createMachine({
  context: 
    { 
      messages: [{role: "user", content: "You are a spoken language instructor, and your task is to help a learner to practise their language of choice in real-life situations. In the next user prompt, you will find the information about the learner (the target language of their choice and their skill level). Based on the information in the next user prompt, generate three situations (professional life, personal life, or every-day situation) for the user to choose from. Present the situations very briefly. Remember to adapt the level of difficulty accordingly. If the user chooses advanced level, present the scenarios in the target language. If not, present the scenarios in English. At the very end, ask the user which situation they would like to choose."}],
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
              input: { message : "Hi there! Which language would you like to practise?"}, //Hi there! I am Furhat the Language Instructor. I am here to help build your confidence in speaking a foreign language. With me you can safely practise a variety of real-life situations in your target language. I will be able to give you feedback and some tips. I will give you more instructions soon, but for now, let's start by you telling me which language you would like to practise.
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
    target: "Generate_LMM_answer"
  },
  onError: {
    target: "noInput"
  }
},
},

    // in Generate_LMM_answer-state, the LMM answer gets generated and assigned to the context
    // in this state, we provide the model with the first prompt from the user (this is already in context.messages)
        Generate_LMM_answer: {
          entry: [
            assign(({ context }) => {
              const promptAndlearnerInfo = insertLearnerInformation(context);
              return { messages : [ ... context.messages, { role: "user", content: promptAndlearnerInfo }]};  // adding another user prompt in the context, contains target Lang and skill level
            }),
          ],
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: {
              actions: [
                //({ event }) => console.log(`This is event.output[0]${ JSON.stringify(event.output)}`),
                //({ context }) => console.log(`This is typeof context.messages${typeof( context.messages)}`),
                assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // assign the LMM answer to the messages in the context
              ],
              guard: "skillLevelIsAdvanced", target: "MatchTargetLangVoice"
            },
          },
        },

        // if user's skill level is advanced, this state will be entered to present the scenarios in the target language (to add more challenge)
        MatchTargetLangVoice: {
          invoke: {
            src: "fhChangeVoice",
            onDone: {
              target: "SituationChoiceStateSpeak",
            },
            onError: {
              target: "noInput",
            }
          }
        },

    // SituationChoice state speak - here the situations will get generated
    SituationChoiceStateSpeak: {
      invoke: 
        {
          src: "fhSpeak",
          input: ({ context }) => {
            const lastMessage = context.messages[context.messages.length - 1];
            return { message: lastMessage.content };
          },
          onDone: {
            target: "SituationChoiceStateListen"
          },
          onError: {
            target: "noInput"
          }
        },

    },
    

// SituationChoice state listen - for user's choice of situation
SituationChoiceStateListen: {
  invoke: {
    src: "fhListenEnglish",
  onDone: {
    actions: [
      assign(({ event }) => {
        return { situation:  event.output[0] };
    }),
    ],
    target: "Generate_LMM_answer"
  },
  onError: {
    target: "noInput"
  }
},
},

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

        // in Speak_LMM_State, the LMM answer stored in context gets spoken by Furhat
       
        Speak_LMM: {
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
            src: "fhListenEnglish",
            onDone: {
              target: "Generate_LMM_answer",
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
