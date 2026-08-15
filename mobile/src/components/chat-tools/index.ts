export { ToolGrid } from './tool-grid';
export type { ToolType } from './tool-grid';
export { CalculatorSheet } from './calculator-sheet';
export { pickImage } from './image-picker-action';
export type { ImageAttachment } from './image-picker-action';
export { pickFile } from './file-picker-action';
export type { FileAttachment } from './file-picker-action';
export { useVoiceInput } from './use-voice-input';
export { DrawingCanvasSafe as DrawingCanvas } from './drawing-canvas-safe';
export { EquationEditor } from './equation-editor';
export { AttachmentPreview } from './attachment-preview';

export interface ChatAttachment {
  type: 'image' | 'drawing' | 'file';
  uri: string;
  name: string;
  preview?: string;
}
