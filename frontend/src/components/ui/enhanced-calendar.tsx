import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function EnhancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const [currentMonth, setCurrentMonth] = React.useState(
    props.defaultMonth || new Date()
  );

  // Generate years array (from 1900 to current year + 10)
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = 1900; year <= currentYear + 10; year++) {
      yearList.push(year);
    }
    return yearList;
  }, [currentYear]);

  // Month names
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(month));
    setCurrentMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(parseInt(year));
    setCurrentMonth(newDate);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  return (
    <div className="p-3">
      {/* Enhanced header with month/year dropdowns */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <Select
              value={currentMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[80px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleNextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Calendar component */}
      <DayPicker
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        showOutsideDays={showOutsideDays}
        className={cn("", className)}
        classNames={{
          months: "flex flex-col sm:flex-row gap-2",
          month: "flex flex-col gap-4",
          caption: "hidden", // Hide default caption since we have our own
          caption_label: "hidden",
          nav: "hidden", // Hide default navigation
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-x-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "size-8 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_start:
            "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
          day_range_end:
            "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

export { EnhancedCalendar };