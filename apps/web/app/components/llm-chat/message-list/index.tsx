import UserMessage from "./components/user-message";
import AssistantMessage from "./components/assistant-message";

import type { Message } from "./types";
import type { UserMessageFile } from "~/hooks/use-excel-chat";

interface Props {
  messages: Message[];
  emptyPlaceholder?: React.ReactNode;
  onClickMessageFile?: (messageId: string, file: UserMessageFile) => void
}


const MessageList = ({ messages, emptyPlaceholder, onClickMessageFile }: Props) => {
  if (messages.length === 0) {
    return emptyPlaceholder
  }
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? (
            <UserMessage message={message} onClickFile={onClickMessageFile} />
          ) : (
            <AssistantMessage message={message} />
          )}
        </div>
      ))}
    </div>
  )
}

export default MessageList