import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle } from 'lucide-react';

interface UploadZoneProps {
  label: string;
  description: string;
  icon: 'resume' | 'job';
  onTextChange: (text: string) => void;
  accentColor: string;
}

export default function UploadZone({ label, description, onTextChange, icon, accentColor }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setText(content);
        setHasContent(true);
        onTextChange(content);
      };
      reader.readAsText(file);
    }
  }, [onTextChange]);

  const handleTextChange = (value: string) => {
    setText(value);
    setHasContent(value.length > 20);
    onTextChange(value);
  };

  const borderColor = accentColor === 'cyan' ? 'border-electric-cyan/30' : 'border-purple-accent/30';
  const hoverBorder = accentColor === 'cyan' ? 'hover:border-electric-cyan/50' : 'hover:border-purple-accent/50';
  const glowClass = accentColor === 'cyan' ? 'glow-cyan' : 'glow-purple';
  const draggingBorder = accentColor === 'cyan' ? 'border-electric-cyan' : 'border-purple-accent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex-1 min-w-[320px]"
    >
      <div className={`glass rounded-2xl p-6 ${hoverBorder} transition-all duration-300 ${isDragging ? draggingBorder + ' ' + glowClass : ''}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor === 'cyan' ? 'bg-electric-cyan-dim' : 'bg-purple-dim'}`}>
            {icon === 'resume' ? (
              <FileText className={`w-5 h-5 ${accentColor === 'cyan' ? 'text-electric-cyan' : 'text-purple-accent'}`} />
            ) : (
              <Upload className={`w-5 h-5 ${accentColor === 'cyan' ? 'text-electric-cyan' : 'text-purple-accent'}`} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary font-[Syne]">{label}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
          {hasContent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto"
            >
              <CheckCircle className="w-5 h-5 text-emerald" />
            </motion.div>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed ${isDragging ? draggingBorder : borderColor} transition-all duration-200`}
        >
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={icon === 'resume'
              ? "Paste your resume text here, or drag & drop a .txt file...\n\nExample:\nJohn Doe — Software Engineer\n5 years Python, 3 years React..."
              : "Paste the job description here, or drag & drop a .txt file...\n\nExample:\nSenior Data Engineer\nRequirements: Python, Docker, AWS..."}
            className="w-full h-48 bg-transparent text-sm text-text-secondary placeholder:text-text-muted/50 p-4 resize-none focus:outline-none rounded-xl"
          />
          {fileName && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-deep-space-lighter rounded-lg px-3 py-1.5 text-xs text-text-muted">
              <FileText className="w-3 h-3" />
              {fileName}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
