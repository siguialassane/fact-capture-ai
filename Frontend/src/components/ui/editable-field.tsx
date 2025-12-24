import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil } from "lucide-react";

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "number" | "date";
  validation?: (value: string) => boolean;
  className?: string;
  placeholder?: string;
}

export function EditableField({
  value,
  onSave,
  type = "text",
  validation,
  className,
  placeholder,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleValidation = (val: string) => {
    if (validation) {
      setIsValid(validation(val));
    }
    return validation ? validation(val) : true;
  };

  const handleSave = () => {
    if (handleValidation(editValue)) {
      onSave(editValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsValid(true);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            handleValidation(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className={cn(
            "h-8 transition-colors",
            !isValid && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <button
          onClick={handleSave}
          className="p-1 text-success hover:bg-success/10 rounded transition-colors"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn("flex-1", !value && "text-muted-foreground")}>
        {value || placeholder || "Cliquez pour éditer"}
      </span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
