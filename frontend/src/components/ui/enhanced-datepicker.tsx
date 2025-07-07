import React, { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EnhancedDatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  required?: boolean;
}

export default function EnhancedDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  minDate,
  maxDate,
  className,
  required = false,
}: EnhancedDatePickerProps) {
  const [date, setDate] = useState<Date | null>(value || null);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when value prop changes
  useEffect(() => {
    setDate(value || null);
    setInputValue(value ? format(value, "dd/MM/yyyy") : "");
  }, [value]);

  // Format date for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "";
    return format(date, "dd/MM/yyyy");
  };

  // Parse input date string
  const parseInputDate = (input: string): Date | null => {
    // Remove any non-digit or non-slash characters
    const cleanInput = input.replace(/[^\d/]/g, "");
    
    // Try to parse dd/mm/yyyy format
    const parsed = parse(cleanInput, "dd/MM/yyyy", new Date());
    
    if (isValid(parsed)) {
      // Check bounds
      if (minDate && parsed < minDate) return null;
      if (maxDate && parsed > maxDate) return null;
      return parsed;
    }
    
    return null;
  };

  // Handle calendar date selection
  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    const newDate = selectedDate || null;
    setDate(newDate);
    setInputValue(formatDisplayDate(newDate));
    onChange?.(newDate);
    setIsOpen(false);
  };

  // Handle input change with real-time formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove any non-digit characters first
    const numbers = value.replace(/\D/g, "");
    
    // Format as dd/mm/yyyy while typing
    let formatted = "";
    if (numbers.length > 0) {
      if (numbers.length <= 2) {
        formatted = numbers;
      } else if (numbers.length <= 4) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      } else {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
      }
    }
    
    setInputValue(formatted);
    
    // Try to parse complete date
    if (formatted.length === 10) {
      const parsedDate = parseInputDate(formatted);
      if (parsedDate) {
        setDate(parsedDate);
        onChange?.(parsedDate);
      }
    }
  };

  // Handle input blur - validate final input
  const handleInputBlur = () => {
    setIsInputFocused(false);
    
    if (inputValue.length === 10) {
      const parsedDate = parseInputDate(inputValue);
      if (parsedDate) {
        setDate(parsedDate);
        onChange?.(parsedDate);
      } else {
        // Invalid date - reset to current date or empty
        setInputValue(formatDisplayDate(date));
      }
    } else if (inputValue.length === 0) {
      // Empty input
      setDate(null);
      onChange?.(null);
    } else {
      // Incomplete input - reset to current date
      setInputValue(formatDisplayDate(date));
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  // Handle clear button
  const handleClear = () => {
    setDate(null);
    setInputValue("");
    onChange?.(null);
  };

  // Handle key down for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
      inputRef.current?.blur();
    }
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "pr-20", // Space for icons
              isInputFocused && "ring-2 ring-primary",
              className
            )}
          />
          
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {date && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                disabled={disabled}
              >
                <CalendarIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
          </div>
        </div>

        <PopoverContent className="w-auto p-0" align="start">
          <EnhancedCalendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            disabled={isDateDisabled}
            defaultMonth={date || new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      {/* Show format hint when focused */}
      {isInputFocused && (
        <div className="absolute top-full mt-1 text-xs text-muted-foreground">
          Format: DD/MM/YYYY (e.g., 25/12/1990)
        </div>
      )}
    </div>
  );
}