import { AnyActorRef, assign, createActor, fromPromise, setup } from "xstate";

const FURHATURI = "127.0.0.1:54321";


// *************************************************************************
// FUNCTIONS ARE DEFINED HERE
// *************************************************************************

// Furhat'S listening function

async function fhListen() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/listen`, {
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


// ***************************************************************************

interface MyDMContext extends DMContext {
  //noinputCounter: number;
  availableModels?: string[];
  messages: Message[];
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
    fhListen: fromPromise<any, null>(async () => {
      return Promise.all([
       fhListen(),
       fhAttendToUser()
      ])
     }),
  },
}).createMachine({
  context: 
    { 
      messages: [{role: "user", content: "Hyvää iltaa. Kerro minulle jotain."}]
    },
  id: "DM",
  initial: "GetModels",
  states: {
        GetModels: {
          invoke: {
            src: "get_ollama_models",
            input: null, 
            onDone: {
              target: "Generate_LMM_answer",
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

        // in Prompt, the LMM answer gets generated and assigned to the context
        // in this state, we provide the model with the first prompt from the user (this is already in context.messages)
        Generate_LMM_answer: {
          invoke: {
            src: "llm_generate", 
            input: ({context}) => ({prompt: context.messages}),
            onDone: {
              target: "Speak_LMM",
              actions: [
                assign(({context, event }) => { return { messages: [ ...context.messages, { role: "assistant", content: event.output.message.content }]}}), // attempting to assign the LMM answer to the messages in the context
                //({ event }) => console.log(`This is the event output response--> ${event.output.response}`),
                //({ context}) => console.log("Sending to API:", JSON.stringify({ model: "llama3.1", messages: context.messages })),
                //({ context }) => console.log(`This is the context messages--> ${context.messages}`),
                //({ event }) => console.log(`Full event output:`, event.output),
                //({ context }) => console.log(`This is context.messages[context.messages.length-1].content --> ${context.messages[context.messages.length-1].content }`),
              ],
            },
          },
        },

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
            src: "fhListen",
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
