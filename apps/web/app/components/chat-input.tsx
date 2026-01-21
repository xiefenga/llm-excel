import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

import type { ClipboardEvent, KeyboardEvent } from 'react'

interface ChatInputProps {
  text: string
  onTextChange: (text: string) => void
  onSubmit: () => void
  onPasteFiles: (files: File[], e: React.ClipboardEvent) => Promise<void>
  placeholder: string
}

const ChatInput = ({ text, onTextChange, onSubmit, onPasteFiles, placeholder }: ChatInputProps) => {

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const [pasteFileProcessing, setPasteFileProcessing] = useState(false);

  const onPaste = async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length === 0) {
      return;
    }

    try {
      setPasteFileProcessing(true);
      await onPasteFiles(files, e);
    } catch (error) {
      console.error(error);
    } finally {
      setPasteFileProcessing(false);
    }
  };

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-xl py-2 shadow-sm">
      <div className="flex items-start pr-2">
        <Textarea
          rows={3}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={pasteFileProcessing}
          className="flex-1 border-0 focus:ring-0 focus-visible:ring-0 resize-none min-h-[80px] text-gray-900 placeholder:text-gray-400 border-none shadow-none max-h-[100px] overflow-y-auto"
        />

        <div className="self-end">
          <Button
            onClick={() => onSubmit()}
            size={"icon"}
            disabled={!text.trim() || pasteFileProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-full p-3 shrink-0 cursor-pointer"
          >
            {pasteFileProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}

export default ChatInput