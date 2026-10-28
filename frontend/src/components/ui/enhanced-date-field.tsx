import EnhancedDatePicker from "./enhanced-datepicker";

/**
 * Bounded date-field presets. Each variant only differs in its lower bound and
 * placeholder — the picker behaviour itself is shared.
 */
export type DateFieldVariant = "dob" | "joining";

const VARIANTS: Record<DateFieldVariant, { minDate: Date; placeholder: string }> = {
  // Nobody in the workforce predates this.
  dob: { minDate: new Date("1900-01-01"), placeholder: "Date of Birth (DD/MM/YYYY)" },
  // The company did not exist before 2000.
  joining: { minDate: new Date("2000-01-01"), placeholder: "Joining Date (DD/MM/YYYY)" },
};

interface EnhancedDateFieldProps {
  variant: DateFieldVariant;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export default function EnhancedDateField({
  variant,
  value,
  onChange,
  disabled = false,
  className,
  required = false,
}: EnhancedDateFieldProps) {
  const { minDate, placeholder } = VARIANTS[variant];

  return (
    <EnhancedDatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      minDate={minDate}
      // Neither a birth date nor a joining date can be in the future.
      maxDate={new Date()}
      className={className}
      required={required}
    />
  );
}
