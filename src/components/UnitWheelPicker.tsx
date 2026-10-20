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
}

const SingleWheel: React.FC<SingleWheelProps> = ({
  label,
  items,
  selected,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const scrollTimeout = useRef<number | null>(null);
  const itemHeight = 44; // 每個項目高度 (px)

  const currentIndex = items.indexOf(selected);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  // 平滑滾動到指定項目
  const scrollToItem = (index: number, smooth = true) => {
    if (!containerRef.current) return;
    isProgrammatic.current = true;
    containerRef.current.scrollTo({
      top: index * itemHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = window.setTimeout(() => {
      isProgrammatic.current = false;
    }, 280);
  };

  // 步進切換 (點擊 ▲ / ▼ 或滑鼠滾輪滾動 1 格)
  const handleStep = (direction: 'up' | 'down') => {
    let nextIndex = direction === 'up' ? activeIndex - 1 : activeIndex + 1;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;

    const nextVal = items[nextIndex];
    onSelect(nextVal);
    scrollToItem(nextIndex, true);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }
  };

  const handleStepRef = useRef(handleStep);
  handleStepRef.current = handleStep;

  // 點擊清單項目直接置中選定
  const handleItemClick = (index: number) => {
    const val = items[index];
    if (val) {
      onSelect(val);
      scrollToItem(index, true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
    }
  };

  // 滑鼠滾輪精準攔截：滾一格 = 精準跳一項 (180ms 防連滾)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastWheelTime = 0;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastWheelTime < 180) return;
      lastWheelTime = now;

      if (e.deltaY > 0) {
        handleStepRef.current('down');
      } else if (e.deltaY < 0) {
        handleStepRef.current('up');
      }
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  // 當外部 selected 變更且非點擊/滾動觸發時，自動對齊滾輪
  useEffect(() => {
    if (!isProgrammatic.current && containerRef.current) {
      containerRef.current.scrollTop = activeIndex * itemHeight;
    }
  }, [selected]);

  // 手機觸控拖曳滑動時的置中對齊判定 (防手震防中間幀衝突)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammatic.current) return;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    const top = e.currentTarget.scrollTop;
    scrollTimeout.current = window.setTimeout(() => {
      const index = Math.round(top / itemHeight);
      if (items[index] && items[index] !== selected) {
        onSelect(items[index]);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0 select-none">
      {/* 欄位標籤 */}
      <span className="text-[11px] font-black text-slate-600 mb-1 tracking-wider uppercase">
        {label}
      </span>

      {/* 向上按鈕 (微調大按鈕) */}
      <button
        type="button"
        onClick={() => handleStep('up')}
        className="h-8 w-full flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white active:scale-90 transition-all mb-1 cursor-pointer shadow-2xs"
        aria-label={`上一項 ${label}`}
      >
        <ChevronUp size={18} />
      </button>

      {/* 滾輪視窗主體 (iOS 滾筒樣式) */}
      <div className="relative h-[132px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
        {/* 中央選取高亮透鏡 */}
        <div className="pointer-events-none absolute left-0 right-0 top-[44px] h-[44px] border-y-2 border-indigo-500 bg-indigo-50/50 z-10" />

        {/* 滾動清單 */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none py-[44px]"
        >
          {items.map((item, idx) => {
            const isSelected = item === selected;
            return (
              <div
                key={item}
                onClick={() => handleItemClick(idx)}
                className={`h-[44px] flex items-center justify-center snap-center cursor-pointer font-black transition-all ${
                  isSelected
                    ? 'text-lg text-indigo-900 font-black scale-110'
                    : 'text-sm text-slate-400 opacity-60 hover:opacity-100'
                }`}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* 向下按鈕 (微調大按鈕) */}
      <button
        type="button"
        onClick={() => handleStep('down')}
        className="h-8 w-full flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white active:scale-90 transition-all mt-1 cursor-pointer shadow-2xs"
        aria-label={`下一項 ${label}`}
      >
        <ChevronDown size={18} />
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
        💡 點擊數字或 ▲ / ▼ 箭頭精準切換 · 滑鼠滾輪滾一下跳一格
      </div>
    </div>
  );
};
