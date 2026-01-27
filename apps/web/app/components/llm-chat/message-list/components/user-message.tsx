import FileItemBadge from "./file-item-badge";

import type { UserMessageFile } from "~/hooks/use-excel-chat";
import type { UserMessage as UserMessageType } from "../types";

interface Props {
  message: UserMessageType;
  onClickFile?: (messageId: string, file: UserMessageFile) => void
}

const UserMessage = ({ message, onClickFile }: Props) => {
  return (
    <div className="flex flex-col gap-1 items-end">
      {/* file list */}
      {Boolean(message.files?.length) && (
        <div className="flex gap-1">
          {message.files?.map(file => (
            <FileItemBadge
              key={file.id}
              file={file}
              onClick={() => onClickFile?.(message.id, file)}
            />
          ))}
        </div>
      )}
      <div className={'max-w-[80%] rounded-lg px-4 py-3 bg-emerald-600 text-white'}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export default UserMessage