import { useLocation } from "wouter";
import { useTranslation } from "@/utils/i18n";

export function NotFoundPage() {
    const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 animate-[fadeIn_0.5s_ease-out]">
      <p className="text-[8rem] font-extralight leading-none tracking-tighter text-gray-700">
        404
      </p>
      <p className="mt-4 text-lg text-gray-400">{t("auto.page_not_found")}</p>
      <button
        onClick={() => navigate("/app/projects", { replace: true })}
        className="mt-8 rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
      >
        {t("auto.return_to_home_page")}</button>
    </div>
  );
}
