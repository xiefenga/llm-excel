import type { AssistantMessage } from "~/hooks/use-excel-chat";

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
}

export type { AssistantMessage };


export type Message = UserMessage | AssistantMessage;