import { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { EmojiClickData } from 'emoji-picker-react';

// Define interfaces for component props
interface EmojiPickerModalProps {
    onEmojiSelect: (emoji: string) => void;
    selectedEmoji: string;
  }

// EmojiPickerModal component
const EmojiPickerModal = ({ onEmojiSelect, selectedEmoji }: EmojiPickerModalProps) => {
    const [showPicker, setShowPicker] = useState(false);
  
    const handleEmojiClick = (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji);
      setShowPicker(false);
    };
  
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 flex items-center justify-center text-2xl bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          {selectedEmoji || '😀'}
        </button>
        
        {showPicker && (
          <div className="fixed z-50 left-1/2 transform -translate-x-1/2">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    );
};

export default EmojiPickerModal;