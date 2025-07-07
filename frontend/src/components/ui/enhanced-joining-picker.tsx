import React from "react";
import EnhancedDatePicker from "./enhanced-datepicker";

interface EnhancedJoiningPickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export default function EnhancedJoiningPicker({
  value,
  onChange,
  disabled = false,
  className,
  required = false,
}: EnhancedJoiningPickerProps) {
  // Set reasonable bounds for joining date
  const minDate = new Date("2000-01-01"); // Company probably didn't exist before 2000
  const maxDate = new Date(); // Can't join in the future
  
  return (
    <EnhancedDatePicker
      value={value}
      onChange={onChange}
      placeholder="Joining Date (DD/MM/YYYY)"
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      className={className}
      required={required}
    />
  );
}