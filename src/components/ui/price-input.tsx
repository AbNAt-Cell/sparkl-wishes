import * as React from "react";
import { cn } from "@/lib/utils";

export interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  currencySymbol?: string;
}

const formatWithCommas = (value: string): string => {
  // Remove all non-numeric characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, '');
  
  // Split by decimal point
  const parts = numericValue.split('.');
  
  // Format the integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Rejoin with decimal if exists
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
};

const parseValue = (formattedValue: string): string => {
  // Remove commas for the actual value
  return formattedValue.replace(/,/g, '');
};

const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  ({ className, value, onChange, currencySymbol = "", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatWithCommas(value || ""));

    React.useEffect(() => {
      setDisplayValue(formatWithCommas(value || ""));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatWithCommas(inputValue);
      setDisplayValue(formatted);
      
      // Send the raw numeric value (without commas) to parent
      const rawValue = parseValue(formatted);
      onChange(rawValue);
    };

    return (
      <div className="relative">
        {currencySymbol && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencySymbol}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            currencySymbol && "pl-8",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);
PriceInput.displayName = "PriceInput";

export { PriceInput };
