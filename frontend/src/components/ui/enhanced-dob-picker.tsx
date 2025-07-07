import React from "react";
import EnhancedDatePicker from "./enhanced-datepicker";

interface EnhancedDOBPickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export default function EnhancedDOBPicker({
  value,
  onChange,
  disabled = false,
  className,
  required = false,
}: EnhancedDOBPickerProps) {
  // Set reasonable bounds for date of birth
  const minDate = new Date("1900-01-01");
  const maxDate = new Date(); // Can't be born in the future
  
  return (
    <EnhancedDatePicker
      value={value}
      onChange={onChange}
      placeholder="Date of Birth (DD/MM/YYYY)"
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      className={className}
      required={required}
    />
  );
}