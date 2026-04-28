export default function MealBanner({ meal }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${meal.bannerBg}`}>
      <div className="flex-1 h-px bg-white opacity-50" />
      <span className="text-xs font-bold text-white uppercase tracking-widest px-2 whitespace-nowrap">
        {meal.name}
      </span>
      <div className="flex-1 h-px bg-white opacity-50" />
    </div>
  );
}
