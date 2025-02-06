import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface TranscriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string | null;
}

const TranscriptDialog: React.FC<TranscriptDialogProps> = ({
  isOpen,
  onClose,
  transcript,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg transform -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <Dialog.Title className="text-lg font-semibold">
              Call Transcript
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 max-h-80 overflow-y-auto p-2 bg-gray-100 rounded-md">
            <pre className="text-sm whitespace-pre-wrap">
              {transcript || "No transcript available."}
            </pre>
          </div>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TranscriptDialog;
