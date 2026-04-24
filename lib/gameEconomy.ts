export const TRAINING_CURRENCY_LABEL = "钻石";
export const TRAINING_CURRENCY_ICON = "◆";
export const SERVER_CURRENCY_LABEL = "金币";

export function formatTrainingCurrency(amount: number) {
  return `${amount} ${TRAINING_CURRENCY_LABEL}`;
}

export function formatTrainingCurrencyReward(amount: number) {
  return `+${amount} ${TRAINING_CURRENCY_LABEL}`;
}
