import apiClient from './client';

// RETIRADO 2026-08-13: PackageItem/subscribeToPackage/getPackageList/cancel/
// getPaymentGateways (autoservicio de compra dentro de la app) — Apple/Google
// exigen que la app no venda contenido digital dentro sin su propio IAP. La
// compra pasa a ser 100% externa (web); el acceso se concede vía Plan/
// PlanSubscription (admin o webhook de Stripe). Esta pantalla ahora es de
// solo lectura, ver GET my-plan / SubscriptionController::myPlan().

export interface MyPlanItem {
  id: number;
  plan_id: number;
  plan_name: string | null;
  price: number | null;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  starts_at: string | null;
  ends_at: string | null;
  canceled_at: string | null;
  created_at: string | null;
}

export interface MyPlanResponse {
  data: {
    active: MyPlanItem | null;
    history: MyPlanItem[];
  };
}

export interface RedeemCodeResponse {
  message: string;
  data: {
    pack: string | null;
    // true = ya asignado; false = se asigna al terminar el cuestionario inicial.
    started: boolean;
  };
}

export const subscriptionApi = {
  getMyPlan: () => apiClient.get<MyPlanResponse>('my-plan'),
  // Canjea un código de programa (Bckbs PackController::redeem). La app solo
  // pide el código: nada de precios ni enlaces de compra (Apple 3.1.1/3.1.3).
  redeemCode: (code: string) => apiClient.post<RedeemCodeResponse>('v1/pack-redeem', { code }),
};
