/** Qoldiq bor deb hisoblash chegarasi */
export const MIN_BOBIN_REMAINING_KG = 0.01;
export const MIN_BOBIN_REMAINING_M = 0.01;

/** Omborda ko‘rinishi uchun kg ham, metr ham 0 dan katta bo‘lishi kerak */
export function bobinHasWarehouseStock(bobin) {
  const kg = Number(bobin?.current_weight_kg ?? bobin?.currentWeightKg ?? 0);
  const m = Number(bobin?.current_length_m ?? bobin?.currentLengthM ?? 0);
  return kg > MIN_BOBIN_REMAINING_KG && m > MIN_BOBIN_REMAINING_M;
}

export function bobinCanStartProduction(bobin) {
  if (!bobinHasWarehouseStock(bobin)) return false;
  if (bobin.status === 'omborxonada') return true;
  if (bobin.status === 'ishlatilgan') return true;
  return false;
}

export function bobinStatusAfterFinish(remainingKg, remainingLengthM) {
  const kg = Number(remainingKg);
  const m = Number(remainingLengthM);
  return kg > MIN_BOBIN_REMAINING_KG && m > MIN_BOBIN_REMAINING_M ? 'omborxonada' : 'ishlatilgan';
}
