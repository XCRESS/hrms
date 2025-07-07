import React from "react";
import EnhancedDatePicker from "./enhanced-datepicker";

interface EnhancedGeneralDatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  futureAllowed?: boolean;
  pastAllowed?: boolean;
}

export default function EnhancedGeneralDatePicker({
  value,
  onChange,
  placeholder = "Select Date (DD/MM/YYYY)",
  disabled = false,
  className,
  required = false,
  minDate,
  maxDate,
  futureAllowed = true,
  pastAllowed = true,
}: EnhancedGeneralDatePickerProps) {
  // Set default bounds based on configuration
  let defaultMinDate = minDate;
  let defaultMaxDate = maxDate;
  
  if (!pastAllowed && !minDate) {
    defaultMinDate = new Date(); // Today's date as minimum
  }
  
  if (!futureAllowed && !maxDate) {
    defaultMaxDate = new Date(); // Today's date as maximum
  }
  
  return (
    <EnhancedDatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      minDate={defaultMinDate}
      maxDate={defaultMaxDate}
      className={className}
      required={required}
    />
  );
}