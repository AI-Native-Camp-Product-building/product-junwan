"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/config/countries";
import { getMonths, getMediums } from "@/data/sample";

type FilterBarProps = {
  country: string;
  month: string;
  medium: string;
  onCountryChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onMediumChange: (v: string) => void;
};

export function FilterBar({ country, month, medium, onCountryChange, onMonthChange, onMediumChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={country} onValueChange={(v) => { if (v !== null) onCountryChange(v); }}>
        <SelectTrigger className="w-[140px] rounded-lg"><SelectValue placeholder="전체 국가" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="rounded-lg">전체 국가</SelectItem>
          {countries.map((c) => <SelectItem key={c.code} value={c.code} className="rounded-lg">{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(v) => { if (v !== null) onMonthChange(v); }}>
        <SelectTrigger className="w-[130px] rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent className="rounded-xl">
          {getMonths().map((m) => <SelectItem key={m} value={m} className="rounded-lg">{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={medium} onValueChange={(v) => { if (v !== null) onMediumChange(v); }}>
        <SelectTrigger className="w-[130px] rounded-lg"><SelectValue placeholder="전체 매체" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="rounded-lg">전체 매체</SelectItem>
          {getMediums().map((m) => <SelectItem key={m} value={m} className="rounded-lg">{m}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
