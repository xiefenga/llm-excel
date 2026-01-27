import type { AssistantMessage, UserMessage } from "~/hooks/use-excel-chat";



export type { AssistantMessage, UserMessage };


export type Message = UserMessage | AssistantMessage;