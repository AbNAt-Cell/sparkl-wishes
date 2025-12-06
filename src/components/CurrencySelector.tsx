import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { availableCurrencies } from "@/hooks/useUserCurrency";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  isAutoDetected?: boolean;
  onReset?: () => void;
  className?: string;
}

export const CurrencySelector = ({
  value,
  onChange,
  isAutoDetected = true,
  onReset,
  className = "",
}: CurrencySelectorProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          {availableCurrencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <span className="flex items-center gap-2">
                <span className="font-medium">{currency.symbol}</span>
                <span>{currency.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isAutoDetected && onReset && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset to auto-detected currency</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
