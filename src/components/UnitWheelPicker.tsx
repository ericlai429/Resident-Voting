import React, { useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface UnitWheelPickerProps {
  block: string;
  floor: string;
  room: string;
  sub: string;
  onChange: (val: { block: string; floor: string; room: string; sub: string }) => void;
}

// 預設選項設定
const BLOCKS = ['全區', ...Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}棟`)];
const FLOORS = Array.from({ length: 29 }, (_, i) => `${i + 1}F`);
const ROOMS = Array.from({ length: 20 }, (_, i) => `${i + 1 < 10 ? '0' + (i + 1) : i + 1}`);
const SUBS = ['本號', '之1', '之2', '之3', '之4', '之5', '之6'];

interface SingleWheelProps {
  label: string;
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  width?: string;
}

const SingleWheel: React.FC<SingleWheelProps> = ({
  label,
  items,
  selected,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44; // 每個項目高度 (px)

  const currentIndex = items.indexOf(selected);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  // 點擊上下箭頭微調
  const handleStep = (direction: 'up' | 'down') => {
    let nextIndex = direction === 'up' ? activeIndex - 1 : activeIndex + 1;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;
    onSelect(items[nextIndex]);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }
  };

  // 自動平滑滾動到選取項目
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = activeIndex * itemHeight;
    }
  }, [activeIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / itemHeight);
    if (items[index] && items[index] !== selected) {
      onSelect(items[index]);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0 select-none">
      {/* 欄位標籤 */}
      <span className="text-[11px] font-black text-slate-500 mb-1 tracking-wider uppercase">
        {label}
      </span>

      {/* 向上按鈕 (友善長輩點擊) */}
      <button
        type="button"
        onClick={() => handleStep('up')}
        className="h-7 w-full flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 active:scale-95 transition-all mb-1"
        aria-label={`上一項 ${label}`}
      >
        <ChevronUp size={16} />
      </button>

      {/* 滾輪視窗主體 (iOS 滾輪滾筒效果) */}
      <div className="relative h-[132px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
        {/* 中央選取高亮透鏡 */}
        <div className="pointer-events-none absolute left-0 right-0 top-[44px] h-[44px] border-y-2 border-indigo-500 bg-indigo-50/40 z-10" />

        {/* 滾動清單 */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none py-[44px]"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item, idx) => {
            const isSelected = item === selected;
            return (
              <div
                key={item}
                onClick={() => {
                  onSelect(item);
                  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate?.(10);
                  }
                }}
                className={`h-[44px] flex items-center justify-center snap-center cursor-pointer font-black transition-all ${
                  isSelected
                    ? 'text-lg text-indigo-900 font-extrabold scale-110'
                    : 'text-sm text-slate-400 opacity-60'
                }`}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* 向下按鈕 (友善長輩點擊) */}
      <button
        type="button"
        onClick={() => handleStep('down')}
        className="h-7 w-full flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 active:scale-95 transition-all mt-1"
        aria-label={`下一項 ${label}`}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
};

export const UnitWheelPicker: React.FC<UnitWheelPickerProps> = ({
  block,
  floor,
  room,
  sub,
  onChange,
}) => {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* 棟別滾輪 (A~Z / 全區) */}
        <SingleWheel
          label="棟別"
          items={BLOCKS}
          selected={block}
          onSelect={(b) => onChange({ block: b, floor, room, sub })}
        />

        {/* 樓層滾輪 (1F~29F) */}
        <SingleWheel
          label="樓層"
          items={FLOORS}
          selected={floor}
          onSelect={(f) => onChange({ block, floor: f, room, sub })}
        />

        {/* 戶號滾輪 (01~20) */}
        <SingleWheel
          label="戶號"
          items={ROOMS}
          selected={room}
          onSelect={(r) => onChange({ block, floor, room: r, sub })}
        />

        {/* 之幾滾輪 (預設本號) */}
        <SingleWheel
          label="之幾"
          items={SUBS}
          selected={sub}
          onSelect={(s) => onChange({ block, floor, room, sub: s })}
        />
      </div>

      {/* 底部輔助說明 */}
      <div className="mt-2 text-center text-[11px] text-slate-500 font-semibold">
        💡 可直接在方塊上下滑動滾輪，或點擊上下箭頭切換
      </div>
    </div>
  );
};
