import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Configuración central de enlaces externos del menú de Ajustes ("Valora
// en la tienda", redes sociales). Pedido explícito: dejar los botones ya
// construidos y funcionando aunque la configuración real (ficha publicada
// en las tiendas, handles de redes sociales) todavía no exista -- cuando
// exista, solo hay que rellenar estas constantes, sin tocar ningún
// componente.
//
// Mientras un valor esté vacío/false, la acción que depende de él avisa
// que aún no está configurado en vez de abrir un enlace roto (deep link a
// una ficha de tienda que no existe, icono de red social sin URL real) --
// mismo criterio ya aplicado en toda la sesión (ver about_us_screen.tsx
// como ejemplo de lo contrario: placeholders sin terminar que sí llegaron
// a producción).
//
// "Solicitar una función" / "Informar de un error" NO usan este archivo --
// son un formulario real (MigratedAppFeedback, api/appFeedback.ts) que
// guarda en el backend, no un mailto.

// ID numérico de App Store (el de la URL pública de la ficha, no el
// bundle identifier de app.json) y si la ficha de Google Play ya está
// publicada. app.json todavía no define ios.appStoreId.
export const APP_STORE_ID = '';
export const PLAY_STORE_PUBLISHED = false;

// Política de privacidad -- URL pública real (2026-08-28), no texto embebido:
// se abre en MigratedWebView (mismo componente que Recursos, ya endurecido
// contra navegación fuera de origen, ver SEC-003 en SECURITY_AUDIT.md). Vive
// fuera de la app a propósito -- App Store Connect/Play Console piden esta
// URL en la ficha de la tienda de todos modos, y así el coach puede
// actualizar el texto legal sin depender de una nueva versión de la app.
// Dominio definitivo indicado por el usuario (bestronger.es) -- si en algún
// momento no responde, verificar primero si el cambio de dominio ya se
// completó antes de tocar este valor.
export const PRIVACY_POLICY_URL = 'https://bestronger.es/privacy-policy/';

export interface SocialLink {
  name: string;
  icon: IoniconName;
  url: string;
}

// Handles reales de redes sociales -- vacío a propósito: un icono que no
// lleva a ninguna URL real sería el mismo problema que about_us_screen.tsx.
// La fila de redes sociales en Ajustes no se muestra hasta que este array
// tenga al menos una entrada. Ejemplo de cómo rellenar una:
// { name: 'Instagram', icon: 'logo-instagram', url: 'https://instagram.com/befit' }
export const SOCIAL_LINKS: SocialLink[] = [];
