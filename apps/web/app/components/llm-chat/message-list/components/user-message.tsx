import type { UserMessage as UserMessageType } from "../types";

interface Props {
  message: UserMessageType;
}

const UserMessage = ({ message }: Props) => {
  return (
    <div className={"flex justify-end"}>
      <div className={'max-w-[80%] rounded-lg px-4 py-3 bg-emerald-600 text-white'}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export default UserMessage