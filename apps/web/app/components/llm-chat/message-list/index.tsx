import UserMessage from "./components/user-message";
import AssistantMessage from "./components/assistant-message";

import type { Message } from "./types";

interface Props {
  messages: Message[];
  emptyPlaceholder?: React.ReactNode;
}


const MessageList = ({ messages, emptyPlaceholder }: Props) => {
  if (messages.length === 0) {
    return emptyPlaceholder
  }
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? (
            <UserMessage message={message} />
          ) : (
            <AssistantMessage message={message} />
          )}
        </div>
      ))}
    </div>
  )
}

export default MessageList